<?php
/**
 * ============================================================================
 * VK DIGI SOLUTIONS (VKD SOLUTIONS) - ERP & ADMIN PORTAL
 * Authentication Module: Admin Logout (auth/logout.php)
 * ============================================================================
 */

require_once __DIR__ . '/../config.php';

if (isLoggedIn()) {
    try {
        $pdo = getDBConnection();
        $adminId = $_SESSION['vkd_admin_id'] ?? null;
        if ($adminId) {
            logActivity($pdo, (int)$adminId, 'Admin user logged out successfully.');
        }
    } catch (Exception $e) {
        // Silently continue
    }
}

// Unset all session keys
$_SESSION = [];

// Destroy session cookie if present
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

// Destroy session
session_destroy();

// Redirect to login screen
redirect(APP_URL . '/auth/login.php');
