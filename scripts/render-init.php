<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/bootstrap.php';

$attempts = 0;
while (true) {
    try {
        $pdo = db();
        break;
    } catch (Throwable $error) {
        if (++$attempts >= 60) {
            fwrite(STDERR, "Database did not become available during startup.\n");
            exit(1);
        }
        sleep(2);
    }
}

$tableExists = (int)query(
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='admins'"
)->fetchColumn() > 0;

if (!$tableExists || (int)query('SELECT COUNT(*) FROM admins')->fetchColumn() === 0) {
    $sql = file_get_contents(__DIR__ . '/../db.sql');
    if ($sql === false) {
        throw new RuntimeException('Database schema file is missing.');
    }
    $sql = preg_replace('/^--.*$/m', '', $sql);
    $sql = preg_replace('/^\s*CREATE DATABASE.*?;\s*USE.*?;\s*/si', '', $sql, 1);
    $sql = preg_replace('/CREATE TABLE (?!IF NOT EXISTS)/i', 'CREATE TABLE IF NOT EXISTS ', $sql);
    foreach (preg_split('/;\s*(?:\r?\n|$)/', trim($sql)) as $statement) {
        if (trim($statement) !== '') {
            if (preg_match('/^CREATE SQL SECURITY INVOKER VIEW (\w+)/i', trim($statement), $match)
                && (int)query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?', [$match[1]])->fetchColumn() > 0) {
                continue;
            }
            $pdo->exec(trim($statement));
        }
    }
    echo "Created the application database schema.\n";
}

$admins = (int)query('SELECT COUNT(*) FROM admins')->fetchColumn();
if ($admins === 0) {
    $password = getenv('INITIAL_ADMIN_PASSWORD') ?: '';
    if (strlen($password) < 16) {
        throw new RuntimeException('INITIAL_ADMIN_PASSWORD must be set to a strong password.');
    }
    $email = getenv('INITIAL_ADMIN_EMAIL') ?: 'admin@vkdsolutions.com';
    query(
        "INSERT INTO admins(name,email,password,role) VALUES ('VKD Master Admin',? ,?,'Super Admin')",
        [$email, password_hash($password, PASSWORD_DEFAULT)]
    );
    $company = [
        'legal_name' => 'VK Digi Solutions Private Limited', 'display_name' => 'VK Digi Solutions',
        'address' => '', 'email' => '', 'phone' => '', 'gstin' => '', 'bank_name' => '',
        'account_number' => '', 'ifsc' => '', 'default_terms' => '',
    ];
    query('INSERT INTO integration_settings(provider,config) VALUES (?,?)', ['company', json_encode($company, JSON_THROW_ON_ERROR)]);
    query('INSERT INTO integration_settings(provider,config) VALUES (?,?)', ['whatsapp', json_encode([
        'waba_id' => '', 'phone_number_id' => '', 'business_phone_number' => '',
        'default_country_code' => '91', 'auto_greeting_enabled' => false,
        'webhook_status' => 'Disconnected', 'graph_version' => 'v25.0', 'templates' => [],
    ], JSON_THROW_ON_ERROR)]);
    echo "Created the first administrator: $email. Read INITIAL_ADMIN_PASSWORD from the Render service environment.\n";
} else {
    echo "Existing administrator account found; no login credentials were changed.\n";
}
