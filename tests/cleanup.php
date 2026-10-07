<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit;
require_once __DIR__.'/../api/bootstrap.php';
if(config()['database']!=='vkd_erp_v2')throw new RuntimeException('Unexpected database.');
$manifest=json_decode(file_get_contents(__DIR__.'/../test-results/fixtures.json'),true);
function fixture_ids(string $table,string $column,array $ids): array {
 if(!$ids)return [];
 return rows("SELECT * FROM `$table` WHERE `$column` IN (".implode(',',array_fill(0,count($ids),'?')).')',$ids);
}
function remove_ids(string $table,string $column,array $ids): void {
 if(!$ids)return;
 query("DELETE FROM `$table` WHERE `$column` IN (".implode(',',array_fill(0,count($ids),'?')).')',$ids);
}
$clients=fixture_ids('clients','id',$manifest['clients']??[]);
foreach($clients as $c)if(!preg_match('/^QA-\d+$/',$c['client_code']) || $c['email']!=='qa@example.invalid')throw new RuntimeException('Unrecognized fixture client; stopping.');
$browserClients=rows("SELECT * FROM clients WHERE email='qa-ui@example.invalid' AND name REGEXP '^QA Browser Client [0-9]+$'");
$clientIds=array_column(array_merge($clients,$browserClients),'id');
$vendors=fixture_ids('vendors','id',$manifest['vendors']??[]);foreach($vendors as $v)if(!str_starts_with($v['vendor_name'],'QA Vendor ') || $v['email']!=='vendor@example.invalid')throw new RuntimeException('Unrecognized vendor fixture.');
$employees=fixture_ids('employees','id',$manifest['employees']??[]);foreach($employees as $e)if(!preg_match('/^QA-E-\d+$/',$e['emp_code']))throw new RuntimeException('Unrecognized employee fixture.');
$services=fixture_ids('services_catalog','id',$manifest['services']??[]);foreach($services as $s)if(!preg_match('/^QA (Service|Custom) \d+$/',$s['service_name']))throw new RuntimeException('Unrecognized service fixture.');
$pages=$manifest['facebookPages']??[];foreach($pages as $p)if(!preg_match('/^qa-page-\d+$/',$p))throw new RuntimeException('Unrecognized page fixture.');
$uploadPaths=[];
try {
 db()->beginTransaction();
 foreach($clientIds as $id){
  foreach(rows('SELECT file_url FROM documents WHERE client_id=? AND reference_type=\'upload\' AND file_url IS NOT NULL',[$id]) as $file)$uploadPaths[]=$file['file_url'];
  query('DELETE FROM communications WHERE client_id=? OR subscription_id IN (SELECT id FROM client_subscriptions WHERE client_id=?) OR project_id IN (SELECT id FROM projects WHERE client_id=?) OR lead_id IN (SELECT id FROM facebook_leads WHERE client_id=?)',[$id,$id,$id,$id]);
  query('DELETE FROM documents WHERE client_id=?',[$id]);
  query('DELETE FROM payments_received WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id=?)',[$id]);
  query('DELETE FROM commercial_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id=?) OR quotation_id IN (SELECT id FROM quotations WHERE client_id=?)',[$id,$id]);
  foreach(['invoices','quotations','client_subscriptions','website_infrastructure','credential_vault','facebook_leads'] as $table)query("DELETE FROM `$table` WHERE client_id=?",[$id]);
  query('DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE client_id=?)',[$id]);
  query('DELETE FROM projects WHERE client_id=?',[$id]);query('DELETE FROM clients WHERE id=?',[$id]);
 }
 $vendorIds=array_column($vendors,'id');remove_ids('vendor_bills','vendor_id',$vendorIds);remove_ids('recurring_vendor_expenses','vendor_id',$vendorIds);remove_ids('vendors','id',$vendorIds);
 $employeeIds=array_column($employees,'id');remove_ids('documents','employee_id',$employeeIds);remove_ids('employees','id',$employeeIds);
 remove_ids('services_catalog','id',array_column($services,'id'));remove_ids('facebook_pages','page_id',$pages);
 db()->commit();
}catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
$root=realpath(__DIR__.'/../.storage/uploads');
foreach($uploadPaths as $key){if(!preg_match('/^[a-f0-9]{48}\.[a-z0-9]+$/',$key))continue;$path=realpath($root.DIRECTORY_SEPARATOR.$key);if($root && $path && str_starts_with($path,$root.DIRECTORY_SEPARATOR) && is_file($path))unlink($path);}
file_put_contents(__DIR__.'/../test-results/fixtures.json','{}');
echo 'Removed '.count($clientIds).' QA clients and their dependent test records; original business records preserved. Audit history retained.'.PHP_EOL;
