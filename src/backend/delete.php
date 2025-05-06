<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $pdo = new PDO('mysql:host=localhost;dbname=photo_app', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['ids']) || !is_array($data['ids']) || empty($data['ids'])) {
        echo json_encode(['success' => false, 'message' => 'Không có ảnh nào được chọn để xóa']);
        exit;
    }

    $ids = array_map('intval', $data['ids']);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    // Lấy file paths để xóa, chỉ lấy ảnh của user hiện tại
    $stmt = $pdo->prepare("SELECT file_path, thumbnail_path FROM photos WHERE id IN ($placeholders) AND user_id = ?");
    $stmt->execute(array_merge($ids, [$user_id]));
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Xóa files
    foreach ($files as $file) {
        if (file_exists($file['file_path'])) {
            unlink($file['file_path']);
        }
        if (file_exists($file['thumbnail_path'])) {
            unlink($file['thumbnail_path']);
        }
    }

    // Xóa bản ghi database
    $stmt = $pdo->prepare("DELETE FROM photos WHERE id IN ($placeholders) AND user_id = ?");
    $stmt->execute(array_merge($ids, [$user_id]));

    echo json_encode(['success' => true, 'message' => 'Xóa ảnh thành công']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()]);
}
?>