<?php
// Dynamic Question Bank API
// AI Mock Interview Simulator - Review 2

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();

$category = isset($_GET['category']) ? strtolower(trim($_GET['category'])) : 'all';
$difficulty = isset($_GET['difficulty']) ? strtolower(trim($_GET['difficulty'])) : 'all';
$batch = isset($_GET['batch']) ? intval($_GET['batch']) : (isset($_GET['set']) ? intval($_GET['set']) : 0);
$limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 30;
$offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;
$order = isset($_GET['order']) ? strtolower(trim($_GET['order'])) : '';

// If batch is specified (e.g., 1 for first 30, 2 for next 30, etc.)
if ($batch > 0) {
    $batchSize = 30;
    $limit = $batchSize;
    $offset = ($batch - 1) * $batchSize;
    if (empty($order)) {
        $order = 'sequential';
    }
}

$whereClauses = [];
$params = [];

// Filter by category
if ($category !== 'all') {
    $whereClauses[] = "LOWER(category) = :category";
    $params[':category'] = $category;
}

// Filter by difficulty
if ($difficulty !== 'all') {
    $whereClauses[] = "difficulty = :difficulty";
    $params[':difficulty'] = $difficulty;
}

$whereSQL = '';
if (!empty($whereClauses)) {
    $whereSQL = 'WHERE ' . implode(' AND ', $whereClauses);
}

try {
    // Get total matching count
    $countSql = "SELECT COUNT(*) AS total FROM questions $whereSQL";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalCount = intval($countStmt->fetch()['total']);

    // Determine ordering
    $orderSQL = ($order === 'random') ? 'ORDER BY RAND()' : 'ORDER BY id ASC';

    // Fetch questions
    $sql = "SELECT id, category, difficulty, question, model_answer AS modelAnswer, tips 
            FROM questions 
            $whereSQL 
            $orderSQL 
            LIMIT " . intval($limit) . " OFFSET " . intval($offset);

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $questions = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($questions),
        'total_available' => $totalCount,
        'batch' => $batch > 0 ? $batch : null,
        'total_batches' => $totalCount > 0 ? ceil($totalCount / 30) : 1,
        'limit' => $limit,
        'offset' => $offset,
        'questions' => $questions
    ]);
} catch (PDOException $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Error fetching questions: ' . $e->getMessage()
    ], 500);
}
