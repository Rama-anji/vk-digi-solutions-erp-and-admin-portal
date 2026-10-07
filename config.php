<?php
/**
 * ============================================================================
 * VK DIGI SOLUTIONS (VKD SOLUTIONS) - ERP & ADMIN PORTAL
 * Master Configuration File (config.php)
 * Target Environment: Hostinger Linux Shared Web Hosting (PHP 8.1 / 8.2 & MySQL 8 / MariaDB)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// SECTION 1: ERROR REPORTING & ENVIRONMENT SETTINGS
// ----------------------------------------------------------------------------
// Set to false in high-traffic live production on Hostinger to suppress raw error leaks
define('APP_DEBUG', true);

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/error_log.log');
}

// ----------------------------------------------------------------------------
// SECTION 2: BRAND IDENTITY & APPLICATION METADATA
// ----------------------------------------------------------------------------
define('APP_NAME', 'VK Digi Solutions');
define('APP_SHORT_NAME', 'VKD Solutions');
define('APP_TAGLINE', 'Enterprise Agency ERP & Admin Portal');
define('APP_VERSION', '2.4.0');
define('APP_URL', 'http://localhost/vkd_erp'); // Update with your Hostinger domain e.g., https://erp.vkdsolutions.com

// Brand Color Palette Definitions (Strict match to specs)
define('COLOR_PRIMARY_BLUE', '#004077');      // Sidebar background, table headers, brand primary
define('COLOR_NAVY_HOVER',   '#00355F');      // Sidebar active/hover states
define('COLOR_ACCENT_ORANGE','#EF7C00');      // CTA buttons, + New Client, active badges
define('COLOR_ORANGE_HOVER', '#D96F00');      // CTA hover state
define('COLOR_CANVAS_BG',    '#F8FAFC');      // Background canvas (slate-50)
define('COLOR_CARD_BORDER',  '#E5E7EB');      // Card borders (slate-200)

// Company Information for Invoices, Quotations & HR Letters
define('COMPANY_LEGAL_NAME', 'VK Digi Solutions Private Limited');
define('COMPANY_ADDRESS', '402-404, Corporate Cyber Tower, Infotech City, Mumbai - 400051');
define('COMPANY_PHONE', '+91 98200 12345 / 022 6789 4321');
define('COMPANY_EMAIL', 'contact@vkdsolutions.com');
define('COMPANY_BILLING_EMAIL', 'billing@vkdsolutions.com');
define('COMPANY_WEBSITE', 'https://vkdsolutions.com');
define('COMPANY_GSTIN', '27AABCU9603R1ZM');
define('COMPANY_PAN', 'AABCU9603R');

// ----------------------------------------------------------------------------
// SECTION 3: HOSTINGER DATABASE CREDENTIALS
// Update these values according to your Hostinger MySQL database details
// ----------------------------------------------------------------------------
define('DB_HOST', 'localhost');              // Hostinger standard is 'localhost'
define('DB_PORT', '3306');
define('DB_NAME', 'vkd_erp');                // e.g., u123456789_vkd_erp in Hostinger cPanel
define('DB_USER', 'root');                   // e.g., u123456789_admin in Hostinger cPanel
define('DB_PASS', '');                       // Your MySQL password
define('DB_CHARSET', 'utf8mb4');

// ----------------------------------------------------------------------------
// SECTION 4: SECURE SESSION INITIALIZATION
// ----------------------------------------------------------------------------
if (session_status() === PHP_SESSION_NONE) {
    // Session cookie parameters for security
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    session_set_cookie_params([
        'lifetime' => 86400 * 7, // 7 days
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// ----------------------------------------------------------------------------
// SECTION 5: DATABASE CONNECTION FACTORY (PDO)
// ----------------------------------------------------------------------------
/**
 * Returns a shared PDO instance with robust error handling and UTF-8 collation.
 *
 * @return PDO
 */
function getDBConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Render clean, professional error display for Hostinger users
            http_response_code(500);
            ?>
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Database Connection Error - <?php echo APP_NAME; ?></title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
                <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
                    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                        !
                    </div>
                    <h1 class="text-xl font-bold text-slate-800 mb-2">Database Connection Required</h1>
                    <p class="text-sm text-slate-600 mb-6">
                        Unable to connect to MySQL database <code class="bg-slate-100 px-2 py-1 rounded text-red-500"><?php echo htmlspecialchars(DB_NAME); ?></code>.
                    </p>
                    <div class="text-left bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-slate-700 space-y-2">
                        <p class="font-semibold text-slate-800">Quick Hostinger Setup Steps:</p>
                        <ol class="list-decimal pl-4 space-y-1">
                            <li>Open <strong>phpMyAdmin</strong> and import <code class="text-blue-600 font-bold">db.sql</code>.</li>
                            <li>Verify database name and user credentials in <code class="text-blue-600 font-bold">config.php</code>.</li>
                            <li>Ensure MySQL hostname is set to <code class="text-blue-600">localhost</code>.</li>
                        </ol>
                    </div>
                    <?php if (APP_DEBUG): ?>
                        <div class="text-left text-xs bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg overflow-x-auto mb-4">
                            <strong>PDO Error:</strong> <?php echo htmlspecialchars($e->getMessage()); ?>
                        </div>
                    <?php endif; ?>
                    <a href="?" class="inline-block w-full py-2.5 bg-[#004077] hover:bg-[#00355F] text-white font-medium rounded-xl transition">
                        Retry Connection
                    </a>
                </div>
            </body>
            </html>
            <?php
            exit;
        }
    }

    return $pdo;
}

// ----------------------------------------------------------------------------
// SECTION 6: AUTHENTICATION & ACCESS CONTROL HELPERS
// ----------------------------------------------------------------------------
/**
 * Check if the user is currently logged in.
 */
function isLoggedIn(): bool {
    return !empty($_SESSION['vkd_admin_id']) && !empty($_SESSION['vkd_admin_email']);
}

/**
 * Enforce authentication; redirect to login if session is invalid.
 */
function requireAuth(): void {
    if (!isLoggedIn()) {
        header('Location: ' . APP_URL . '/auth/login.php');
        exit;
    }
}

/**
 * Get the currently logged-in administrator payload.
 */
function getLoggedInUser(): array {
    return [
        'id'    => $_SESSION['vkd_admin_id'] ?? null,
        'name'  => $_SESSION['vkd_admin_name'] ?? 'Administrator',
        'email' => $_SESSION['vkd_admin_email'] ?? '',
        'role'  => $_SESSION['vkd_admin_role'] ?? 'Admin'
    ];
}

