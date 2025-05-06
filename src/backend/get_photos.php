<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $pdo = new PDO('mysql:host=localhost;dbname=photo_app', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare('SELECT id, file_name, file_path, thumbnail_path, uploaded_at FROM photos WHERE user_id = ? ORDER BY uploaded_at DESC');
    $stmt->execute([$user_id]);
    $photos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($photos);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>