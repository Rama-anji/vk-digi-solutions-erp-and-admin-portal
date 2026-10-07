<?php
/** Integration checks against a disposable MariaDB server only. No app DB writes. */
declare(strict_types=1);
$pdo = new PDO('mysql:host=127.0.0.1;port=33317;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$dataDir = str_replace('\\', '/', (string)$pdo->query('SELECT @@datadir')->fetchColumn());
if (!str_ends_with(rtrim($dataDir, '/'), '/.db-validation')) {
    throw new RuntimeException('Refusing to run outside the disposable .db-validation server.');
}
$dbName = 'vkd_schema_test_' . bin2hex(random_bytes(5));
$checks = 0;
function check(bool $condition, string $label): void {
    global $checks;
    if (!$condition) throw new RuntimeException('FAIL: ' . $label);
    $checks++;
}
function reject(callable $fn, string $label): void {
    try { $fn(); } catch (PDOException $error) {
        check(in_array((int)($error->errorInfo[1] ?? 0), [1062,1265,1366,1452,3819,4025], true), $label . ' uses expected constraint error: ' . $error->getMessage());
        return;
    }
    throw new RuntimeException('FAIL: accepted invalid data: ' . $label);
}
function insert(string $table, array $data): string {
    global $pdo;
    $columns = implode(',', array_map(fn($c) => '`' . $c . '`', array_keys($data)));
    $stmt = $pdo->prepare("INSERT INTO `$table` ($columns) VALUES (" . implode(',', array_fill(0, count($data), '?')) . ')');
    $stmt->execute(array_values($data));
    return $pdo->lastInsertId();
}
try {
    $sql = str_replace('`vkd_erp_v2`', '`' . $dbName . '`', file_get_contents(__DIR__ . '/../db.sql'));
    // Execute DDL as separate statements; comments are removed before splitting.
    $sql = preg_replace('/^--.*$/m', '', $sql);
    foreach (preg_split('/;\s*(?:\r?\n|$)/', trim($sql)) as $statement) {
        if (trim($statement) !== '') $pdo->exec($statement);
    }
    check((int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'")->fetchColumn() === 23, '23 base tables import');
    check((int)$pdo->query("SELECT COUNT(*) FROM information_schema.views WHERE table_schema=DATABASE()")->fetchColumn() === 11, '11 projections import');
    $pdo->beginTransaction();
    insert('facebook_pages', ['page_id'=>'page-1','page_name'=>'Page One','lead_forms'=>'[{"form_id":"form-1","form_name":"Enquiries","leads_count":10}]']);
    $client = ['client_code'=>'C1','name'=>'Client One','contact_person'=>'Contact','email'=>'client@example.test','mobile'=>'123','start_date'=>'2026-01-01','custom_fields'=>'[{"id":"c1","name":"GSTIN","value":"test"}]','fb_page_id'=>'page-1','fb_form_id'=>'form-1'];
    $clientId = insert('clients', $client);
    $otherClient = insert('clients', array_replace($client,['client_code'=>'C2','name'=>'Client Two']));
    reject(fn() => insert('clients',$client), 'duplicate client code');
    reject(fn() => insert('clients',array_replace($client,['client_code'=>'C3','custom_fields'=>'{}'])), 'custom fields require array');
    reject(fn() => insert('clients',array_replace($client,['client_code'=>'C4','custom_fields'=>'not-json'])), 'invalid JSON');
    $service = ['service_name'=>'Custom engagement','category'=>'Cybersecurity & Audit','default_rate'=>100,'billing_frequency'=>'Custom','custom_duration'=>'45 days','status'=>'Inactive'];
    $serviceId=insert('services_catalog',$service);
    reject(fn() => insert('services_catalog',array_replace($service,['custom_duration'=>null])), 'Custom duration required');
    $subId=insert('client_subscriptions',['client_id'=>$clientId,'service_id'=>$serviceId,'billing_cycle'=>'Custom','start_date'=>'2026-01-01','expiry_date'=>'2026-02-15','amount'=>100]);
    $quote=['quotation_number'=>'Q1','client_id'=>$clientId,'title'=>'Proposal','date'=>'2026-01-01','valid_until'=>'2026-02-01','status'=>'Approved','discount_amount'=>10,'gst_rate'=>18,'custom_fields'=>'[{"id":"f1","field_name":"Scope","field_value":"Audit"}]'];
    $quoteId=insert('quotations',$quote);
    $pendingQuote=insert('quotations',array_replace($quote,['quotation_number'=>'Q2','status'=>'Pending']));
    $invoice=['invoice_number'=>'I1','client_id'=>$clientId,'quotation_id'=>$quoteId,'due_date'=>'2026-02-01','created_at'=>'2026-01-01','gst_rate'=>18];
    $invoiceId=insert('invoices',$invoice);
    reject(fn() => insert('invoices',array_replace($invoice,['invoice_number'=>'I2'])), 'duplicate quotation conversion');
    reject(fn() => insert('invoices',array_replace($invoice,['invoice_number'=>'I3','client_id'=>$otherClient,'quotation_id'=>$pendingQuote])), 'cross-client quotation conversion');
    $item=['ui_id'=>'line-1','quotation_id'=>$quoteId,'position'=>0,'service_id'=>$serviceId,'service_name'=>'Agreed label','description'=>'Audit','quantity'=>2,'unit_price'=>50];
    insert('commercial_items',$item);
    insert('commercial_items',array_replace($item,['quotation_id'=>null,'invoice_id'=>$invoiceId,'hsn_sac'=>'9983']));
    reject(fn() => insert('commercial_items',array_replace($item,['ui_id'=>'bad','position'=>1,'invoice_id'=>$invoiceId])), 'item cannot belong to two documents');
    reject(fn() => insert('commercial_items',array_replace($item,['ui_id'=>'bad','position'=>1,'quotation_id'=>null])), 'item requires owner');
    reject(fn() => insert('commercial_items',$item), 'duplicate item per document');
    reject(fn() => insert('commercial_items',array_replace($item,['ui_id'=>'bad','position'=>1,'unit_price'=>-1])), 'negative item price');
    $qt=$pdo->query('SELECT * FROM v_quotations WHERE id='.$quoteId)->fetch(PDO::FETCH_ASSOC);
    check((float)$qt['subtotal']===100.0 && (float)$qt['gst_amount']===16.2 && (float)$qt['grand_total']===106.2, 'quotation discount and GST totals');
    check($qt['converted_invoice_number']==='I1', 'reverse conversion relation');
    check((float)$pdo->query('SELECT grand_total FROM v_invoices WHERE id='.$invoiceId)->fetchColumn()===118.0,'invoice totals');
    $pdo->exec('UPDATE invoices SET gst_rate=0 WHERE id='.$invoiceId);
    check((float)$pdo->query('SELECT grand_total FROM v_invoices WHERE id='.$invoiceId)->fetchColumn()===100.0,'zero GST supported');
    insert('payments_received',['invoice_id'=>$invoiceId,'amount_received'=>25,'payment_method'=>'Cash','payment_date'=>'2026-01-02']);
    check((string)$pdo->query('SELECT client_id FROM v_payments_received LIMIT 1')->fetchColumn()===$clientId,'payment client derived from invoice');
    reject(fn() => insert('payments_received',['invoice_id'=>$invoiceId,'unallocated_client_id'=>$otherClient,'amount_received'=>1,'payment_method'=>'Cash','payment_date'=>'2026-01-02']), 'no duplicated/conflicting payment owner');
    $vendorId=insert('vendors',['vendor_name'=>'Vendor','category'=>'Cloud Infrastructure','contact_person'=>'Support','phone'=>'123','email'=>'vendor@example.test']);
    $rec=['vendor_id'=>$vendorId,'expense_title'=>'Cloud','category'=>'Cloud Infrastructure','amount'=>100,'frequency'=>'Monthly','day_of_month'=>31,'next_run_date'=>'2026-01-31'];
    $recId=insert('recurring_vendor_expenses',$rec);
    reject(fn() => insert('recurring_vendor_expenses',array_replace($rec,['day_of_month'=>32])),'invalid recurrence day');
    $bill=['vendor_id'=>$vendorId,'project_name'=>'Cloud bill','total_amount'=>100,'advance_paid'=>40,'bill_date'=>'2026-01-31','recurring_expense_id'=>$recId,'recurrence_date'=>'2026-01-31'];
    $billId=insert('vendor_bills',$bill);
    reject(fn() => insert('vendor_bills',$bill),'duplicate recurring bill occurrence');
    $b=$pdo->query('SELECT * FROM vendor_bills WHERE id='.$billId)->fetch(PDO::FETCH_ASSOC);
    check((float)$b['pending_balance']===60.0 && $b['status']==='Partial','vendor balance and status generated');
    $pdo->exec('UPDATE vendor_bills SET advance_paid=120 WHERE id='.$billId);
    check((float)$pdo->query('SELECT pending_balance FROM vendor_bills WHERE id='.$billId)->fetchColumn()===0.0,'overpayment balance clamped like UI');
    $projectId=insert('projects',['project_title'=>'Project','client_id'=>$clientId,'assigned_to'=>'Team A','due_date'=>'2026-02-01','description'=>'Delivery','budget'=>200,'alert_threshold_days'=>7]);
    $taskId=insert('tasks',['project_id'=>$projectId,'task_title'=>'Task','assigned_to'=>'Team A','due_date'=>'2026-02-01','description'=>'Details','tags'=>'["UI","Backend"]','estimated_hours'=>2.5]);
    check((string)$pdo->query('SELECT client_id FROM v_tasks WHERE id='.$taskId)->fetchColumn()===$clientId,'task client joined through project');
    $empId=insert('employees',['emp_code'=>'E1','name'=>'Employee','email'=>'employee@example.test','phone'=>'123','designation'=>'Developer','department'=>'Engineering','joining_date'=>'2026-01-01','salary'=>50000]);
    $tableData=['id'=>'table-1','title'=>'Scope','headlineKicker'=>'SOW','description'=>'Details','theme'=>'navy','headlineAlign'=>'center','columns'=>[['id'=>'col1','header'=>'Work','width'=>'50%','align'=>'left']],'rows'=>[['id'=>'r1','isSectionHeadline'=>true,'headlineText'=>'Phase','headlineSubtitle'=>'One','headlineTheme'=>'blue','cells'=>['col1'=>['id'=>'cell1','content'=>'Audit','rowSpan'=>2,'colSpan'=>2,'isHeader'=>true,'align'=>'right','bold'=>true,'isMergedHidden'=>false]]]],'created_at'=>'2026-01-01','updated_at'=>'2026-01-02'];
    $doc=['ui_id'=>'file-1','client_id'=>$clientId,'project_id'=>$projectId,'file_name'=>'Scope','category'=>'Custom Table','file_type'=>'table','file_size'=>'1 KB','reference_type'=>'custom_table','document_data'=>json_encode($tableData)];
    $docId=insert('documents',$doc);
    check(json_decode($pdo->query('SELECT document_data FROM documents WHERE id='.$docId)->fetchColumn(),true)===$tableData,'all nested table data round-trips');
    reject(fn() => insert('documents',array_replace($doc,['ui_id'=>'file-2','client_id'=>$otherClient])),'file project belongs to same client');
    reject(fn() => insert('documents',array_replace($doc,['ui_id'=>'file-3','reference_type'=>null])),'custom table reference cannot be null');
    reject(fn() => insert('documents',array_replace($doc,['ui_id'=>'file-4','employee_id'=>$empId])),'file cannot have both client and employee owners');
    insert('documents',['employee_id'=>$empId,'category'=>'HR Document','doc_type'=>'Payslip','generated_date'=>'2026-01-31','document_data'=>'{"month":"January 2026","basic":25000,"deductions":2000}']);
    check((int)$pdo->query('SELECT COUNT(*) FROM hr_documents')->fetchColumn()===1,'shared HR document projection');
    insert('facebook_leads',['id'=>'lead-1','client_id'=>$clientId,'fb_page_id'=>'page-1','form_id'=>'form-1','lead_name'=>'Prospect','lead_phone'=>'123','lead_email'=>'lead@example.test','created_time'=>'2026-01-01','custom_answers'=>'[{"question":"Budget?","answer":"10K"}]']);
    insert('integration_settings',['provider'=>'whatsapp','config'=>'{"waba_id":"w1","phone_number_id":"p1","business_phone_number":"123","default_country_code":"91","auto_greeting_enabled":true,"webhook_status":"Pending","templates":[{"id":"t1","name":"hello","category":"CUSTOM","label":"Hello","text":"Hi"}]}','encrypted_secrets'=>'test-envelope-not-a-real-key']);
    reject(fn() => insert('integration_settings',['provider'=>'bad','config'=>'{"api_token":"plaintext"}']),'no plaintext secret in config');
    insert('communications',['id'=>'renew-1','channel'=>'email','purpose'=>'renewal','subscription_id'=>$subId,'body'=>'Reminder','status'=>'Sent','sent_at'=>'2026-01-01 12:00:00','deduplication_key'=>'renew-unique','context'=>'{"amount":100,"expiry_date":"2026-02-15"}']);
    check($pdo->query('SELECT email_status FROM v_subscriptions WHERE id='.$subId)->fetchColumn()==='Sent','renewal email status derived');
    insert('communications',['id'=>'deadline-1','channel'=>'email','purpose'=>'project_deadline','project_id'=>$projectId,'body'=>'Due','status'=>'Sent','sent_at'=>'2026-01-01 12:00:00','urgency'=>'warning']);
    check($pdo->query('SELECT alert_sent_at FROM v_projects WHERE id='.$projectId)->fetchColumn()==='2026-01-01 12:00:00','project alert timestamp derived');
    $wa=['id'=>'wa-1','channel'=>'whatsapp','purpose'=>'message','lead_id'=>'lead-1','recipient_phone'=>'123','body'=>'Hello','status'=>'Delivered','sent_at'=>'2026-01-01 12:00:00','provider_message_id'=>'wamid-1'];
    insert('communications',$wa);
    reject(fn() => insert('communications',array_replace($wa,['id'=>'wa-dupe'])),'duplicate provider webhook/message ID');
    check($pdo->query("SELECT whatsapp_status FROM v_facebook_leads WHERE id='lead-1'")->fetchColumn()==='Delivered','WhatsApp delivered status derived');
    insert('communications',array_replace($wa,['id'=>'wa-2','direction'=>'inbound','provider_message_id'=>'wamid-2']));
    check($pdo->query("SELECT whatsapp_status FROM v_facebook_leads WHERE id='lead-1'")->fetchColumn()==='Replied','WhatsApp reply status derived');
    foreach ($pdo->query("SELECT table_name FROM information_schema.views WHERE table_schema=DATABASE()")->fetchAll(PDO::FETCH_COLUMN) as $view) {
        $pdo->query("SELECT * FROM `$view` LIMIT 1")->fetchAll(); $checks++;
    }
    $pdo->rollBack();
    echo "PASS: $checks integration checks; 23 tables and 11 views on " . $pdo->query('SELECT VERSION()')->fetchColumn() . ".\n";
} finally {
    if ($pdo->inTransaction()) $pdo->rollBack();
    // Only our randomly named schema on the guarded disposable server.
    $pdo->exec("DROP DATABASE IF EXISTS `$dbName`");
}
