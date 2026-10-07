<?php
declare(strict_types=1);
require_once __DIR__.'/../api/integrations.php';
function verify(bool $ok,string $label): void {if(!$ok)throw new RuntimeException($label);echo "PASS: $label\n";}
$fixture=json_decode(file_get_contents(__DIR__.'/../test-results/fixture-records.json'),true);
verify(advance_date('2026-01-31','Monthly')==='2026-02-28','month-end renewal clamping');
verify(advance_date('2024-02-29','Yearly')==='2025-02-28','leap-day yearly renewal');
verify(advance_date('2026-01-31','Custom','1 month')==='2026-02-28','custom month-end renewal');
verify(count(rows("SHOW FULL TABLES WHERE Table_type='BASE TABLE'"))===23,'23-table database including renewal ledger');
try {
 db()->beginTransaction();
 $secret='test-only-secret-'.bin2hex(random_bytes(10));
 save_settings('smtp',['host'=>'smtp.example.invalid','from_email'=>'qa@example.invalid','password'=>$secret]);
 $stored=row("SELECT * FROM integration_settings WHERE provider='smtp'");
 verify(!str_contains(json_encode($stored),$secret),'SMTP secret encrypted at rest');
 verify((integration('smtp')['password_configured']??false) && !isset(integration('smtp')['password']),'API exposes credential presence only');
 verify(integration('smtp',true)['password']===$secret,'server decrypts SMTP secret');
 $s=save_resource('subscriptions',['client_id'=>$fixture['client']['id'],'service_id'=>$fixture['service']['id'],'billing_cycle'=>'Monthly','start_date'=>'2026-01-01','expiry_date'=>date('Y-m-d',strtotime('-1 day')),'amount'=>10,'auto_renew'=>true]);
 renew_due_subscriptions();$renewed=find_record('subscriptions',$s['id']);verify($renewed['expiry_date']===$s['expiry_date'],'unpaid automatic renewal preserves expiry');
 renew_due_subscriptions();verify(find_record('subscriptions',$s['id'])['expiry_date']===$renewed['expiry_date'],'automatic renewal is idempotent');
 $table=$fixture['table'];save_resource('files',['notes'=>'Partial update regression'],$table['id']);$fresh=find_record('files',$table['id']);verify($fresh['table_data']===$table['table_data'] && $fresh['notes']==='Partial update regression','partial file update preserves table data and identity');
 query("UPDATE integration_settings SET config=?,encrypted_secrets=NULL WHERE provider='whatsapp'",[json_encode(['auto_greeting_enabled'=>true,'templates'=>[['id'=>'qa-greeting','name'=>'qa_greeting','category'=>'LEAD_GREETING','text'=>'Hello {{lead_name}}','meta_template'=>['name'=>'qa_greeting','language'=>['code'=>'en_US'],'components'=>[['type'=>'body','parameters'=>[['type'=>'text','text'=>'{{lead_name}}']]]]]]]])]);
 $client=$fixture['client'];$client['fb_auto_whatsapp']=true;queue_greeting($fixture['lead'],$client);queue_greeting($fixture['lead'],$client);
 $m=rows('SELECT * FROM communications WHERE deduplication_key=?',['greeting:'.$fixture['lead']['id']]);verify(count($m)===1 && $m[0]['status']==='Queued','automatic greeting queued once without sending');
 verify(json_value($m[0]['context'])['meta_template']['components'][0]['parameters'][0]['text']===$fixture['lead']['lead_name'],'approved template variables resolve from saved lead');
}finally{if(db()->inTransaction())db()->rollBack();}
echo "BACKEND CHECKS PASSED; TEST CHANGES ROLLED BACK\n";
