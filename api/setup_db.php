<?php
// Database Setup & Migration Script
// AI Mock Interview Simulator - Review 2

require_once __DIR__ . '/config.php';

    // Connect to database (supports both pre-created shared host databases and local auto-creation)
    $port = defined('DB_PORT') ? DB_PORT : 3306;
    $pdo = null;
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";port=" . $port . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
    } catch (PDOException $e) {
        // Fallback for local development where DB doesn't exist yet
        $rootPdo = new PDO("mysql:host=" . DB_HOST . ";port=" . $port . ";charset=utf8mb4", DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo = new PDO("mysql:host=" . DB_HOST . ";port=" . $port . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
    }

    // 3. Create tables

    // Table 1: users
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `username` VARCHAR(50) NOT NULL UNIQUE,
        `email` VARCHAR(100) NOT NULL UNIQUE,
        `password_hash` VARCHAR(255) NOT NULL,
        `full_name` VARCHAR(100) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Table 2: questions
    $pdo->exec("CREATE TABLE IF NOT EXISTS `questions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `category` VARCHAR(50) NOT NULL,
        `difficulty` ENUM('easy', 'medium', 'hard') NOT NULL,
        `question` TEXT NOT NULL,
        `model_answer` TEXT NOT NULL,
        `tips` TEXT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Table 3: interview_sessions
    $pdo->exec("CREATE TABLE IF NOT EXISTS `interview_sessions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NULL,
        `candidate_name` VARCHAR(100) NOT NULL,
        `category` VARCHAR(50) NOT NULL,
        `difficulty` VARCHAR(50) NOT NULL,
        `total_questions` INT NOT NULL,
        `answered_count` INT DEFAULT 0,
        `skipped_count` INT DEFAULT 0,
        `avg_self_rating` DECIMAL(3, 1) NULL,
        `avg_ai_score` DECIMAL(4, 1) NULL,
        `start_time` DATETIME NULL,
        `end_time` DATETIME NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Table 4: interview_responses
    $pdo->exec("CREATE TABLE IF NOT EXISTS `interview_responses` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `session_id` INT NOT NULL,
        `question_id` INT NULL,
        `question_text` TEXT NOT NULL,
        `category` VARCHAR(50) NOT NULL,
        `difficulty` VARCHAR(50) NOT NULL,
        `user_answer` TEXT NULL,
        `self_rating` INT DEFAULT 0,
        `skipped` TINYINT(1) DEFAULT 0,
        `time_spent` INT DEFAULT 0,
        `ai_score` DECIMAL(3, 1) NULL,
        `ai_label` VARCHAR(50) NULL,
        `ai_feedback` TEXT NULL,
        `ai_strengths` TEXT NULL,
        `ai_improvements` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 4. Seed questions if table is empty
    $countStmt = $pdo->query("SELECT COUNT(*) FROM `questions`");
    $existingQuestions = $countStmt->fetchColumn();

    $seededQuestions = 0;
    if ($existingQuestions == 0) {
        $jsonPath = dirname(__DIR__) . '/js/questions.json';
        if (file_exists($jsonPath)) {
            $questionBank = json_decode(file_get_contents($jsonPath), true);
            $insertStmt = $pdo->prepare("INSERT INTO `questions` (`category`, `difficulty`, `question`, `model_answer`, `tips`) VALUES (:category, :difficulty, :question, :model_answer, :tips)");

            foreach (['hr' => 'HR', 'technical' => 'Technical', 'behavioral' => 'Behavioral'] as $key => $catName) {
                if (isset($questionBank[$key]) && is_array($questionBank[$key])) {
                    foreach ($questionBank[$key] as $q) {
                        $insertStmt->execute([
                            ':category'     => $catName,
                            ':difficulty'   => $q['difficulty'],
                            ':question'     => $q['question'],
                            ':model_answer' => $q['modelAnswer'],
                            ':tips'         => $q['tips']
                        ]);
                        $seededQuestions++;
                    }
                }
            }
        }
    }

    // 5. Seed default demo user if not exists
    $userStmt = $pdo->prepare("SELECT COUNT(*) FROM `users` WHERE `username` = 'demo'");
    $userStmt->execute();
    $demoExists = $userStmt->fetchColumn();

    if ($demoExists == 0) {
        $demoPassHash = password_hash('demo123', PASSWORD_DEFAULT);
        $insertUser = $pdo->prepare("INSERT INTO `users` (`username`, `email`, `password_hash`, `full_name`) VALUES ('demo', 'demo@example.com', :pwd, 'Demo Candidate')");
        $insertUser->execute([':pwd' => $demoPassHash]);
    }

    $isCli = (php_sapi_name() === 'cli');
    $msg = "Database setup complete!\n" .
           "- Database: " . DB_NAME . "\n" .
           "- Tables created: users, questions, interview_sessions, interview_responses\n" .
           "- Questions seeded: " . ($existingQuestions > 0 ? "Already existed ($existingQuestions)" : "$seededQuestions questions imported") . "\n" .
           "- Demo user: username='demo', password='demo123'\n";

    if ($isCli) {
        echo $msg;
    } else {
        echo "<pre style='font-family:monospace; background:#111; color:#0f0; padding:20px; border-radius:8px;'>$msg</pre>";
        echo "<p><a href='../setup.html'>Return to Practice</a></p>";
    }

} catch (Exception $e) {
    if (php_sapi_name() === 'cli') {
        echo "SETUP ERROR: " . $e->getMessage() . "\n";
    } else {
        echo "<pre style='color:red;'>SETUP ERROR: " . htmlspecialchars($e->getMessage()) . "</pre>";
    }
}
