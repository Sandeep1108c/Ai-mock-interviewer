<?php
// Save Interview Session & Responses API
// AI Mock Interview Simulator - Review 2

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    jsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
}

$currentUser = getCurrentUser();
$userId = $currentUser ? $currentUser['id'] : (isset($data['user_id']) ? $data['user_id'] : null);
$candidateName = trim(isset($data['candidateName']) ? $data['candidateName'] : ($currentUser ? $currentUser['full_name'] : 'Guest Candidate'));
$category = isset($data['category']) ? $data['category'] : 'Mixed';
$difficulty = isset($data['difficulty']) ? $data['difficulty'] : 'Mixed';
$totalQuestions = isset($data['totalQuestions']) ? intval($data['totalQuestions']) : 0;
$startTime = isset($data['startTime']) ? date('Y-m-d H:i:s', strtotime($data['startTime'])) : date('Y-m-d H:i:s');
$endTime = isset($data['endTime']) ? date('Y-m-d H:i:s', strtotime($data['endTime'])) : date('Y-m-d H:i:s');
$answers = isset($data['answers']) ? $data['answers'] : [];

$answeredCount = 0;
$skippedCount = 0;
$totalSelfRating = 0;
$ratedSelfCount = 0;
$totalAiScore = 0;
$aiRatedCount = 0;

foreach ($answers as $ans) {
    if (!empty($ans['skipped'])) {
        $skippedCount++;
    } else {
        $answeredCount++;
    }
    if (!empty($ans['rating']) && $ans['rating'] > 0) {
        $totalSelfRating += $ans['rating'];
        $ratedSelfCount++;
    }
    if (isset($ans['aiScore']) && $ans['aiScore'] !== null) {
        $totalAiScore += floatval($ans['aiScore']);
        $aiRatedCount++;
    }
}

$avgSelfRating = $ratedSelfCount > 0 ? round($totalSelfRating / $ratedSelfCount, 1) : null;
$avgAiScore = $aiRatedCount > 0 ? round($totalAiScore / $aiRatedCount, 1) : null;

try {
    $pdo->beginTransaction();

    // 1. Insert session
    $sessionStmt = $pdo->prepare("INSERT INTO interview_sessions 
        (user_id, candidate_name, category, difficulty, total_questions, answered_count, skipped_count, avg_self_rating, avg_ai_score, start_time, end_time) 
        VALUES 
        (:user_id, :candidate_name, :category, :difficulty, :total_questions, :answered_count, :skipped_count, :avg_self_rating, :avg_ai_score, :start_time, :end_time)");

    $sessionStmt->execute([
        ':user_id' => $userId,
        ':candidate_name' => $candidateName,
        ':category' => $category,
        ':difficulty' => $difficulty,
        ':total_questions' => $totalQuestions,
        ':answered_count' => $answeredCount,
        ':skipped_count' => $skippedCount,
        ':avg_self_rating' => $avgSelfRating,
        ':avg_ai_score' => $avgAiScore,
        ':start_time' => $startTime,
        ':end_time' => $endTime
    ]);

    $sessionId = $pdo->lastInsertId();

    // 2. Insert responses
    $respStmt = $pdo->prepare("INSERT INTO interview_responses 
        (session_id, question_id, question_text, category, difficulty, user_answer, self_rating, skipped, time_spent, ai_score, ai_label, ai_feedback, ai_strengths, ai_improvements) 
        VALUES 
        (:session_id, :question_id, :question_text, :category, :difficulty, :user_answer, :self_rating, :skipped, :time_spent, :ai_score, :ai_label, :ai_feedback, :ai_strengths, :ai_improvements)");

    foreach ($answers as $ans) {
        $respStmt->execute([
            ':session_id' => $sessionId,
            ':question_id' => isset($ans['questionId']) ? $ans['questionId'] : null,
            ':question_text' => isset($ans['question']) ? $ans['question'] : '',
            ':category' => isset($ans['category']) ? $ans['category'] : 'General',
            ':difficulty' => isset($ans['difficulty']) ? $ans['difficulty'] : 'medium',
            ':user_answer' => isset($ans['answer']) ? $ans['answer'] : '',
            ':self_rating' => isset($ans['rating']) ? intval($ans['rating']) : 0,
            ':skipped' => !empty($ans['skipped']) ? 1 : 0,
            ':time_spent' => isset($ans['timeSpent']) ? intval($ans['timeSpent']) : 0,
            ':ai_score' => isset($ans['aiScore']) ? floatval($ans['aiScore']) : null,
            ':ai_label' => isset($ans['aiLabel']) ? $ans['aiLabel'] : null,
            ':ai_feedback' => isset($ans['aiFeedback']) ? $ans['aiFeedback'] : null,
            ':ai_strengths' => isset($ans['aiStrengths']) ? $ans['aiStrengths'] : null,
            ':ai_improvements' => isset($ans['aiImprovements']) ? $ans['aiImprovements'] : null,
        ]);
    }

    $pdo->commit();

    jsonResponse([
        'success' => true,
        'session_id' => $sessionId,
        'avg_self_rating' => $avgSelfRating,
        'avg_ai_score' => $avgAiScore,
        'message' => 'Interview session and responses saved successfully to database.'
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse([
        'success' => false,
        'message' => 'Failed to save interview session: ' . $e->getMessage()
    ], 500);
}
