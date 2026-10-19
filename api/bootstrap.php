<?php
declare(strict_types=1);
ini_set('display_errors', '0');
date_default_timezone_set('Asia/Kolkata');
function config(): array {
    static $config;
    if ($config !== null) return $config;
    $localConfig = __DIR__ . '/config.local.php';
    $config = is_file($localConfig) ? require $localConfig : [];
    $config['host'] = getenv('DB_HOST') ?: ($config['host'] ?? '127.0.0.1');
    $config['port'] = (int)(getenv('DB_PORT') ?: ($config['port'] ?? 3306));
    $config['database'] = getenv('DB_NAME') ?: ($config['database'] ?? '');
    $config['user'] = getenv('DB_USER') ?: ($config['user'] ?? '');
    $config['password'] = getenv('DB_PASSWORD') ?: ($config['password'] ?? '');
    $config['key'] = getenv('APP_KEY') ?: ($config['key'] ?? '');
    if (!$config['database'] || !$config['user'] || !$config['key']) {
        throw new RuntimeException('The application database and encryption key are not configured.', 503);
    }
    return $config;
}
function db(): PDO {
    static $db;
    if (!$db) {
        $c=config();
        $options = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false];
        $caPem = getenv('DB_SSL_CA_PEM') ?: '';
        $caPath = getenv('DB_SSL_CA') ?: '';
        if ($caPem !== '') {
            $caPath = tempnam(sys_get_temp_dir(), 'vkd-ca-');
            if ($caPath === false || file_put_contents($caPath, $caPem) === false) {
                throw new RuntimeException('Unable to prepare database CA certificate.');
            }
            register_shutdown_function(static function () use ($caPath): void { @unlink($caPath); });
        }
        if ($caPath !== '') {
            $options[PDO::MYSQL_ATTR_SSL_CA] = $caPath;
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }
        $db=new PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['database']};charset=utf8mb4",$c['user'],$c['password'],$options);
        $db->exec("SET SESSION time_zone='+05:30', sql_mode='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    }
    return $db;
}
function query(string $sql,array $params=[]): PDOStatement { $s=db()->prepare($sql); $s->execute($params); return $s; }
function fail(string $message,int $status=422): never { throw new RuntimeException($message,$status); }
function rows(string $sql,array $params=[]): array { return query($sql,$params)->fetchAll(); }
function row(string $sql,array $params=[]): array { return query($sql,$params)->fetch() ?: []; }
function json_value(mixed $value): mixed { return is_string($value) ? json_decode($value,true,512,JSON_THROW_ON_ERROR) : $value; }
function encrypt_secret(array $data): string {
    $iv=random_bytes(12); $tag='';
    $cipher=openssl_encrypt(json_encode($data,JSON_THROW_ON_ERROR),'aes-256-gcm',base64_decode(config()['key']),OPENSSL_RAW_DATA,$iv,$tag);
    if ($cipher===false) fail('Unable to encrypt settings.',500);
    return base64_encode($iv.$tag.$cipher);
}
function decrypt_secret(?string $value): array {
    if (!$value) return [];
    $raw=base64_decode($value,true);
    if ($raw===false || strlen($raw)<28) fail('Invalid encrypted settings.',500);
    $text=openssl_decrypt(substr($raw,28),'aes-256-gcm',base64_decode(config()['key']),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16));
    if ($text===false) fail('Unable to decrypt settings. Restore the original application key.',500);
    return json_decode($text,true,512,JSON_THROW_ON_ERROR);
}
function integration(string $provider,bool $secrets=false): array {
    $r=row('SELECT * FROM integration_settings WHERE provider=?',[$provider]);
    $data=$r ? json_value($r['config']) : [];
    if ($secrets) return array_merge($data,decrypt_secret($r['encrypted_secrets']??null));
    foreach (decrypt_secret($r['encrypted_secrets']??null) as $key=>$value) $data[$key.'_configured']=!empty($value);
    return $data;
}
function session_start_safe(): void {
    if (session_status()===PHP_SESSION_ACTIVE) return;
    if (!is_dir(__DIR__.'/../.storage/sessions')) mkdir(__DIR__.'/../.storage/sessions',0700,true);
    ini_set('session.gc_maxlifetime','604800');
    session_save_path(__DIR__.'/../.storage/sessions'); session_name('VKDSESSID');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','httponly'=>true,'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','samesite'=>'Lax']);
    session_start();
}
function require_admin(): array {
    session_start_safe();
    $admin=row("SELECT id,name,email,role,status FROM admins WHERE id=? AND status='Active'",[$_SESSION['admin_id']??0]);
    if (!$admin) fail('Please sign in.',401);
    if (!in_array($admin['role'],['Super Admin','Admin'],true)) fail('Administrator access is required.',403);
    return $admin;
}
function audit(string $action): void { query('INSERT INTO activity_logs(user_id,action) VALUES (?,?)',[$_SESSION['admin_id']??null,$action]); }
function public_record(array $r): array {
    foreach ($r as $key=>&$value) {
        if ($value===null) continue;
        if (in_array($key,['custom_fields','tags','custom_answers','lead_forms','document_data','context'],true)) $value=json_value($value);
        elseif (in_array($key,['auto_renew','fb_auto_whatsapp','deadline_alerts_enabled','alert_acknowledged','auto_entry_enabled'],true)) $value=(bool)$value;
        elseif (preg_match('/^(client_id|service_id|vendor_id|project_id|employee_id|quotation_id|invoice_id|converted_invoice_id|recurring_expense_id|unallocated_client_id|amount_received|balance_due|receipt_count|amount|default_rate|total_amount|gst_tax|gst_rate|grand_total|subtotal|discount_amount|gst_amount|advance_paid|pending_balance|salary|budget|estimated_hours|day_of_month|alert_threshold_days|days_remaining)$/',$key) && is_numeric($value)) $value=0+$value;
    }
    unset($value);
    return $r;
}
