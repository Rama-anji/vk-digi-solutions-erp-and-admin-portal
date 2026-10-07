<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
$path=__DIR__.'/config.local.php';
if (file_exists($path)) {
    $pdo=new PDO('mysql:host=127.0.0.1;port=3306;dbname=vkd_erp_v2;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    foreach(["client_subscriptions"=>["custom_duration"=>"VARCHAR(255) NULL","payment_status"=>"ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid'"],'invoices'=>['discount_amount'=>'DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount>=0)'],'communications'=>['error_message'=>'TEXT NULL'],'documents'=>['notes'=>'TEXT NULL']] as $table=>$fields) foreach($fields as $field=>$definition) {
        $check=$pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?'); $check->execute([$table,$field]);
        if(!(int)$check->fetchColumn()) $pdo->exec("ALTER TABLE `$table` ADD `$field` $definition");
    }
    require __DIR__.'/../database/migrations/20260928-subscription-lifecycle.php';
    $sql=file_get_contents(__DIR__.'/../db.sql');
    foreach(preg_split('/;\s*(?:\r?\n|$)/',trim(preg_replace('/^--.*$/m','',$sql))) as $statement) if(str_starts_with(trim($statement),'CREATE SQL SECURITY INVOKER VIEW')) $pdo->exec(str_replace('CREATE SQL','CREATE OR REPLACE SQL',trim($statement)));
    require __DIR__.'/../database/upgrade-payments.php';
    echo "Schema extensions and read views updated; existing records preserved.\n"; exit;
}
$pdo=new PDO('mysql:host=127.0.0.1;port=3306;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$exists=$pdo->query("SHOW DATABASES LIKE 'vkd_erp_v2'")->fetchColumn();
if ($exists) throw new RuntimeException('vkd_erp_v2 already exists; inspect before provisioning.');
$sql=preg_replace('/^--.*$/m','',file_get_contents(__DIR__.'/../db.sql'));
foreach(preg_split('/;\s*(?:\r?\n|$)/',trim($sql)) as $statement) if(trim($statement)!=='') $pdo->exec($statement);
$appPassword=bin2hex(random_bytes(24));
$pdo->exec("CREATE USER 'vkd_portal'@'127.0.0.1' IDENTIFIED BY ".$pdo->quote($appPassword));
$pdo->exec("GRANT SELECT,INSERT,UPDATE,DELETE ON vkd_erp_v2.* TO 'vkd_portal'@'127.0.0.1'");
$adminPassword='VKD-'.bin2hex(random_bytes(6));
$stmt=$pdo->prepare("INSERT INTO admins(name,email,password,role) VALUES ('VKD Master Admin','admin@vkdsolutions.com',?,'Super Admin')");
$stmt->execute([password_hash($adminPassword,PASSWORD_DEFAULT)]);
$config=['host'=>'127.0.0.1','port'=>3306,'database'=>'vkd_erp_v2','user'=>'vkd_portal','password'=>$appPassword,'key'=>base64_encode(random_bytes(32))];
file_put_contents($path,"<?php\nreturn ".var_export($config,true).";\n");
if (!is_dir(__DIR__.'/../.storage')) mkdir(__DIR__.'/../.storage',0700,true);
file_put_contents(__DIR__.'/../.storage/initial-login.txt',"Email: admin@vkdsolutions.com\nPassword: $adminPassword\nChange this password in Integrations & Settings after signing in.\n");
$company=['legal_name'=>'VK Digi Solutions Private Limited','display_name'=>'VK Digi Solutions','address'=>'','email'=>'','phone'=>'','gstin'=>'','bank_name'=>'','account_number'=>'','ifsc'=>'','default_terms'=>''];
$stmt=$pdo->prepare('INSERT INTO integration_settings(provider,config) VALUES (?,?)');
$stmt->execute(['company',json_encode($company)]);
$stmt->execute(['whatsapp',json_encode(['waba_id'=>'','phone_number_id'=>'','business_phone_number'=>'','default_country_code'=>'91','auto_greeting_enabled'=>false,'webhook_status'=>'Disconnected','graph_version'=>'v25.0','templates'=>[['id'=>'tmpl-custom','name'=>'custom','category'=>'CUSTOM','label'=>'Custom message','text'=>'']]])]);
echo "Created vkd_erp_v2 with 23 tables. Runtime account configured. Initial login saved to .storage/initial-login.txt\n";
