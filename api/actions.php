<?php
declare(strict_types=1);
require_once __DIR__.'/repository.php';
function convert_quote(mixed $id): array {
    $q=row('SELECT * FROM quotations WHERE id=? FOR UPDATE',[$id]); if(!$q) fail('Quotation not found.',404);
    $existing=row('SELECT id FROM invoices WHERE quotation_id=?',[$id]);
    if($existing) return ['invoice'=>find_record('invoices',$existing['id']),'quotation'=>find_record('quotations',$id)];
    $full=find_record('quotations',$id); if(!$full['items']) fail('Quotation has no items.');
    query("UPDATE quotations SET status='Approved' WHERE id=?",[$id]);
    $items=array_map(fn($item)=>['id'=>$item['id'],'desc'=>$item['description'],'qty'=>$item['quantity'],'rate'=>$item['unit_price']],$full['items']);
    $invoice=save_resource('invoices',['invoice_number'=>'INV-'.date('Y').'-'.strtoupper(bin2hex(random_bytes(4))),'client_id'=>$q['client_id'],'quotation_id'=>$id,'due_date'=>date('Y-m-d',strtotime('+15 days')),'created_at'=>date('Y-m-d'),'gst_rate'=>$q['gst_rate'],'discount_amount'=>$q['discount_amount'],'notes'=>'Converted from '.$q['quotation_number'],'items'=>$items]);
    foreach($full['items'] as $item) {
        if(empty($item['service_id']) || ($item['billing_cycle']??'One-Time')==='One-Time') continue;
        $cycle=$item['billing_cycle']??'Monthly'; $start=$item['start_date']?:$q['date'];
        save_resource('subscriptions',['client_id'=>$q['client_id'],'service_id'=>$item['service_id'],'billing_cycle'=>$cycle,'custom_duration'=>$item['custom_duration']??null,'start_date'=>$start,'expiry_date'=>advance_date($start,$cycle,$item['custom_duration']??null),'amount'=>$item['amount'],'status'=>'Active','auto_renew'=>true]);
    }
    return ['invoice'=>$invoice,'quotation'=>find_record('quotations',$id)];
}
function run_recurring(mixed $id=null): int {
    $due=$id?rows('SELECT * FROM recurring_vendor_expenses WHERE id=? FOR UPDATE',[$id]):rows('SELECT * FROM recurring_vendor_expenses WHERE auto_entry_enabled=1 AND next_run_date<=CURRENT_DATE FOR UPDATE');
    $count=0;
    foreach($due as $r) {
        if($r['next_run_date']>date('Y-m-d')) { if($id) fail('The next bill is due on '.$r['next_run_date'].'.'); continue; }
        $existing=row('SELECT id FROM vendor_bills WHERE recurring_expense_id=? AND recurrence_date=?',[$r['id'],$r['next_run_date']]);
        if(!$existing) { save_resource('vendorBills',['vendor_id'=>$r['vendor_id'],'project_name'=>$r['expense_title'].' ('.$r['next_run_date'].')','total_amount'=>$r['amount'],'advance_paid'=>0,'bill_date'=>date('Y-m-d'),'recurring_expense_id'=>$r['id'],'recurrence_date'=>$r['next_run_date']]); $count++; }
        query('UPDATE recurring_vendor_expenses SET next_run_date=?,last_generated_date=CURRENT_DATE WHERE id=?',[advance_date($r['next_run_date'],$r['frequency'],null,(int)$r['day_of_month']),$r['id']]);
    }
    return $count;
}
function queue_reminders(): int {
    $count=0;
    foreach(collection('subscriptions') as $s) {
        if($s['status']==='Cancelled' || $s['days_remaining']>15)continue;
        $key='renewal:'.$s['id'].':'.$s['expiry_date'];
        if(row('SELECT id FROM communications WHERE deduplication_key=?',[$key]))continue;
        queue_subscription_notice($s['id'],'reminder',$key);$count++;
    }
    foreach(rows("SELECT * FROM v_projects WHERE deadline_alerts_enabled=1 AND status<>'Completed' AND DATEDIFF(due_date,CURRENT_DATE)<=alert_threshold_days") as $p) {
        $key='project:'.$p['id'].':'.$p['due_date']; if(row('SELECT id FROM communications WHERE deduplication_key=?',[$key])) continue;
        write_record('communications',['id'=>'deadline-'.bin2hex(random_bytes(8)),'channel'=>'email','purpose'=>'project_deadline','project_id'=>$p['id'],'recipient_name'=>$p['assigned_to'],'recipient_email'=>$p['lead_email'],'subject'=>'Project deadline: '.$p['project_title'],'body'=>"{$p['project_title']} for {$p['client_name']} is due on {$p['due_date']}. Assigned to {$p['assigned_to']}.",'context'=>$p,'deduplication_key'=>$key]); $count++;
    }
    return $count;
}
function upload_file(): array {
    $file=$_FILES['file']??null; if(!$file || $file['error']!==UPLOAD_ERR_OK) fail('Choose a file up to 20 MB. Upload did not complete.');
    if($file['size']>20*1024*1024 || $file['size']<=0) fail('Files must be between 1 byte and 20 MB.');
    $ext=strtolower(pathinfo($file['name'],PATHINFO_EXTENSION));
    $allowed=['pdf','doc','docx','xls','xlsx','csv','txt','png','jpg','jpeg','gif','webp','zip']; if(!in_array($ext,$allowed,true)) fail('Unsupported file format.');
    $client=(int)($_POST['client_id']??0); if(!row('SELECT id FROM clients WHERE id=?',[$client])) fail('Choose a client.');
    $dir=__DIR__.'/../.storage/uploads'; if(!is_dir($dir)) mkdir($dir,0700,true);
    $key=bin2hex(random_bytes(24)).'.'.$ext;
    if(!move_uploaded_file($file['tmp_name'],$dir.'/'.$key)) fail('Could not store upload.',500);
    try {
        $id=write_record('documents',['ui_id'=>'file-'.bin2hex(random_bytes(12)),'client_id'=>$client,'project_id'=>$_POST['project_id']?:null,'notes'=>trim($_POST['notes']??''),'file_name'=>basename(trim($_POST['file_name']??'')?:$file['name']),'category'=>'Uploaded Document','file_type'=>in_array($_POST['file_type']??'', ['pdf','doc','docx','xls','xlsx','image','other'],true)?$_POST['file_type']: (in_array($ext,['png','jpg','jpeg','gif','webp'],true)?'image':(in_array($ext,['pdf','doc','docx','xls','xlsx'],true)?$ext:'other')),'file_size'=>number_format($file['size']/1024,1).' KB','uploaded_by'=>require_admin()['name'],'reference_type'=>'upload','file_url'=>$key,'tag'=>$_POST['tag']??'']);
        audit('Uploaded file #'.$id); return find_record('files',row('SELECT ui_id FROM documents WHERE id=?',[$id])['ui_id']);
    } catch(Throwable $e) { unlink($dir.'/'.$key); throw $e; }
}
function download_file(mixed $id): never {
    $d=row('SELECT * FROM documents WHERE id=?',[$id]); if(!$d || !$d['file_url']) fail('Uploaded file not found.',404);
    $dir=realpath(__DIR__.'/../.storage/uploads'); $file=realpath($dir.DIRECTORY_SEPARATOR.$d['file_url']);
    if(!$file || !$dir || !str_starts_with($file,$dir.DIRECTORY_SEPARATOR) || !is_file($file)) fail('File not found.',404);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file); $inline=isset($_GET['inline']) && in_array($mime,['application/pdf','image/png','image/jpeg','image/gif','image/webp'],true);
    session_write_close(); header('Content-Type: '.($inline?$mime:'application/octet-stream')); header('Content-Length: '.filesize($file)); header("Content-Disposition: ".($inline?'inline':'attachment')."; filename*=UTF-8''".rawurlencode($d['file_name'])); header('X-Content-Type-Options: nosniff'); readfile($file); exit;
}
