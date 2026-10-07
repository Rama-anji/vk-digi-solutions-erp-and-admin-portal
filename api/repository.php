<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
const RESOURCES=['clients'=>'clients','services'=>'services_catalog','subscriptions'=>'client_subscriptions','quotations'=>'quotations','invoices'=>'invoices','vendors'=>'vendors','vendorBills'=>'vendor_bills','recurringExpenses'=>'recurring_vendor_expenses','projects'=>'projects','tasks'=>'tasks','employees'=>'employees','infrastructure'=>'website_infrastructure','vault'=>'credential_vault','files'=>'documents','facebookLeads'=>'facebook_leads','facebookPages'=>'facebook_pages','hrDocuments'=>'documents','payments'=>'payments_received'];
function resource_table(string $resource): string { return RESOURCES[$resource]??fail('Unknown resource.',404); }
function field_metadata(string $table): array {
    static $cache=[];
    return $cache[$table]??=array_column(rows('SELECT COLUMN_NAME,DATA_TYPE,IS_NULLABLE,EXTRA FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?',[$table]),null,'COLUMN_NAME');
}
function write_record(string $table,array $data,mixed $id=null,string $key='id'): mixed {
    $meta=field_metadata($table); $values=[];
    foreach($data as $field=>$value) {
        if(!isset($meta[$field]) || $field===$key || str_contains($meta[$field]['EXTRA'],'GENERATED')) continue;
        if(is_array($value)) $value=json_encode($value,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        if(is_bool($value)) $value=(int)$value;
        if($value==='' && $meta[$field]['IS_NULLABLE']==='YES') $value=null;
        if($value!==null && in_array($meta[$field]['DATA_TYPE'],['datetime','timestamp'],true)) $value=date('Y-m-d H:i:s',strtotime((string)$value) ?: time());
        if($value!==null && in_array($meta[$field]['DATA_TYPE'],['date'],true)) { if(!preg_match('/^\d{4}-\d{2}-\d{2}/',(string)$value)) fail('Invalid date: '.$field); $value=substr((string)$value,0,10); }
        $values[$field]=$value;
    }
    if($id!==null) {
        if(!row("SELECT `$key` FROM `$table` WHERE `$key`=? FOR UPDATE",[$id])) fail('Record not found.',404);
        if($values) query("UPDATE `$table` SET ".implode(',',array_map(fn($f)=>"`$f`=?",array_keys($values)))." WHERE `$key`=?",[...array_values($values),$id]);
    } else {
        if($key!=='id' && isset($data[$key])) $values[$key]=$data[$key];
        if($key==='id' && in_array($table,['facebook_leads','communications'],true)) $values['id']=$data['id']??bin2hex(random_bytes(12));
        query("INSERT INTO `$table` (".implode(',',array_map(fn($f)=>"`$f`",array_keys($values))).') VALUES ('.implode(',',array_fill(0,count($values),'?')).')',array_values($values));
        $id=$values[$key]??db()->lastInsertId();
    }
    return $id;
}
function collection(string $resource): array {
    $table=resource_table($resource);
    $sql=match($resource) {
        'clients'=>"SELECT c.*,p.page_name AS fb_page_name,p.lead_forms FROM clients c LEFT JOIN facebook_pages p ON p.page_id=c.fb_page_id",
        'subscriptions'=>'SELECT * FROM v_subscriptions', 'quotations'=>'SELECT * FROM v_quotations',
        'invoices'=>"SELECT i.*,COALESCE(p.receipt_count,0) AS receipt_count, CASE WHEN p.receipt_count>0 THEN p.received ELSE IF(i.payment_status='Paid',i.grand_total,0) END AS amount_received, GREATEST(i.grand_total-CASE WHEN p.receipt_count>0 THEN p.received ELSE IF(i.payment_status='Paid',i.grand_total,0) END,0) AS balance_due FROM v_invoices i LEFT JOIN (SELECT invoice_id,COUNT(*) AS receipt_count, SUM(IF(voided_at IS NULL,amount_received,0)) AS received FROM payments_received WHERE invoice_id IS NOT NULL GROUP BY invoice_id) p ON p.invoice_id=i.id",
        'projects'=>'SELECT * FROM v_projects', 'tasks'=>'SELECT * FROM v_tasks', 'facebookLeads'=>'SELECT * FROM v_facebook_leads',
        'vendorBills'=>'SELECT b.*,v.vendor_name FROM vendor_bills b JOIN vendors v ON v.id=b.vendor_id',
        'recurringExpenses'=>'SELECT e.*,v.vendor_name FROM recurring_vendor_expenses e JOIN vendors v ON v.id=e.vendor_id',
        'files'=>"SELECT d.*,c.name AS client_name,p.project_title AS project_name,q.quotation_number,inv.invoice_number FROM documents d JOIN clients c ON c.id=d.client_id LEFT JOIN projects p ON p.id=d.project_id LEFT JOIN quotations q ON q.id=d.quotation_id LEFT JOIN invoices inv ON inv.id=d.invoice_id WHERE d.category<>'HR Document'",
        'hrDocuments'=>"SELECT d.*,e.name AS employee_name FROM documents d JOIN employees e ON e.id=d.employee_id WHERE d.category='HR Document'",
        'payments'=>'SELECT * FROM v_payments_received', default=>"SELECT * FROM `$table`"
    };
    $records=array_map('public_record',rows($sql));
    if(in_array($resource,['quotations','invoices'],true)) {
        $owner=$resource==='quotations'?'quotation_id':'invoice_id';
        $items=rows("SELECT * FROM commercial_items WHERE $owner IS NOT NULL ORDER BY position");
        $groups=[];
        foreach($items as $i) { $i=public_record($i); $key=$i[$owner]; $i['id']=$i['ui_id']; $i['quantity']=(float)$i['quantity']; $i['unit_price']=(float)$i['unit_price'];
            if($resource==='invoices') $i=['id'=>$i['id'],'desc'=>$i['description'],'qty'=>$i['quantity'],'rate'=>$i['unit_price'],'hsn_sac'=>$i['hsn_sac']??''];
            $groups[$key][]=$i;
        }
        foreach($records as &$r) $r['items']=$groups[$r['id']]??[];
        unset($r);
    }
    $pages=$resource==='facebookLeads'?array_column(rows('SELECT * FROM facebook_pages'),null,'page_id'):[];
    foreach($records as &$r) {
        if($resource==='invoices') $r['created_at']=substr($r['created_at'],0,10);
        foreach(['city','address','source','notes','description','bank_details','services_offered'] as $k) if(array_key_exists($k,$r) && $r[$k]===null) $r[$k]='';
        foreach(['custom_fields','custom_answers','tags'] as $k) if(array_key_exists($k,$r) && $r[$k]===null) $r[$k]=[];
        if($resource==='clients') { $r['fb_form_name']=''; foreach($r['lead_forms']??[] as $f) if($f['form_id']===$r['fb_form_id']) $r['fb_form_name']=$f['form_name']; unset($r['lead_forms']); }
        if($resource==='facebookLeads') { $r['form_name']=''; foreach(json_value($pages[$r['fb_page_id']]['lead_forms']??'[]') as $f) if($f['form_id']===$r['form_id']) $r['form_name']=$f['form_name']; }
        if($resource==='files') {
            $r['_db_id']=$r['id']; $r['id']=$r['ui_id']; $r['table_data']=$r['document_data'];
            $r['reference_id']=$r['quotation_number']??$r['invoice_number']??($r['document_data']['id']??null);
            $r['file_url']=!empty($r['file_url'])?'./api/index.php?action=download&id='.urlencode((string)$r['_db_id']):'';
            unset($r['document_data']);
        }
        if($resource==='vault') { unset($r['encrypted_password']); $r['has_password']=true; }
    }
    unset($r);
    if($resource==='subscriptions')$records=enrich_subscriptions($records);
    return array_reverse($records);
}
function find_record(string $resource,mixed $id): array { foreach(collection($resource) as $r) if((string)($r['id']??$r['page_id'])===(string)$id) return $r; fail('Record not found.',404); }
function save_resource(string $resource,array $data,mixed $id=null): array {
    $table=resource_table($resource);
    if($resource==='subscriptions')$data=validate_subscription($data,$id);
    if($resource==='invoices' && $id && row('SELECT id FROM subscription_renewals WHERE invoice_id=?',[$id])) {
        foreach(['client_id','gst_rate','discount_amount','items','total_amount','payment_status'] as $field)if(array_key_exists($field,$data))fail('Renewal invoice financial fields are fixed. Use receipts to record or void payment.');
    }
    $assignment=$resource==='services'?($data['client_assignment']??null):null;
    unset($data['client_assignment']);
    if($assignment!==null) {
        if($id || !is_array($assignment))fail('Client assignment is only available when creating a service.');
        if(($data['status']??'Active')!=='Active')fail('Only active catalogue services can be assigned.');
        if(!row('SELECT id FROM clients WHERE id=?',[$assignment['client_id']??0]))fail('Choose an existing client.');
        foreach(['start_date','expiry_date'] as $field) {
            $value=$assignment[$field]??'';
            $date=is_string($value)?DateTimeImmutable::createFromFormat('!Y-m-d',$value):false;
            if(!$date || $date->format('Y-m-d')!==$value)fail('Enter valid service start and end dates.');
        }
        if($assignment['expiry_date']<$assignment['start_date'])fail('Service end date must be on or after the start date.');
    }
    if($resource==='payments')fail('Use the receipt workflow to record or update payments.');
    $hasReceipts=false;
    if($resource==='invoices' && $id) {
        $current=row('SELECT * FROM invoices WHERE id=? FOR UPDATE',[$id]);
        $hasReceipts=(bool)row('SELECT id FROM payments_received WHERE invoice_id=? LIMIT 1',[$id]);
        if($hasReceipts && isset($data['client_id']) && (int)$data['client_id']!==(int)$current['client_id'])fail('An invoice with receipts cannot be moved to another client.');
        if($hasReceipts && isset($data['payment_status']) && $data['payment_status']!==$current['payment_status'])fail('Payment status is calculated from receipts. Record or void a receipt instead.');
    }
    if($resource==='vendorBills') {
        $current=$id?row('SELECT total_amount,advance_paid FROM vendor_bills WHERE id=?',[$id]):[];
        $values=array_merge($current,$data);
        if((float)($values['advance_paid']??0)>(float)($values['total_amount']??0))fail('Advance paid cannot exceed the total bill amount.');
    }
    if(in_array($resource,['services','subscriptions'],true)) {
        $current=$id?row("SELECT * FROM `$table` WHERE id=?",[$id]):[]; $values=array_merge($current,$data);
        if(($values[$resource==='services'?'billing_frequency':'billing_cycle']??'')==='Custom' && !preg_match('/^\s*([1-9][0-9]*)\s*(day|week|month|year)s?\s*$/i',$values['custom_duration']??''))fail('Enter a custom duration such as 45 days or 2 months.');
    }
    $currentFile=[];
    if($resource==='files' && $id!==null) { $currentFile=row('SELECT * FROM documents WHERE ui_id=?',[$id]); $id=$currentFile['id']??fail('File not found.',404); }
    if($resource==='files') {
        $data['ui_id']=$currentFile['ui_id']??$data['id']??'file-'.bin2hex(random_bytes(12));
        if(array_key_exists('table_data',$data))$data['document_data']=$data['table_data'];
        if(!$id)$data['uploaded_by']=row('SELECT name FROM admins WHERE id=?',[$_SESSION['admin_id']??0])['name']??'System';
        else unset($data['uploaded_by'],$data['uploaded_at']);
        if(isset($data['document_data']) && ($data['reference_type']??$currentFile['reference_type']??'')==='custom_table') {
            $previous=json_value($currentFile['document_data']??'null');
            if($previous) { $data['document_data']['id']=$previous['id']; $data['document_data']['created_at']=$previous['created_at']; }
            $data['file_size']=number_format(strlen(json_encode($data['document_data']))/1024,1).' KB';
        }
        if(isset($data['client_id']) && $currentFile && (int)$data['client_id']!==(int)$currentFile['client_id'])$data['project_id']=$data['project_id']??null;
        unset($data['id'],$data['file_url'],$data['_db_id']);
        if(!$id && !in_array($data['category']??'',['Custom Table','Quotation','Invoice'],true)) fail('Choose an actual file to upload.');
        foreach(['quotation','invoice'] as $kind) if(($data['reference_type']??'')===$kind) $data[$kind.'_id']=row("SELECT id FROM {$kind}s WHERE {$kind}_number=?",[$data['reference_id']??''])['id']??fail('Referenced document was not found.');
    }
    if($resource==='hrDocuments') { $data['category']='HR Document'; $data['generated_date']=$data['generated_date']??date('Y-m-d'); }
    if($resource==='vault') {
        if(!empty($data['password'])) $data['encrypted_password']=encrypt_secret(['password'=>$data['password']]);
        elseif(!$id) fail('Enter a credential password.');
        else unset($data['encrypted_password']);
    }
    if($resource==='clients' && (array_key_exists('fb_form_id',$data) || array_key_exists('fb_page_id',$data))) {
        $current=$id?row('SELECT fb_page_id,fb_form_id FROM clients WHERE id=?',[$id]):[];
        $mapping=array_merge($current,$data);
        if(!empty($mapping['fb_form_id'])) validate_form($mapping['fb_page_id']??'', $mapping['fb_form_id']);
    }
    if($resource==='facebookLeads') { $current=$id?row('SELECT fb_page_id,form_id FROM facebook_leads WHERE id=?',[$id]):[]; validate_form($data['fb_page_id']??$current['fb_page_id']??'', $data['form_id']??$current['form_id']??''); }
    if($resource==='facebookPages') {
        $seen=[]; foreach($data['lead_forms']??[] as $f) { if(empty($f['form_id']) || empty($f['form_name']) || isset($seen[$f['form_id']])) fail('Each lead form needs a unique ID and name.'); $seen[$f['form_id']]=true; }
    }
    if($resource==='tasks' && isset($data['status'])) {
        $current=$id?row('SELECT status,completed_at FROM tasks WHERE id=?',[$id]):[];
        $data['completed_at']=$data['status']==='Completed'?(($current['status']??'')==='Completed'?$current['completed_at']:date('Y-m-d H:i:s')):null;
    }
    if($resource==='invoices') {
        if(isset($data['quotation_ref'])) $data['quotation_id']=$data['quotation_ref']? (row('SELECT id FROM quotations WHERE quotation_number=?',[$data['quotation_ref']])['id']??fail('Quotation reference does not exist.')):null;
        if(!$id) $data['created_at']=$data['created_at']??date('Y-m-d');
    }
    if($resource==='subscriptions' && ($data['billing_cycle']??'')==='Custom' && empty($data['custom_duration']) && !$id) fail('Enter a custom duration such as 45 days or 2 months.');
    $items=$data['items']??null;
    if(in_array($resource,['quotations','invoices'],true) && !$id && !$items) {
        if($resource==='invoices' && isset($data['total_amount'])) $items=[['desc'=>$data['notes']??'Imported invoice total','qty'=>1,'rate'=>$data['total_amount']]];
        else fail('Add at least one line item.');
    }
    $newId=write_record($table,$data,$id,$resource==='facebookPages'?'page_id':'id');
    if($assignment!==null) {
        save_resource('subscriptions',[
            'client_id'=>$assignment['client_id'],'service_id'=>$newId,
            'billing_cycle'=>$data['billing_frequency'],'custom_duration'=>$data['custom_duration']??null,
            'start_date'=>$assignment['start_date'],'expiry_date'=>$assignment['expiry_date'],
            'amount'=>$data['default_rate'],'status'=>'Active',
            'auto_renew'=>$data['billing_frequency']!=='One-Time' && !empty($assignment['auto_renew'])
        ]);
    }
    if($items!==null && in_array($resource,['quotations','invoices'],true)) {
        if(!count($items)) fail('Add at least one line item.');
        $owner=$resource==='quotations'?'quotation_id':'invoice_id';
        query("DELETE FROM commercial_items WHERE $owner=?",[$newId]);
        foreach($items as $position=>$item) {
            $item['ui_id']=(string)($item['id']??bin2hex(random_bytes(8))); unset($item['id']);
            $item[$owner]=$newId; $item['position']=$position;
            if($resource==='invoices') { $item['description']=$item['desc']??''; $item['quantity']=$item['qty']??1; $item['unit_price']=$item['rate']??0; }
            if(trim($item['description']??'')==='') fail('Every line needs a description.');
            if(($item['quantity']??0)<=0) fail('Line quantities must be greater than zero.');
            if(empty($item['service_id'])) $item['service_id']=null;
            write_record('commercial_items',$item);
        }
    }
    if($resource==='invoices' && $hasReceipts)sync_receipt_status($newId);
    if(in_array($resource,['quotations','invoices'],true)) index_commercial_file($resource,$newId);
    audit(($id?'Updated ':'Created ').$resource.' #'.$newId);
    return find_record($resource,$resource==='files'?row('SELECT ui_id FROM documents WHERE id=?',[$newId])['ui_id']:$newId);
}
function validate_form(string $pageId,string $formId): void {
    $p=row('SELECT lead_forms FROM facebook_pages WHERE page_id=?',[$pageId]);
    foreach(json_value($p['lead_forms']??'[]') as $f) if($f['form_id']===$formId) return;
    fail('Choose a form belonging to the selected Facebook page.');
}
function index_commercial_file(string $resource,mixed $id): void {
    $kind=$resource==='invoices'?'invoice':'quotation'; $r=row("SELECT * FROM `$resource` WHERE id=?",[$id]);
    $existing=row("SELECT id FROM documents WHERE {$kind}_id=?",[$id]);
    write_record('documents',['ui_id'=>$kind.'-'.$id,'client_id'=>$r['client_id'],'file_name'=>ucfirst($kind).'_'.$r[$kind.'_number'].'.pdf','category'=>ucfirst($kind),'file_type'=>'pdf','reference_type'=>$kind,$kind.'_id'=>$id,'project_id'=>null,'file_size'=>'Generated','tag'=>'Commercial document'],$existing['id']??null);
}
function delete_resource(string $resource,mixed $id): void {
    if($resource==='payments')fail('Void a receipt with a reason; payment history cannot be deleted.');
    if($resource==='subscriptions'){
        $sub=locked_subscription($id);
        if($sub['status']!=='Cancelled' || $sub['payment_status']==='Paid' || row('SELECT id FROM subscription_renewals WHERE subscription_id=?',[$id]) || row('SELECT id FROM communications WHERE subscription_id=?',[$id]))fail('This subscription is active, paid or has history. Cancel it and retain its records instead of deleting it.');
    }
    if($resource==='invoices' && row('SELECT id FROM subscription_renewals WHERE invoice_id=?',[$id]))fail('Renewal invoices are part of subscription history and cannot be deleted.');
    $table=resource_table($resource); $key=$resource==='facebookPages'?'page_id':'id';
    if($resource==='files') $id=row('SELECT id FROM documents WHERE ui_id=?',[$id])['id']??fail('File not found.',404);
    if(!row("SELECT `$key` FROM `$table` WHERE `$key`=? FOR UPDATE",[$id])) fail('Record not found.',404);
    if(in_array($resource,['quotations','invoices'],true)) {
        $kind=$resource==='invoices'?'invoice':'quotation';
        if($kind==='quotation' && row('SELECT id FROM invoices WHERE quotation_id=?',[$id])) fail('This quotation has an invoice. Delete the invoice first.');
        if($kind==='invoice' && row('SELECT id FROM payments_received WHERE invoice_id=?',[$id])) fail('This invoice has recorded payments. Remove or reallocate them first.');
        query("DELETE FROM documents WHERE {$kind}_id=?",[$id]); query("DELETE FROM commercial_items WHERE {$kind}_id=?",[$id]);
    }
    if($resource==='projects') { query('DELETE FROM tasks WHERE project_id=?',[$id]); query('UPDATE documents SET project_id=NULL WHERE project_id=?',[$id]); query('DELETE FROM communications WHERE project_id=?',[$id]); }
    if($resource==='recurringExpenses') query('UPDATE vendor_bills SET recurring_expense_id=NULL,recurrence_date=NULL WHERE recurring_expense_id=?',[$id]);
    if($resource==='files') { $file=row("SELECT file_url FROM `$table` WHERE `$key`=?",[$id]); if(!empty($file['file_url']))$GLOBALS['uploaded_files_to_remove'][]=$file['file_url']; }
    query("DELETE FROM `$table` WHERE `$key`=?",[$id]); audit('Deleted '.$resource.' #'.$id);
}
require_once __DIR__.'/payments.php';
require_once __DIR__.'/subscriptions.php';
function boot_data(): array {
    $result=[]; foreach(RESOURCES as $resource=>$table) $result[$resource]=collection($resource);
    $heartbeat=__DIR__.'/../.storage/automation-status.json';
    $result['automation']=is_file($heartbeat)?(json_decode(file_get_contents($heartbeat),true)?:[]):[];
    $result['automation']['healthy']=!empty($result['automation']['completed_at']) && time()-strtotime($result['automation']['completed_at'])<180 && ($result['automation']['status']??'')==='ok';
    $result['whatsAppConfig']=array_merge(['waba_id'=>'','phone_number_id'=>'','business_phone_number'=>'','api_token'=>'','webhook_verify_token'=>'','default_country_code'=>'91','auto_greeting_enabled'=>false,'webhook_status'=>'Disconnected','templates'=>[]],integration('whatsapp'));
    $result['settings']=[]; foreach(['company','smtp','facebook','whatsapp'] as $p) $result['settings'][$p]=integration($p);
    $result['integrationChecks']=[];foreach(['smtp','facebook','whatsapp'] as $p)$result['integrationChecks'][$p]=integration('check_'.$p);
    $result['whatsAppLogs']=[]; $result['emailNotifications']=[]; $result['projectNotifications']=[];
    foreach(rows('SELECT * FROM communications ORDER BY triggered_at DESC') as $m) {
        $m=public_record($m);
        if($m['purpose']==='project_deadline') $result['projectNotifications'][]=$m;
        if($m['channel']==='whatsapp') {
            $m['message_body']=$m['body'];
            if($m['lead_id']) $m['client_id']=row('SELECT client_id FROM facebook_leads WHERE id=?',[$m['lead_id']])['client_id']??null;
            $m['client_name']=$m['client_id']?(row('SELECT name FROM clients WHERE id=?',[$m['client_id']])['name']??''):'';
            $result['whatsAppLogs'][]=$m;
        }
        if($m['channel']==='email' && $m['subscription_id']) { $m=array_merge($m['context']??[],$m); $m['body_text']=$m['body']; $m['simulated_delivery_id']=$m['provider_message_id']; $m['client_id']=(int)(row('SELECT client_id FROM client_subscriptions WHERE id=?',[$m['subscription_id']])['client_id']??0); $result['emailNotifications'][]=$m; }
    }
    $result['activityLogs']=rows('SELECT l.*,a.name AS user_name FROM activity_logs l LEFT JOIN admins a ON a.id=l.user_id ORDER BY l.id DESC LIMIT 100');
    $subs=$result['subscriptions'];
    $result['subscriptionSummary']=['all'=>count($subs),'expiring'=>count(array_filter($subs,fn($s)=>$s['status']==='Expiring Soon')),'expired'=>count(array_filter($subs,fn($s)=>$s['status']==='Expired')),'active'=>count(array_filter($subs,fn($s)=>in_array($s['status'],['Active','Expiring Soon'],true))),'queuedEmails'=>(int)query("SELECT COUNT(*) FROM communications WHERE channel='email' AND subscription_id IS NOT NULL AND status='Queued'")->fetchColumn()];
    $result['serverTime']=date(DATE_ATOM); return $result;
}
