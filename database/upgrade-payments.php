<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$c=require __DIR__.'/../api/config.local.php';
if($c['database']!=='vkd_erp_v2')throw new RuntimeException('Unexpected database.');
$pdo=new PDO('mysql:host=127.0.0.1;port=3306;dbname=vkd_erp_v2;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$fields=['receipt_key'=>'VARCHAR(64) NULL','reconciled_at'=>'DATETIME NULL','bank_reference'=>'VARCHAR(100) NULL','voided_at'=>'DATETIME NULL','void_reason'=>'VARCHAR(500) NULL','created_at'=>'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'];
foreach($fields as $field=>$definition){$s=$pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?');$s->execute(['payments_received',$field]);if(!$s->fetchColumn())$pdo->exec("ALTER TABLE payments_received ADD `$field` $definition");}
if(!$pdo->query("SHOW INDEX FROM payments_received WHERE Key_name='uq_receipt_key'")->fetch())$pdo->exec('ALTER TABLE payments_received ADD UNIQUE KEY uq_receipt_key(receipt_key)');
$pdo->exec('CREATE OR REPLACE SQL SECURITY INVOKER VIEW v_payments_received AS SELECT p.*,COALESCE(i.client_id,p.unallocated_client_id) AS client_id FROM payments_received p LEFT JOIN invoices i ON i.id=p.invoice_id');
echo "Payment receipt columns installed additively; existing invoices and payments preserved.\n";