// ----------------------------------------------------------------------------
// SECTION 7: CSRF PROTECTION HELPERS
// ----------------------------------------------------------------------------
function generateCSRFToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCSRFToken(?string $token): bool {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

// ----------------------------------------------------------------------------
// SECTION 8: SANITIZATION, REDIRECTION & FLASH MESSAGES
// ----------------------------------------------------------------------------
function sanitize(string $data): string {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function redirect(string $url): void {
    header("Location: $url");
    exit;
}

function setFlash(string $type, string $message): void {
    $_SESSION['flash'] = [
        'type'    => $type, // 'success', 'danger', 'warning', 'info'
        'message' => $message
    ];
}

function getFlash(): ?array {
    if (isset($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return null;
}

// ----------------------------------------------------------------------------
// SECTION 9: BUSINESS ENGINE FORMULAS & HELPERS
// ----------------------------------------------------------------------------
/**
 * Format currency in standard Indian Rupee notation (₹ 1,50,000.00)
 */
function formatCurrency(float|int|string|null $amount): string {
    $val = (float)($amount ?? 0);
    return '₹ ' . number_format($val, 2, '.', ',');
}

/**
 * Calculate expiry date automatically based on start date and cycle:
 * Monthly (+1 month), Quarterly (+3 months), Half-Yearly (+6 months), Yearly (+1 year).
 */
function calculateExpiryDate(string $startDate, string $cycle): string {
    $date = new DateTime($startDate);
    match ($cycle) {
        'Monthly'     => $date->modify('+1 month'),
        'Quarterly'   => $date->modify('+3 months'),
        'Half-Yearly' => $date->modify('+6 months'),
        'Yearly'      => $date->modify('+1 year'),
        default       => $date->modify('+1 year')
    };
    return $date->format('Y-m-d');
}

/**
 * Check if a service expiry is within 15 days of today.
 */
function isExpiringSoon(string $expiryDate, int $thresholdDays = 15): bool {
    $today = new DateTime('today');
    $expiry = new DateTime($expiryDate);
    $diff = $today->diff($expiry);

    if ($diff->invert == 1) {
        return false; // Already expired
    }
    return $diff->days <= $thresholdDays;
}

/**
 * Get total count of services expiring soon (<= 15 days) across all clients.
 * Used for topbar notification counter and dashboard alert banner.
 */
function getExpiringServicesCount(PDO $pdo, int $thresholdDays = 15): int {
    try {
        $sql = "SELECT COUNT(*) AS total 
                FROM client_services_subscriptions 
                WHERE expiry_date >= CURDATE() 
                  AND DATEDIFF(expiry_date, CURDATE()) <= :threshold
                  AND status != 'Cancelled'";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':threshold', $thresholdDays, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch();
        return (int)($row['total'] ?? 0);
    } catch (Exception $e) {
        return 0;
    }
}

/**
 * Get active renewal alerts expiring within the threshold.
 */
function getExpiringServicesList(PDO $pdo, int $limit = 10, int $thresholdDays = 15): array {
    try {
        $sql = "SELECT sub.*, 
                       c.name AS client_name, 
                       c.contact_person, 
                       c.mobile,
                       c.email,
                       s.service_name,
                       s.category AS service_category,
                       DATEDIFF(sub.expiry_date, CURDATE()) AS days_remaining
                FROM client_services_subscriptions sub
                JOIN clients c ON sub.client_id = c.id
                JOIN services_catalog s ON sub.service_id = s.id
                WHERE sub.expiry_date >= CURDATE() 
                  AND DATEDIFF(sub.expiry_date, CURDATE()) <= :threshold
                  AND sub.status != 'Cancelled'
                ORDER BY sub.expiry_date ASC
                LIMIT :limit";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':threshold', $thresholdDays, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}

/**
 * Calculate Client Billing Balance:
 * Real-time formula: Total Invoiced - Total Paid = Outstanding Balance
 */
function getClientBillingBalance(PDO $pdo, int $clientId): array {
    try {
        $stmtInv = $pdo->prepare("SELECT COALESCE(SUM(grand_total), 0) AS total_invoiced FROM invoices WHERE client_id = ?");
        $stmtInv->execute([$clientId]);
        $totalInvoiced = (float)$stmtInv->fetchColumn();

        $stmtPay = $pdo->prepare("SELECT COALESCE(SUM(amount_received), 0) AS total_paid FROM payments_received WHERE client_id = ?");
        $stmtPay->execute([$clientId]);
        $totalPaid = (float)$stmtPay->fetchColumn();

        return [
            'total_invoiced'      => $totalInvoiced,
            'total_paid'          => $totalPaid,
            'outstanding_balance' => max(0, $totalInvoiced - $totalPaid)
        ];
    } catch (Exception $e) {
        return ['total_invoiced' => 0, 'total_paid' => 0, 'outstanding_balance' => 0];
    }
}

/**
 * Calculate Vendor Balance:
 * Real-time formula: Total Bill - Advance Paid = Pending Vendor Payment
 */
function getVendorBillingBalance(PDO $pdo, int $vendorId): array {
    try {
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) AS total_bills, COALESCE(SUM(advance_paid), 0) AS total_advance FROM vendor_bills WHERE vendor_id = ?");
        $stmt->execute([$vendorId]);
        $row = $stmt->fetch();
        $totalBills = (float)($row['total_bills'] ?? 0);
        $totalAdvance = (float)($row['total_advance'] ?? 0);

        return [
            'total_bills'     => $totalBills,
            'advance_paid'    => $totalAdvance,
            'pending_balance' => max(0, $totalBills - $totalAdvance)
        ];
    } catch (Exception $e) {
        return ['total_bills' => 0, 'advance_paid' => 0, 'pending_balance' => 0];
    }
}

/**
 * Audit Logger: Append record into `activity_logs`
 */
function logActivity(PDO $pdo, ?int $userId, string $action): void {
    try {
        $stmt = $pdo->prepare("INSERT INTO activity_logs (user_id, action, timestamp) VALUES (?, ?, NOW())");
        $stmt->execute([$userId, $action]);
    } catch (Exception $e) {
        // Silent catch so logging never interrupts primary workflow
    }
}
