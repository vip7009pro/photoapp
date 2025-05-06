<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    // Kiểm tra đăng nhập
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập để tải ảnh']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $pdo = new PDO('mysql:host=localhost;dbname=photo_app', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Không có ảnh được tải lên hoặc lỗi tải lên']);
        exit;
    }

    // Tạo thư mục riêng cho người dùng
    $uploadDir = "photos/user_$user_id/";
    $thumbnailDir = "thumbnails/user_$user_id/";
    
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    if (!file_exists($thumbnailDir)) {
        mkdir($thumbnailDir, 0777, true);
    }

    $file = $_FILES['photo'];
    $fileName = time() . '_' . basename($file['name']);
    $filePath = $uploadDir . $fileName;
    $thumbnailPath = $thumbnailDir . 'thumb_' . $fileName;

    // Di chuyển file gốc
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        echo json_encode(['success' => false, 'message' => 'Lỗi khi lưu ảnh']);
        exit;
    }

    // Tạo thumbnail
    $imageInfo = getimagesize($filePath);
    $imageType = $imageInfo[2];
    
    switch ($imageType) {
        case IMAGETYPE_JPEG:
            $source = imagecreatefromjpeg($filePath);
            break;
        case IMAGETYPE_PNG:
            $source = imagecreatefrompng($filePath);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Định dạng ảnh không hỗ trợ']);
            exit;
    }

    $width = imagesx($source);
    $height = imagesy($source);
    $thumbSize = 500; // Kích thước thumbnail
    $thumb = imagecreatetruecolor($thumbSize, $thumbSize * ($height / $width));

    if ($imageType == IMAGETYPE_PNG) {
        $bg = imagecolorallocate($thumb, 255, 255, 255);
        imagefill($thumb, 0, 0, $bg);
    }

    imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumbSize, $thumbSize * ($height / $width), $width, $height);

    switch ($imageType) {
        case IMAGETYPE_JPEG:
            imagejpeg($thumb, $thumbnailPath, 85);
            break;
        case IMAGETYPE_PNG:
            imagepng($thumb, $thumbnailPath, 6);
            break;
    }

    imagedestroy($source);
    imagedestroy($thumb);

    // Lưu vào database
    $stmt = $pdo->prepare('INSERT INTO photos (file_name, file_path, thumbnail_path, uploaded_at, user_id) VALUES (?, ?, ?, NOW(), ?)');
    $stmt->execute([$file['name'], $filePath, $thumbnailPath, $user_id]);

    echo json_encode(['success' => true, 'message' => 'Tải ảnh thành công']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()]);
}
?>