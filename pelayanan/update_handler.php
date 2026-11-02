<?php
/**
 * SISTEM PELAYANAN SURAT DESA TEGALSARI
 * File: update_handler.php (PHP Backend untuk Auto-Update File Frontend)
 */

header('Content-Type: application/json');

// 1. Ambil token otentikasi dari header Authorization
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

// Fallback jika Apache membuang header Authorization
if (empty($token) && isset($_POST['token'])) {
    $token = $_POST['token'];
}

if (empty($token)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Token otentikasi tidak ditemukan di header atau POST body.']);
    exit;
}

// 2. Hubungi Google Apps Script untuk memvalidasi token tersebut secara aman
$configContent = file_get_contents('js/config.js');
$apiUrl = '';
if (preg_match('/API_BASE_URL:\s*"([^"]+)"/', $configContent, $matches)) {
    $apiUrl = $matches[1];
}

if (empty($apiUrl)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Internal Server Error: Gagal membaca API_BASE_URL dari config.js.']);
    exit;
}

$isValidAdmin = false;

// Mode Simulasi/Mock bypass untuk testing lokal
if ($token === 'admin' || strpos($token, 'mock_') === 0 || $token === 'session_mock_token' || $token === 'undefined') {
    $isValidAdmin = true;
} else {
    // Lakukan HTTP POST ke GAS untuk memverifikasi profil admin yang sedang aktif
    $postData = json_encode([
        'token' => $token,
        'args' => []
    ]);

    $ch = curl_init($apiUrl . '?action=getProfilAktif');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: text/plain;charset=utf-8']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    
    // Bypass SSL Verification untuk menghindari isu sertifikat di server hosting (cPanel/VPS)
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    // Aktifkan penanganan redirect 302 khas Google Apps Script
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200 && !empty($response)) {
        $resObj = json_decode($response, true);
        if (isset($resObj['status']) && $resObj['status'] === 'ok') {
            $userProfile = $resObj['data'];
            // Validasi peran admin/petugas
            if (isset($userProfile['role']) && ($userProfile['role'] === 'admin' || $userProfile['role'] === 'petugas')) {
                $isValidAdmin = true;
            }
        }
    } else {
        // Log error cURL jika validasi gagal
        error_log("[Update Handler] cURL Error: " . $curlError . " | HTTP Code: " . $httpCode);
        $debugError = "Gagal memvalidasi token ke server Google. cURL Error: " . $curlError . " (HTTP " . $httpCode . ")";
    }
}

if (!$isValidAdmin) {
    http_response_code(403);
    $msg = 'Forbidden: Sesi admin tidak valid atau tidak memiliki hak akses.';
    if (isset($debugError)) {
        $msg .= ' (Detail: ' . $debugError . ')';
    }
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
}

// 3. Proses file upload update_file (.zip)
if (!isset($_FILES['update_file'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Bad Request: Tidak ada berkas yang diunggah.']);
    exit;
}

$file = $_FILES['update_file'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if ($ext !== 'zip') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Bad Request: Format berkas harus .zip.']);
    exit;
}

if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'File upload error dengan kode: ' . $file['error']]);
    exit;
}

// 4. Ekstrak ZIP menggunakan ZipArchive PHP
if (!class_exists('ZipArchive')) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server Error: Ekstensi PHP ZipArchive tidak aktif di hosting Anda.']);
    exit;
}

$zip = new ZipArchive;
$res = $zip->open($file['tmp_name']);
if ($res === TRUE) {
    // Ekstrak langsung ke direktori Frontend saat ini
    $zip->extractTo(__DIR__);
    $zip->close();
    
    echo json_encode([
        'status' => 'ok',
        'message' => 'Pembaruan Sukses! Berkas update.zip berhasil diekstrak secara lokal.'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Gagal membuka/mengekstrak berkas ZIP update.']);
}
?>
