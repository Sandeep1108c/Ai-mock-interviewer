<?php
// User Authentication API
// AI Mock Interview Simulator - Review 2

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$pdo = getDBConnection();
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 1. Get current logged in user
if ($action === 'me') {
    $user = getCurrentUser();
    if ($user) {
        jsonResponse([
            'authenticated' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name']
            ]
        ]);
    } else {
        jsonResponse(['authenticated' => false]);
    }
}

// 2. Logout
if ($action === 'logout') {
    unset($_SESSION['user']);
    session_destroy();
    jsonResponse(['success' => true, 'message' => 'Logged out successfully']);
}

// Ensure POST request for login and register
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method'], 405);
}

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

// 3. User Registration
if ($action === 'register') {
    $username = trim(isset($input['username']) ? $input['username'] : '');
    $email = trim(isset($input['email']) ? $input['email'] : '');
    $password = isset($input['password']) ? $input['password'] : '';
    $fullName = trim(isset($input['full_name']) ? $input['full_name'] : '');

    if (empty($username) || empty($email) || empty($password) || empty($fullName)) {
        jsonResponse(['success' => false, 'message' => 'All fields are required.'], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'message' => 'Please enter a valid email address.'], 400);
    }

    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters.'], 400);
    }

    // Check if username or email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1");
    $stmt->execute([':u' => $username, ':e' => $email]);
    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Username or email already in use.'], 409);
    }

    // Hash password and insert
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $insertStmt = $pdo->prepare("INSERT INTO users (username, email, password_hash, full_name) VALUES (:u, :e, :p, :fn)");
    $insertStmt->execute([
        ':u' => $username,
        ':e' => $email,
        ':p' => $passwordHash,
        ':fn' => $fullName
    ]);

    $userId = $pdo->lastInsertId();
    $_SESSION['user'] = [
        'id' => $userId,
        'username' => $username,
        'email' => $email,
        'full_name' => $fullName
    ];

    jsonResponse([
        'success' => true,
        'message' => 'Account created successfully!',
        'user' => $_SESSION['user']
    ]);
}

// 4. User Login
if ($action === 'login') {
    $username = trim(isset($input['username']) ? $input['username'] : '');
    $password = isset($input['password']) ? $input['password'] : '';

    if (empty($username) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Username and password are required.'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :u OR email = :e LIMIT 1");
    $stmt->execute([':u' => $username, ':e' => $username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonResponse(['success' => false, 'message' => 'Invalid username or password.'], 401);
    }

    $_SESSION['user'] = [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'full_name' => $user['full_name']
    ];

    jsonResponse([
        'success' => true,
        'message' => 'Login successful!',
        'user' => $_SESSION['user']
    ]);
}

jsonResponse(['success' => false, 'message' => 'Unknown action'], 400);
