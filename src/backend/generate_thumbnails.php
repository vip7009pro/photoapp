<?php
$pdo = new PDO('mysql:host=localhost;dbname=photo_app', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$stmt = $pdo->query('SELECT id, file_path FROM photos WHERE thumbnail_path IS NULL');
$photos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$thumbnailDir = 'thumbnails/';
if (!file_exists($thumbnailDir)) {
    mkdir($thumbnailDir, 0777, true);
}

foreach ($photos as $photo) {
    $filePath = $photo['file_path'];
    $thumbnailPath = $thumbnailDir . 'thumb_' . basename($filePath);
    $thumbSize = 200;

    $imageInfo = getimagesize($filePath);
    $imageType = $imageInfo[2];
    $source = $imageType == IMAGETYPE_JPEG ? imagecreatefromjpeg($filePath) : imagecreatefrompng($filePath);
    $width = imagesx($source);
    $height = imagesy($source);
    $thumb = imagecreatetruecolor($thumbSize, $thumbSize * ($height / $width));

    if ($imageType == IMAGETYPE_PNG) {
        $bg = imagecolorallocate($thumb, 255, 255, 255);
        imagefill($thumb, 0, 0, $bg);
    }

    imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumbSize, $thumbSize * ($height / $width), $width, $height);
    $imageType == IMAGETYPE_JPEG ? imagejpeg($thumb, $thumbnailPath, 75) : imagepng($thumb, $thumbnailPath, 6);

    $stmt = $pdo->prepare('UPDATE photos SET thumbnail_path = ? WHERE id = ?');
    $stmt->execute([$thumbnailPath, $photo['id']]);

    imagedestroy($source);
    imagedestroy($thumb);
}
echo "Tạo thumbnail thành công!";
?>