<?php
declare(strict_types=1);
require_once __DIR__.'/actions.php';
function smtp_config(array $c): array {
    if(!extension_loaded('curl')) fail('Enable the PHP cURL extension on this server before sending email.',500);
    $c['host']=trim((string)($c['host']??''));
    $c['from_email']=trim((string)($c['from_email']??''));
    $c['username']=trim((string)($c['username']??''));
    if(!$c['host'] || !$c['from_email']) fail('Configure SMTP host and sender under Integrations & Settings before sending email.');
    if(!preg_match('/^[a-zA-Z0-9.-]+$/',$c['host'])) fail('Invalid SMTP hostname. Enter only the hostname, without a URL or port.');
    if(!filter_var($c['from_email'],FILTER_VALIDATE_EMAIL)) fail('A valid sender email is required.');
    $c['port']=filter_var($c['port']??587,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>65535]]);
    if($c['port']===false) fail('Invalid SMTP port.');
    $c['security']=$c['security']??'tls';
    if(!in_array($c['security'],['tls','ssl'],true)) fail('Choose TLS or SSL encryption.');
    if(($c['username']!=='') !== (!empty($c['password']))) fail('Enter both the SMTP username and password.');
    $protocol=$c['security']==='ssl'?'smtps':'smtp';
    if(!in_array($protocol,curl_version()['protocols'],true)) fail('The PHP cURL installation does not support '.$protocol.'. Ask your hosting provider to enable SMTP support.',500);
    return $c;
}
function smtp_connection(array $c) {
    $curl=curl_init(($c['security']==='ssl'?'smtps':'smtp').'://'.$c['host'].':'.$c['port']);
    curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_USERNAME=>$c['username'],CURLOPT_PASSWORD=>$c['password']??'',CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
    if($c['security']==='tls') curl_setopt($curl,CURLOPT_USE_SSL,CURLUSESSL_ALL);
    return $curl;
}
function smtp_error(string $error,int $code): string {
    if($code===535) return 'SMTP authentication rejected (535). Verify the mailbox username and password; if two-factor authentication is enabled, use an app-specific password.';
    return ($error!==''?$error:'The SMTP server rejected the request.').($code?' (SMTP '.$code.')':'');
}
function save_settings(string $provider,array $data): array {
    if(!in_array($provider,['company','smtp','facebook','whatsapp'],true)) fail('Unknown settings section.');
    $existing=row('SELECT * FROM integration_settings WHERE provider=?',[$provider]); $secrets=decrypt_secret($existing['encrypted_secrets']??null);
    foreach(['api_token','webhook_verify_token','app_secret','password','page_access_token'] as $key) { if(!empty($data[$key])) $secrets[$key]=$data[$key]; unset($data[$key],$data[$key.'_configured']); }
    if(isset($data['templates'])) { $ids=[]; foreach($data['templates'] as $template) { if(empty($template['id']) || empty($template['name']) || isset($ids[$template['id']])) fail('Templates require unique IDs and names.'); $ids[$template['id']]=true; } }
    if($provider==='whatsapp') $data['webhook_status']=integration('whatsapp')['webhook_status']??'Disconnected';
    query('INSERT INTO integration_settings(provider,config,encrypted_secrets) VALUES (?,?,?) ON DUPLICATE KEY UPDATE config=VALUES(config),encrypted_secrets=VALUES(encrypted_secrets)',[$provider,json_encode($data,JSON_THROW_ON_ERROR),encrypt_secret($secrets)]);
    audit('Updated '.$provider.' settings'); return integration($provider);
}
function check_integration(array $input): array {
    $provider=$input['provider']??'';if(!in_array($provider,['smtp','facebook','whatsapp'],true))fail('Unknown integration.');
    $c=integration($provider,true);$result=['provider'=>$provider,'checked_at'=>date(DATE_ATOM),'status'=>'needs_setup','delivery_verified'=>false];
    try {
        if($provider==='smtp') {
            $c=smtp_config($c);
            $curl=smtp_connection($c);
            curl_setopt_array($curl,[CURLOPT_CONNECT_ONLY=>true,CURLOPT_TIMEOUT=>15]);
            $ok=curl_exec($curl);$error=smtp_error(curl_error($curl),(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE));curl_close($curl);if($ok===false)fail('SMTP connection failed: '.$error,502);
            $result['message']='SMTP connection established. Send a test email to verify sending and check the recipient inbox.';
        }elseif($provider==='whatsapp') {
            if(empty($c['phone_number_id'])||empty($c['api_token']))fail('Save the Phone Number ID and Meta access token first.');
            if(!preg_match('/^\d+$/',$c['phone_number_id']))fail('Phone Number ID must contain digits only.');
            $phone=meta_request($c['phone_number_id'].'?fields=id,display_phone_number,verified_name',$c);
            $result['message']='Phone account access confirmed: '.($phone['display_phone_number']??$phone['id']).'. This does not verify message delivery or webhook reachability.';
        }else {
            $pageId=trim($input['page_id']??$c['page_id']??'');if(!$pageId||!preg_match('/^\d+$/',$pageId))fail('Enter the numeric Facebook Page ID to check.');
            $page=meta_request($pageId.'?fields=id,name',$c);$result['message']='Page access confirmed: '.($page['name']??$page['id']).'. Lead-form permissions are checked when you synchronize leads.';
        }
        $result['status']='connection_ok';
    }catch(Throwable $e){$result['status']=$e->getCode()===502?'failed':'needs_setup';$result['message']=$e->getMessage();}
    query('INSERT INTO integration_settings(provider,config) VALUES (?,?) ON DUPLICATE KEY UPDATE config=VALUES(config)',['check_'.$provider,json_encode($result,JSON_THROW_ON_ERROR)]);
    audit('Checked '.$provider.' connection: '.$result['status']);return $result;
}
function send_test_email(array $input): array {
    $recipient=trim($input['recipient']??'');if(!filter_var($recipient,FILTER_VALIDATE_EMAIL))fail('Enter an authorized test recipient email address.');
    $key=$input['request_key']??'';if(!preg_match('/^[a-zA-Z0-9_-]{16,64}$/',$key))fail('Invalid test request key.');
    $dedup='smtp-test:'.$key;$existing=row('SELECT * FROM communications WHERE deduplication_key=?',[$dedup]);
    if($existing&&$existing['recipient_email']!==$recipient)fail('Test request key already used.',409);
    $id=$existing['id']??write_record('communications',['id'=>'smtp-test-'.bin2hex(random_bytes(12)),'channel'=>'email','purpose'=>'message','recipient_email'=>$recipient,'recipient_name'=>'Authorized test recipient','subject'=>'VKD ERP connection test','body'=>'This is the single test email requested from your VKD ERP settings. Please confirm receipt before enabling automatic sending.','deduplication_key'=>$dedup]);
    return send_message($id);
}
function meta_request(string $path,array $config,?array $payload=null): array {
    $version=$config['graph_version']??'v25.0'; if(!preg_match('/^v\d+\.\d+$/',$version)) fail('Invalid Graph API version.');
    $token=$config['page_access_token']??$config['api_token']??''; if(!$token) fail('Add Meta credentials in Integrations & Settings first.');
    $curl=curl_init('https://graph.facebook.com/'.$version.'/'.ltrim($path,'/'));
    curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token,'Content-Type: application/json']]);
    if($payload!==null) { curl_setopt($curl,CURLOPT_POST,true); curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($payload,JSON_THROW_ON_ERROR)); }
    $raw=curl_exec($curl); $error=curl_error($curl); $code=curl_getinfo($curl,CURLINFO_RESPONSE_CODE); curl_close($curl);
    if($raw===false) fail('Meta connection failed: '.$error,502);
    $result=json_decode($raw,true); if($code>=400 || !is_array($result)) fail('Meta rejected the request: '.($result['error']['message']??'HTTP '.$code),502);
    return $result;
}
function smtp_send(array $message, bool &$deliveryStarted=false): string {
    $deliveryStarted=false;
    $c=smtp_config(integration('smtp',true));
    $to=$message['recipient_email']??''; if(!filter_var($to,FILTER_VALIDATE_EMAIL) || !filter_var($c['from_email'],FILTER_VALIDATE_EMAIL)) fail('A valid sender and recipient email are required.');
    $id='<'.hash('sha256',(string)($message['id']??bin2hex(random_bytes(16)))).'@'.(substr(strrchr($c['from_email'],'@'),1)).'>';
    $body="From: {$c['from_email']}\r\nTo: $to\r\nSubject: =?UTF-8?B?".base64_encode($message['subject']??'Notification')."?=\r\nMessage-ID: $id\r\nDate: ".date(DATE_RFC2822)."\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n".chunk_split(base64_encode($message['body']));
    $stream=fopen('php://temp','r+'); fwrite($stream,$body); rewind($stream);
    $curl=smtp_connection($c);
    curl_setopt_array($curl,[CURLOPT_UPLOAD=>true,CURLOPT_INFILE=>$stream,CURLOPT_INFILESIZE=>strlen($body),CURLOPT_MAIL_FROM=>$c['from_email'],CURLOPT_MAIL_RCPT=>[$to]]);
    $deliveryStarted=true;
    $ok=curl_exec($curl); $error=smtp_error(curl_error($curl),(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE));
    // A definitive SMTP rejection or failure before uploading any message is safe to retry.
    if($ok===false && (curl_getinfo($curl,CURLINFO_RESPONSE_CODE)>=400 || curl_getinfo($curl,CURLINFO_SIZE_UPLOAD)===0.0))$deliveryStarted=false;
    curl_close($curl); fclose($stream);
    if($ok===false) fail('SMTP delivery failed: '.$error,502); return $id;
}
function send_message(string $id): array {
    $lock='vkd-message:'.$id;
    if(!(int)query('SELECT GET_LOCK(?,0)',[$lock])->fetchColumn()) fail('This message is already being sent.',409);
    try {
        $m=row('SELECT * FROM communications WHERE id=?',[$id]); if(!$m) fail('Message not found.',404);
        if(in_array($m['status'],['Sent','Delivered','Read'],true)) return $m;
        if($m['status']==='Processing')fail('Delivery outcome is uncertain or processing. Check the provider log before retrying this message.',409);
        $deliveryStarted=false;
        try {
            if($m['channel']==='email') {
                if($m['status']==='Failed' && $m['subscription_id'] && (json_value($m['context']??'{}')['notice_kind']??'reminder')!=='test'){
                    $recipient=row('SELECT c.email FROM clients c JOIN client_subscriptions s ON s.client_id=c.id WHERE s.id=?',[$m['subscription_id']])['email']??$m['recipient_email'];
                    query('UPDATE communications SET recipient_email=? WHERE id=?',[$recipient,$id]);$m['recipient_email']=$recipient;
                }
                if(!filter_var($m['recipient_email'],FILTER_VALIDATE_EMAIL))fail('Invalid recipient email. Correct the recipient before sending.');
                $smtp=integration('smtp',true);
                if(empty($smtp['host']) || empty($smtp['from_email']))fail('Configure SMTP host and sender before sending.');
                if(str_contains($m['body'],'{{'))fail('Resolve all email template variables before sending.');
                query("UPDATE communications SET status='Processing',error_message=NULL WHERE id=?",[$id]);
                $providerId=smtp_send($m,$deliveryStarted);
            }
            else {
                $c=integration('whatsapp',true); if(empty($c['phone_number_id'])) fail('Configure WhatsApp in Integrations & Settings first.');
                if(str_contains($m['body'],'{{')) fail('Replace every template variable before sending.');
                $context=json_value($m['context']??'{}');
                $payload=['messaging_product'=>'whatsapp','to'=>preg_replace('/\D/','',$m['recipient_phone'])];
                if(!empty($context['meta_template'])) { $payload['type']='template'; $payload['template']=$context['meta_template']; }
                else { $payload['type']='text'; $payload['text']=['body'=>$m['body']]; }
                $result=meta_request(rawurlencode($c['phone_number_id']).'/messages',$c,$payload);
                $providerId=$result['messages'][0]['id']??fail('Meta did not return a message ID.',502);
            }
            db()->beginTransaction();
            $early=row('SELECT * FROM communications WHERE channel=? AND provider_message_id=? FOR UPDATE',[$m['channel'],$providerId]);
            if($early && $early['id']!==$id)query('DELETE FROM communications WHERE id=?',[$early['id']]);
            query('UPDATE communications SET status=?,sent_at=NOW(),provider_message_id=?,error_message=? WHERE id=?',[$early['status']??'Sent',$providerId,$early['error_message']??null,$id]);
            db()->commit();
            audit('Sent '.$m['channel'].' message '.$id);
        } catch(Throwable $e) {
            if(db()->inTransaction())db()->rollBack();
            $status=$deliveryStarted?'Processing':'Failed';
            $message=$deliveryStarted?'Delivery outcome uncertain. Verify the SMTP provider log before any resend. '.$e->getMessage():$e->getMessage();
            if(!in_array(row('SELECT status FROM communications WHERE id=?',[$id])['status']??'', ['Sent','Delivered','Read'],true))query('UPDATE communications SET status=?,error_message=? WHERE id=?',[$status,$message,$id]);
            audit('Message delivery '.$status.' '.$id);
            throw $e;
        }
        return row('SELECT * FROM communications WHERE id=?',[$id]);
    } finally { query('SELECT RELEASE_LOCK(?)',[$lock]); }
}
function send_whatsapp(array $d,bool $dispatch=true,?string $deduplicationKey=null): array {
    if(empty($d['messageBody']) || empty($d['recipientPhone'])) fail('Recipient and message are required.');
    $id='wa-'.bin2hex(random_bytes(12));
    $context=[];
    foreach(integration('whatsapp')['templates']??[] as $template) if($template['id']===($d['templateId']??'') && !empty($template['meta_template'])) {
        $vars=['recipient_name'=>$d['recipientName']??'', 'lead_name'=>$d['recipientName']??'', 'client_name'=>$d['clientName']??'', 'phone'=>$d['recipientPhone']];
        $replace=function($value)use(&$replace,$vars){ if(is_array($value))return array_map($replace,$value); if(!is_string($value))return $value; foreach($vars as $key=>$v)$value=str_replace('{{'.$key.'}}',$v,$value); return $value; };
        $context['meta_template']=$replace($template['meta_template']);
        if(empty($context['meta_template']['name']) || empty($context['meta_template']['language']['code']) || str_contains(json_encode($context),'{{'))fail('Set the approved template name, language and all component parameters in WhatsApp settings.');
    }
    write_record('communications',['id'=>$id,'channel'=>'whatsapp','purpose'=>'message','lead_id'=>$d['leadId']??null,'client_id'=>!empty($d['leadId'])?null:($d['clientId']??null),'recipient_name'=>$d['recipientName']??'','recipient_phone'=>$d['recipientPhone'],'template_used'=>$d['templateId']??null,'body'=>$d['messageBody'],'context'=>$context?:null,'deduplication_key'=>$deduplicationKey]);
    return $dispatch?send_message($id):row('SELECT * FROM communications WHERE id=?',[$id]);
}
function queue_greeting(array $lead,array $client): void {
    $c=integration('whatsapp'); if(empty($c['auto_greeting_enabled']) || empty($client['fb_auto_whatsapp']) || empty($lead['lead_phone'])) return;
    $key='greeting:'.$lead['id']; if(row('SELECT id FROM communications WHERE deduplication_key=?',[$key]))return;
    foreach($c['templates']??[] as $template) if(($template['category']??'')==='LEAD_GREETING' && !empty($template['meta_template'])) {
        $text=str_replace(['{{lead_name}}','{{recipient_name}}','{{client_name}}','{{service_requested}}'],[$lead['lead_name'],$lead['lead_name'],$client['name'],$lead['service_requested']??''],$template['text']??'');
        send_whatsapp(['recipientName'=>$lead['lead_name'],'recipientPhone'=>$lead['lead_phone'],'clientName'=>$client['name'],'leadId'=>$lead['id'],'templateId'=>$template['id'],'messageBody'=>$text],false,$key); return;
    }
    audit('Automatic greeting skipped for lead '.$lead['id'].': configure a LEAD_GREETING template with its approved Meta payload.');
}
function sync_facebook(?int $clientId=null): int {
    $c=integration('facebook',true); $count=0;
    $clients=$clientId?rows('SELECT * FROM clients WHERE id=?',[$clientId]):rows('SELECT * FROM clients WHERE fb_page_id IS NOT NULL');
    foreach($clients as $client) {
        if(empty($client['fb_page_id'])) fail('Connect a Facebook page to this client first.');
        $page=meta_request(rawurlencode($client['fb_page_id']).'?fields=id,name,category,followers_count',$c);
        $forms=[];$cursor=null;
        do { $formPage=meta_request(rawurlencode($client['fb_page_id']).'/leadgen_forms?fields=id,name,leads_count&limit=100'.($cursor?'&after='.rawurlencode($cursor):''),$c); $forms=array_merge($forms,$formPage['data']??[]); $cursor=isset($formPage['paging']['next'])?($formPage['paging']['cursors']['after']??null):null; } while($cursor);
        query('INSERT INTO facebook_pages(page_id,page_name,category,followers_count,lead_forms) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE page_name=VALUES(page_name),category=VALUES(category),followers_count=VALUES(followers_count),lead_forms=VALUES(lead_forms)',[$page['id'],$page['name'],$page['category']??'',(string)($page['followers_count']??''),json_encode(array_map(fn($f)=>['form_id'=>$f['id'],'form_name'=>$f['name'],'leads_count'=>$f['leads_count']??0],$forms))]);
        foreach($forms as $form) {
            if($client['fb_form_id'] && $client['fb_form_id']!==$form['id']) continue;
            $after=null;
            do {
                $result=meta_request(rawurlencode($form['id']).'/leads?fields=id,created_time,field_data,ad_id,ad_name,campaign_name&limit=100'.($after?'&after='.rawurlencode($after):''),$c);
                foreach($result['data']??[] as $lead) {
                    if(row('SELECT id FROM facebook_leads WHERE id=?',[$lead['id']])) continue;
                    $fields=[]; foreach($lead['field_data']??[] as $field) $fields[$field['name']]=implode(', ',$field['values']);
                    write_record('facebook_leads',['id'=>$lead['id'],'client_id'=>$client['id'],'fb_page_id'=>$page['id'],'form_id'=>$form['id'],'lead_name'=>$fields['full_name']??trim(($fields['first_name']??'').' '.($fields['last_name']??'')),'lead_phone'=>$fields['phone_number']??'','lead_email'=>$fields['email']??'','city'=>$fields['city']??'','ad_id'=>$lead['ad_id']??null,'ad_name'=>$lead['ad_name']??null,'campaign_name'=>$lead['campaign_name']??null,'created_time'=>$lead['created_time'],'custom_answers'=>array_map(fn($k,$v)=>['question'=>$k,'answer'=>$v],array_keys($fields),array_values($fields))]); $count++;
                    try { queue_greeting(row('SELECT * FROM facebook_leads WHERE id=?',[$lead['id']]),$client); } catch(Throwable $e) { audit('Automatic greeting failed for '.$lead['id'].': '.$e->getMessage()); }
                }
                $after=isset($result['paging']['next'])?($result['paging']['cursors']['after']??null):null;
            } while($after);
        }
    }
    return $count;
}
