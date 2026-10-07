<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/integrations.php';
if(!(int)query("SELECT GET_LOCK('vkd-automation',0)")->fetchColumn()) exit;
$started=date(DATE_ATOM);
function worker_status(array $data):void {
    $path=__DIR__.'/../.storage/automation-status.json';
    file_put_contents($path.'.tmp',json_encode($data,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR),LOCK_EX);
    rename($path.'.tmp',$path);
}
worker_status(['status'=>'running','started_at'=>$started]);
try {
    db()->beginTransaction(); $renewals=renew_due_subscriptions(); $bills=run_recurring(); $reminders=queue_reminders(); db()->commit();
    $deliveryFailures=0;
    if(!empty(integration('smtp')['auto_send'])) foreach(rows("SELECT id FROM communications WHERE channel='email' AND status='Queued'") as $m) { try{send_message($m['id']);}catch(Throwable $e){$deliveryFailures++;error_log($e->getMessage());} }
    if(!empty(integration('whatsapp')['auto_greeting_enabled'])) foreach(rows("SELECT id FROM communications WHERE channel='whatsapp' AND status='Queued' AND deduplication_key LIKE 'greeting:%'") as $m) { try{send_message($m['id']);}catch(Throwable $e){$deliveryFailures++;error_log($e->getMessage());} }
    worker_status(['status'=>$deliveryFailures?'delivery_errors':'ok','started_at'=>$started,'completed_at'=>date(DATE_ATOM),'renewals'=>$renewals,'bills'=>$bills,'reminders'=>$reminders,'delivery_failures'=>$deliveryFailures]);
    if($bills||$reminders) echo "Created $bills due bills and $reminders reminders.\n";
}catch(Throwable $e){if(db()->inTransaction())db()->rollBack();worker_status(['status'=>'failed','started_at'=>$started,'completed_at'=>date(DATE_ATOM),'error'=>'Automation failed. Check the private PHP error log.']);error_log($e->getMessage());exit(1);}
finally{query("SELECT RELEASE_LOCK('vkd-automation')");}
