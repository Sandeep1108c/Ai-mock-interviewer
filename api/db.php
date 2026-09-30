<?php
// Database Connection (PDO)
require_once __DIR__ . '/config.php';

function getDBConnection() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Check if error is database not found
            if ($e->getCode() == 1049) {
                // Return null to allow setup script to create database
                return null;
            }
            jsonResponse([
                'success' => false,
                'message' => 'Database connection error: ' . $e->getMessage()
            ], 500);
        }
    }

    return $pdo;
}
