<?php
declare(strict_types=1);
require_once __DIR__.'/../api/bootstrap.php';
$url='http://localhost/'.rawurlencode(basename(dirname(__DIR__))).'/api/whatsapp_webhook.php';
$original=row("SELECT * FROM integration_settings WHERE provider='whatsapp'");
$key='qa-webhook-'.bin2hex(random_bytes(10));$provider='qa-webhook-'.bin2hex(random_bytes(8));
function call_hook(string $url,?array $body=null,?string $secret=null): array {
 $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15]);
 if($body!==null){$raw=json_encode($body);curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$raw,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Hub-Signature-256: sha256='.hash_hmac('sha256',$raw,$secret??'invalid')]]);}
 $text=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);return [$status,$text];
}
function check_hook(bool $ok,string $label): void {if(!$ok)throw new RuntimeException($label);echo "PASS: $label\n";}
try {
 query("UPDATE integration_settings SET encrypted_secrets=? WHERE provider='whatsapp'",[encrypt_secret(['app_secret'=>$key,'webhook_verify_token'=>$key])]);
 check_hook(call_hook($url,[])[0]===403,'invalid webhook signature rejected');
 check_hook(call_hook($url.'?hub.mode=subscribe&hub.verify_token='.urlencode($key).'&hub.challenge=verified')===[200,'verified'],'Meta webhook verification');
 $event=fn($status)=>['entry'=>[['changes'=>[['value'=>['statuses'=>[['id'=>$provider,'status'=>$status,'timestamp'=>time()]]]]]]]];
 check_hook(call_hook($url,$event('read'),$key)[0]===200,'signed read receipt accepted');
 call_hook($url,$event('delivered'),$key);$m=row('SELECT * FROM communications WHERE provider_message_id=?',[$provider]);check_hook($m['status']==='Read','late delivery callback cannot regress read status');
 $inbound=['entry'=>[['changes'=>[['value'=>['messages'=>[['id'=>$provider.'-in','from'=>'000000000','timestamp'=>time(),'type'=>'text','text'=>['body'=>'QA webhook message']]]]]]]]];
 call_hook($url,$inbound,$key);call_hook($url,$inbound,$key);check_hook(count(rows('SELECT id FROM communications WHERE provider_message_id=?',[$provider.'-in']))===1,'inbound webhook retries deduplicated');
}finally {
 query('UPDATE integration_settings SET config=?,encrypted_secrets=? WHERE provider=?',[$original['config'],$original['encrypted_secrets'],'whatsapp']);
 query('DELETE FROM communications WHERE provider_message_id IN (?,?)',[$provider,$provider.'-in']);
}
echo "WEBHOOK CHECKS PASSED; ORIGINAL SETTINGS RESTORED\n";
