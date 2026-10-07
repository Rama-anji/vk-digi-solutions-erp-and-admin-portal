<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$config=require __DIR__.'/../../api/config.local.php';
$pdo=new PDO("mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4",getenv('MIGRATION_DB_USER')?:'root',getenv('MIGRATION_DB_PASSWORD')?:'',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$fields=['payment_status'=>"ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid'",'current_period_start'=>'DATE NULL','billing_anchor_day'=>'TINYINT UNSIGNED NULL','created_at'=>'DATETIME NULL','updated_at'=>'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'];
foreach($fields as $field=>$definition){
 $s=$pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');$s->execute(['client_subscriptions',$field]);
 if(!$s->fetchColumn())$pdo->exec("ALTER TABLE client_subscriptions ADD `$field` $definition");
}
$pdo->exec(file_get_contents(__DIR__.'/20260928-subscription-lifecycle.sql'));
$pdo->exec("ALTER TABLE communications MODIFY status ENUM('Queued','Processing','Sent','Delivered','Read','Failed') NOT NULL DEFAULT 'Queued'");
// MariaDB expands s.* when a view is created; refresh it to expose additive fields.
$sql=file_get_contents(__DIR__.'/../../db.sql');
foreach(preg_split('/;\s*(?:\r?\n|$)/',trim(preg_replace('/^--.*$/m','',$sql))) as $statement){
 if(preg_match('/^CREATE SQL SECURITY INVOKER VIEW (v_subscriptions|client_services_subscriptions)\b/',trim($statement)))$pdo->exec(str_replace('CREATE SQL','CREATE OR REPLACE SQL',trim($statement)));
}
echo "Subscription lifecycle migration applied; existing periods, rates and payments preserved.\n";
