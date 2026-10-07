<?php
declare(strict_types=1);
require_once __DIR__.'/integrations.php';
header('Cache-Control: no-store');
try {
    $configs=[integration('whatsapp',true),integration('facebook',true)];
    if($_SERVER['REQUEST_METHOD']==='GET') {
        foreach($configs as $i=>$c) if(!empty($c['webhook_verify_token']) && hash_equals($c['webhook_verify_token'],$_GET['hub_verify_token']??'') && ($_GET['hub_mode']??'')==='subscribe') {
            if($i===0) query("UPDATE integration_settings SET config=JSON_SET(config,'$.webhook_status','Connected') WHERE provider='whatsapp'");
            header('Content-Type: text/plain');echo $_GET['hub_challenge']??'';exit;
        }
        fail('Webhook verification failed.',403);
    }
    if($_SERVER['REQUEST_METHOD']!=='POST')fail('Method not allowed.',405);
    $raw=file_get_contents('php://input');$signature=$_SERVER['HTTP_X_HUB_SIGNATURE_256']??'';$valid=false;
    foreach($configs as $c)if(!empty($c['app_secret']) && hash_equals('sha256='.hash_hmac('sha256',$raw,$c['app_secret']),$signature))$valid=true;
    if(!$valid)fail('Invalid webhook signature.',403);
    $body=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
    foreach($body['entry']??[] as $entry)foreach($entry['changes']??[] as $change){
        $value=$change['value']??[];
        foreach($value['statuses']??[] as $s){
            $status=['sent'=>'Sent','delivered'=>'Delivered','read'=>'Read','failed'=>'Failed'][$s['status']??'']??null;if(!$status)continue;
            $m=row('SELECT * FROM communications WHERE channel=? AND provider_message_id=?',['whatsapp',$s['id']]);
            $priority=['Queued'=>0,'Failed'=>0,'Sent'=>1,'Delivered'=>2,'Read'=>3];
            if($m && $priority[$status]<$priority[$m['status']] && $status!=='Failed')continue;
            $error=$status==='Failed'?($s['errors'][0]['message']??$s['errors'][0]['title']??'Provider delivery failed'):null;
            if($m)query('UPDATE communications SET status=?,error_message=? WHERE id=?',[$status,$error,$m['id']]);
            else query("INSERT INTO communications(id,channel,purpose,body,status,provider_message_id,error_message,sent_at) VALUES (?,'whatsapp','message','',?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),error_message=VALUES(error_message)",['status-'.sha1($s['id']),$status,$s['id'],$error,date('Y-m-d H:i:s',(int)($s['timestamp']??time()))]);
        }
        foreach($value['messages']??[] as $m){
            if(row("SELECT id FROM communications WHERE channel='whatsapp' AND provider_message_id=?",[$m['id']]))continue;
            $phone=preg_replace('/\D/','',$m['from']??'');$matches=array_values(array_filter(rows('SELECT id,client_id,lead_phone FROM facebook_leads'),fn($l)=>preg_replace('/\D/','',$l['lead_phone'])===$phone));
            $lead=count($matches)===1?$matches[0]:null;
            $text=$m['text']['body']??('Received '.($m['type']??'message'));
            query("INSERT INTO communications(id,channel,purpose,lead_id,recipient_name,recipient_phone,body,status,direction,sent_at,provider_message_id) VALUES (?,'whatsapp','message',?,?,?,?,'Delivered','inbound',?,?) ON DUPLICATE KEY UPDATE id=id",['in-'.sha1($m['id']),$lead['id']??null,$value['contacts'][0]['profile']['name']??'',$phone,$text,date('Y-m-d H:i:s',(int)($m['timestamp']??time())),$m['id']]);
        }
        if(($change['field']??'')==='leadgen'){
            $clients=rows('SELECT id FROM clients WHERE fb_page_id=? AND (fb_form_id=? OR fb_form_id IS NULL)',[(string)($value['page_id']??$entry['id']),(string)($value['form_id']??'')]);
            if(count($clients)!==1)fail('Configure a unique client page/form mapping before receiving leads.',422);
            sync_facebook((int)$clients[0]['id']);
        }
    }
    header('Content-Type: application/json');echo '{"ok":true}';
}catch(Throwable $e){http_response_code(in_array($e->getCode(),[400,403,405,422],true)?$e->getCode():503);header('Content-Type: application/json');echo json_encode(['error'=>$e->getMessage()]);}
