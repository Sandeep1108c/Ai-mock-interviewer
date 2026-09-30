<?php
// Dynamic Question Bank API
// AI Mock Interview Simulator - Review 2

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();

$category = isset($_GET['category']) ? strtolower(trim($_GET['category'])) : 'all';
$difficulty = isset($_GET['difficulty']) ? strtolower(trim($_GET['difficulty'])) : 'all';
$limit = isset($_GET['limit']) ? max(1, min(20, intval($_GET['limit']))) : 5;

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

// Order randomly and limit
$sql = "SELECT id, category, difficulty, question, model_answer AS modelAnswer, tips 
        FROM questions 
        $whereSQL 
        ORDER BY RAND() 
        LIMIT " . intval($limit);

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $questions = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($questions),
        'questions' => $questions
    ]);
} catch (PDOException $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Error fetching questions: ' . $e->getMessage()
    ], 500);
}
