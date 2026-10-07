<?php
if(PHP_SAPI!=='cli')exit;
require __DIR__.'/../api/bootstrap.php';
$tables=['client_subscriptions','payments_received','invoices','communications'];$snapshot=[];foreach($tables as $table)$snapshot[$table]=rows("SELECT * FROM `$table`");
$dir=__DIR__.'/../.storage/renewal-lifecycle-before';if(!is_dir($dir))mkdir($dir,0700,true);if(is_file($dir.'/records.json'))throw new RuntimeException('Snapshot already exists; preserve the original audit.');file_put_contents($dir.'/records.json',json_encode($snapshot,JSON_THROW_ON_ERROR));
foreach($snapshot as $table=>$records)echo $table.': '.count($records)." records preserved in private snapshot\n";
echo json_encode(rows("SELECT status,payment_status,auto_renew,COUNT(*) AS records FROM client_subscriptions GROUP BY status,payment_status,auto_renew"),JSON_PRETTY_PRINT)."\n";
