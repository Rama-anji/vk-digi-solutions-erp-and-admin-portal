<?php
declare(strict_types=1);
require_once __DIR__.'/integrations.php';
header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
try {
    session_start_safe(); $_SESSION['csrf']??=bin2hex(random_bytes(32));
    $action=$_GET['action']??'session'; $method=$_SERVER['REQUEST_METHOD'];
    if($method==='GET' && $action==='session') {
        $admin=isset($_SESSION['admin_id'])?row("SELECT id,name,email,role FROM admins WHERE id=? AND status='Active'",[$_SESSION['admin_id']]):null;
        echo json_encode(['user'=>$admin,'csrf'=>$_SESSION['csrf']]); exit;
    }
    if($method==='POST') {
        if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) fail('Your session expired. Refresh and retry.',403);
        $input=str_starts_with($_SERVER['CONTENT_TYPE']??'','multipart/form-data')?$_POST:json_decode(file_get_contents('php://input'),true,512,JSON_THROW_ON_ERROR);
        if(!is_array($input)) fail('Invalid request.');
    } else $input=[];
    if($action==='login' && $method==='POST') {
        $attempts=$_SESSION['login_attempts']??[]; $attempts=array_filter($attempts,fn($t)=>$t>time()-300);
        if(count($attempts)>=8) fail('Too many login attempts. Try again in five minutes.',429);
        $admin=row("SELECT * FROM admins WHERE email=? AND status='Active'",[trim($input['email']??'')]);
        if(!$admin || !password_verify($input['password']??'',$admin['password'])) { $attempts[]=time(); $_SESSION['login_attempts']=$attempts; fail('Incorrect email or password.',401); }
        session_regenerate_id(true); $_SESSION['admin_id']=$admin['id']; $_SESSION['login_attempts']=[]; $_SESSION['csrf']=bin2hex(random_bytes(32));
        if(!empty($input['remember'])) setcookie(session_name(),session_id(),['expires'=>time()+604800,'path'=>'/','httponly'=>true,'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','samesite'=>'Lax']);
        unset($admin['password']); audit('Signed in');
        echo json_encode(['user'=>public_record($admin),'csrf'=>$_SESSION['csrf'],'data'=>boot_data()]); exit;
    }
    $admin=require_admin();
    if($method==='GET') {
        if($action==='bootstrap') { echo json_encode(['user'=>public_record($admin),'data'=>boot_data()]); exit; }
        if($action==='download') download_file($_GET['id']??0);
        fail('Unknown endpoint.',404);
    }
    if($method!=='POST') fail('Method not allowed.',405);
    if($action==='logout') { $_SESSION=[]; session_destroy(); echo '{"ok":true}'; exit; }
    $transaction=in_array($action,['renewal_prepare','subscription_reminder_test','save','delete','import','convert','renew','recurring','maintenance','page_mapping','hr_generate','payment_record','payment_allocate','payment_reconcile','payment_void'],true);
    if($transaction) db()->beginTransaction();
    $result=match($action) {
        'integration_check'=>check_integration($input),
        'integration_test_email'=>send_test_email($input),
        'payment_record'=>record_receipt($input),
        'payment_allocate','payment_reconcile','payment_void'=>update_receipt($action,$input),
        'save'=>save_resource($input['resource']??'',$input['data']??[],$input['id']??null),
        'delete'=>(function()use($input){delete_resource($input['resource']??'',$input['id']??null);return true;})(),
        'import'=>array_map(fn($record)=>save_resource($input['resource'],$record),$input['records']??[]),
        'convert'=>convert_quote($input['id']),
        'renew'=>complete_renewal($input),
        'renewal_prepare'=>prepare_renewal($input),
        'subscription_reminder_test'=>test_subscription_reminder($input,$admin),
        'recurring'=>run_recurring($input['id']??null),
        'maintenance'=>['renewals'=>renew_due_subscriptions(),'bills'=>run_recurring(),'reminders'=>queue_reminders()],
        'upload'=>upload_file(),
        'settings'=>save_settings($input['provider'],$input['data']),
        'whatsapp_send'=>send_whatsapp($input),
        'email_send'=>(function()use($input){
            $m=row("SELECT * FROM communications WHERE id=? AND channel='email'",[$input['id']]);if(!$m)fail('Email not found.',404);
            if($m['purpose']==='project_deadline' && isset($input['body']) && in_array($m['status'],['Queued','Failed'],true)) {
                $p=row('SELECT lead_email FROM projects WHERE id=?',[$m['project_id']]);
                if(!filter_var($p['lead_email']??'',FILTER_VALIDATE_EMAIL))fail('Save a valid project lead email first.');
                if(!is_string($input['body']) || trim($input['body'])==='' || strlen($input['body'])>100000)fail('Invalid deadline notification body.');
                query('UPDATE communications SET body=?,recipient_email=? WHERE id=?',[$input['body'],$p['lead_email'],$m['id']]);
            }
            return send_message($m['id']);
        })(),
        'email_batch'=>(function(){ $counts=['sent'=>0,'failed'=>0,'processing'=>0]; foreach(rows("SELECT id FROM communications WHERE channel='email' AND subscription_id IS NOT NULL AND status='Queued'") as $m) {try{send_message($m['id']);}catch(Throwable $error){} $status=row('SELECT status FROM communications WHERE id=?',[$m['id']])['status'];$counts[$status==='Sent'?'sent':($status==='Processing'?'processing':'failed')]++;}return $counts;})(),
        'facebook_sync'=>sync_facebook(isset($input['client_id'])?(int)$input['client_id']:null),
        'page_mapping'=>(function()use($input){$p=row('SELECT * FROM facebook_pages WHERE page_id=?',[$input['page_id']]);$forms=$p?json_value($p['lead_forms']):[];if(!empty($input['form_id']) && !in_array($input['form_id'],array_column($forms,'form_id'),true))$forms[]=['form_id'=>$input['form_id'],'form_name'=>$input['form_name']?:$input['form_id'],'leads_count'=>0];save_resource('facebookPages',['page_id'=>$input['page_id'],'page_name'=>$input['page_name'],'lead_forms'=>$forms],$p?$input['page_id']:null);return save_resource('clients',['fb_page_id'=>$input['page_id'],'fb_form_id'=>$input['form_id']?:null],$input['client_id']);})(),
        'vault_reveal'=>(function()use($input){$r=row('SELECT * FROM credential_vault WHERE id=?',[$input['id']]);if(!$r)fail('Credential not found.',404);audit('Revealed vault credential #'.$input['id']);return decrypt_secret($r['encrypted_password']);})(),
        'password'=>(function()use($input,$admin){$r=row('SELECT password FROM admins WHERE id=?',[$admin['id']]);if(!password_verify($input['current_password']??'',$r['password']))fail('Current password is incorrect.');if(strlen($input['new_password']??'')<12)fail('Use at least 12 characters.');query('UPDATE admins SET password=? WHERE id=?',[password_hash($input['new_password'],PASSWORD_DEFAULT),$admin['id']]);audit('Changed password');return true;})(),
        'hr_generate'=>save_resource('hrDocuments',$input['data']),
        default=>fail('Unknown action.',404)
    };
    if($transaction) db()->commit();
    foreach($GLOBALS['uploaded_files_to_remove']??[] as $key) {
        $root=realpath(__DIR__.'/../.storage/uploads');$path=$root?realpath($root.DIRECTORY_SEPARATOR.$key):false;
        if($root && $path && str_starts_with($path,$root.DIRECTORY_SEPARATOR) && is_file($path) && !unlink($path))error_log('Unable to remove deleted upload from storage.');
    }
    echo json_encode(['result'=>$result,'data'=>boot_data()],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
} catch(Throwable $error) {
    if(isset($transaction) && $transaction && db()->inTransaction()) db()->rollBack();
    if(($action??'')==='renew' && !empty($_SESSION['admin_id'])) { try { audit('Renewal failed for subscription #'.(int)($input['id']??0).': '.$error->getMessage()); } catch(Throwable $ignored) {} }
    $status=$error instanceof PDOException?422:(in_array($error->getCode(),[400,401,403,404,405,409,422,429,500,502],true)?$error->getCode():500);
    $message=$error->getMessage();
    if($error instanceof PDOException) {
        $code=(int)($error->errorInfo[1]??0);
        if(in_array($code,[2002,2006,2013],true))$status=503;
        $message=match($code){2002,2006,2013=>'The database is unavailable. Start MySQL in XAMPP, then retry.',1062=>'A record with this code or reference already exists.',1451=>'This record is used by another record. Remove its links or mark it inactive.',1452=>'A selected related record does not exist or belongs to a different client.',4025=>'One or more fields do not meet the database rules. Check dates, amounts, and required fields.',default=>'The record could not be saved. Check required fields and data types.'};
    }
    if($status>=500) error_log($error->__toString());
    http_response_code($status); echo json_encode(['error'=>$message]);
}
