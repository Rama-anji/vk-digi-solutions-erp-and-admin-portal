<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit;
require __DIR__.'/../api/bootstrap.php';
$before=json_decode(file_get_contents(__DIR__.'/../.storage/renewal-lifecycle-before/records.json'),true,512,JSON_THROW_ON_ERROR);
foreach($before as $table=>$records){
    if(!in_array($table,['client_subscriptions','payments_received','invoices','communications'],true))throw new RuntimeException('Unexpected snapshot table.');
    $current=rows("SELECT * FROM `$table`");$indexed=array_column($current,null,'id');
    foreach($records as $record){
        $now=$indexed[$record['id']]??throw new RuntimeException('Missing original record in '.$table);
        foreach($record as $field=>$value)if($now[$field]!==$value)throw new RuntimeException('Original field changed: '.$table.'.'.$field.' #'.$record['id']);
    }
    if(count($current)!==count($records))throw new RuntimeException('Record count changed in '.$table);
    echo 'PASS: '.count($records).' original '.$table." records and every original field unchanged.\n";
}
