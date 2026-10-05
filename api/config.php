<?php
// Database & Application Configuration
// AI Mock Interview Simulator - Review 2

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database Credentials (Supports Cloud Environment Variables or XAMPP Defaults)
define('DB_HOST', getenv('DB_HOST') ? getenv('DB_HOST') : 'localhost');
define('DB_PORT', getenv('DB_PORT') ? getenv('DB_PORT') : '3306');
define('DB_NAME', getenv('DB_NAME') ? getenv('DB_NAME') : 'interview_simulator');
define('DB_USER', getenv('DB_USER') ? getenv('DB_USER') : 'root');
define('DB_PASS', getenv('DB_PASS') !== false && getenv('DB_PASS') !== null ? getenv('DB_PASS') : '');

// Google Gemini API Configuration (Loaded securely from env or local config)
$localKey = file_exists(__DIR__ . '/config.local.php') ? include __DIR__ . '/config.local.php' : '';
define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ? getenv('GEMINI_API_KEY') : $localKey);
define('GEMINI_MODEL', getenv('GEMINI_MODEL') ? getenv('GEMINI_MODEL') : 'gemini-2.5-flash');
define('GEMINI_FALLBACK_MODELS', json_encode(['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest']));

// Helper function to return JSON response
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

// Helper function to get current logged in user
function getCurrentUser() {
    return isset($_SESSION['user']) ? $_SESSION['user'] : null;
}
