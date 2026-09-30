<?php
// Get Interview History API
// AI Mock Interview Simulator - Review 2

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();

$sessionId = isset($_GET['session_id']) ? intval($_GET['session_id']) : 0;
$currentUser = getCurrentUser();

if ($sessionId > 0) {
    // Fetch single session with responses
    $sStmt = $pdo->prepare("SELECT * FROM interview_sessions WHERE id = :id");
    $sStmt->execute([':id' => $sessionId]);
    $session = $sStmt->fetch();

    if (!$session) {
        jsonResponse(['success' => false, 'message' => 'Session not found'], 404);
    }

    $rStmt = $pdo->prepare("SELECT * FROM interview_responses WHERE session_id = :sid ORDER BY id ASC");
    $rStmt->execute([':sid' => $sessionId]);
    $responses = $rStmt->fetchAll();

    jsonResponse([
        'success' => true,
        'session' => $session,
        'responses' => $responses
    ]);
}

// Fetch list of recent sessions
$limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 20;

if ($currentUser) {
    $stmt = $pdo->prepare("SELECT * FROM interview_sessions WHERE user_id = :uid ORDER BY created_at DESC LIMIT " . intval($limit));
    $stmt->execute([':uid' => $currentUser['id']]);
} else {
    // If guest, show recent sessions
    $stmt = $pdo->query("SELECT * FROM interview_sessions ORDER BY created_at DESC LIMIT " . intval($limit));
}

$sessions = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'count' => count($sessions),
    'sessions' => $sessions
]);
