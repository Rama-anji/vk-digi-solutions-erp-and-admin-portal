<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once __DIR__.'/../api/actions.php';
if (config()['database'] !== 'vkd_erp_v2') throw new RuntimeException('Unexpected database.');
// Stable markers make reruns additive: existing demo edits and real records survive.
function demo(string $resource, string $key, array $data): array {
    foreach(collection($resource) as $record) if (($record[$key]??null)===$data[$key]) return $record;
    return save_resource($resource,$data);
}
$today=date('Y-m-d');
$day=fn(string $offset)=>date('Y-m-d',strtotime($offset));
try {
    db()->beginTransaction();
    $service=demo('services','service_name',['service_name'=>'DEMO Website Care','category'=>'Technical Consulting','default_rate'=>2500,'billing_frequency'=>'Monthly','description'=>'Website maintenance and support (demo)','status'=>'Active']);
    demo('services','service_name',['service_name'=>'DEMO Custom Campaign','category'=>'Technical Consulting','default_rate'=>12000,'billing_frequency'=>'Custom','custom_duration'=>'45 days','description'=>'45-day campaign (demo)','status'=>'Active']);
    $page=demo('facebookPages','page_id',['page_id'=>'demo-business-page','page_name'=>'DEMO Business Page','category'=>'Demo','followers_count'=>'120','lead_forms'=>[['form_id'=>'demo-enquiry','form_name'=>'Demo Enquiry','leads_count'=>3]]]);
    foreach(['Aster Retail','Bluebird Studio','Cedar Consulting'] as $i=>$name) {
        $n=$i+1;
        $client=demo('clients','client_code',['client_code'=>'DEMO-00'.$n,'name'=>'DEMO '.$name,'client_type'=>'Corporate','contact_person'=>['Aarav Shah','Meera Rao','Rohan Das'][$i],'email'=>'demo'.$n.'@example.invalid','mobile'=>'0000000000','city'=>['Mumbai','Pune','Bengaluru'][$i],'address'=>'Demo business address','source'=>'Demo dataset','status'=>'Active','start_date'=>$day('-60 days'),'notes'=>'Fictional demo record for local testing.','fb_page_id'=>$page['page_id'],'fb_form_id'=>'demo-enquiry','fb_auto_whatsapp'=>false,'custom_fields'=>[['id'=>'demo-reference','name'=>'Dataset','value'=>'DEMO']]]);
        $project=demo('projects','project_title',['project_title'=>'DEMO '.$name.' Website','client_id'=>$client['id'],'assigned_to'=>'Demo Team','priority'=>['High','Medium','Low'][$i],'status'=>['In Progress','Review','Completed'][$i],'due_date'=>$day(['+2 days','+14 days','-5 days'][$i]),'description'=>'Demo website delivery project','budget'=>35000,'deadline_alerts_enabled'=>false,'lead_email'=>'demo-team@example.invalid']);
        foreach(['Pending','In Progress','Review','Completed'] as $j=>$status) demo('tasks','task_title',['task_title'=>'DEMO '.$name.' - '.['Design','Development','Review','Kickoff'][$j],'project_id'=>$project['id'],'assigned_to'=>'Demo Team','priority'=>'Medium','status'=>$status,'due_date'=>$day('+7 days'),'description'=>'Fictional task','tags'=>['Demo','Website'],'estimated_hours'=>4]);
        if(!row('SELECT id FROM client_subscriptions WHERE client_id=? AND service_id=?',[$client['id'],$service['id']])) save_resource('subscriptions',['client_id'=>$client['id'],'service_id'=>$service['id'],'billing_cycle'=>'Monthly','start_date'=>$day('-30 days'),'expiry_date'=>$day(['-3 days','+7 days','+30 days'][$i]),'amount'=>2500,'auto_renew'=>false,'status'=>['Expired','Expiring Soon','Active'][$i]]);
        demo('quotations','quotation_number',['quotation_number'=>'DEMO-Q-00'.$n,'client_id'=>$client['id'],'title'=>'DEMO Website Proposal','date'=>$today,'valid_until'=>$day('+30 days'),'status'=>['Draft','Pending','Approved'][$i],'gst_rate'=>18,'discount_amount'=>500,'notes'=>'Demo only','items'=>[['id'=>'demo-line','description'=>'Website design and delivery','service_name'=>'Website package','quantity'=>1,'unit_price'=>25000,'billing_cycle'=>'One-Time','unit'=>'Project']]]);
        demo('invoices','invoice_number',['invoice_number'=>'DEMO-INV-00'.$n,'client_id'=>$client['id'],'created_at'=>$today,'due_date'=>$day(['-7 days','+15 days','+30 days'][$i]),'payment_status'=>['Overdue','Partial','Paid'][$i],'gst_rate'=>18,'discount_amount'=>0,'notes'=>'Fictional demo invoice','items'=>[['id'=>'demo-invoice-line','desc'=>'Website services','qty'=>1,'rate'=>10000]]]);
        demo('infrastructure','domain_name',['domain_name'=>'demo'.$n.'.example.invalid','client_id'=>$client['id'],'registrar'=>'Demo Registrar','domain_expiry'=>$day('+180 days'),'hosting_provider'=>'Demo Hosting','hosting_expiry'=>$day('+90 days'),'ssl_status'=>'Active','ssl_expiry'=>$day('+60 days'),'server_ip'=>'192.0.2.'.$n,'cpanel_user'=>'demo'.$n]);
        demo('vault','account_title',['account_title'=>'DEMO '.$name.' Hosting','client_id'=>$client['id'],'service_type'=>'cPanel / Hosting','username'=>'demo'.$n,'password'=>'Demo-only-password-123!','notes'=>'Fictional credentials; no live account.']);
        demo('facebookLeads','id',['id'=>'demo-lead-'.$n,'client_id'=>$client['id'],'fb_page_id'=>$page['page_id'],'form_id'=>'demo-enquiry','lead_name'=>'DEMO Enquiry '.$n,'lead_phone'=>'0000000000','lead_email'=>'lead'.$n.'@example.invalid','created_time'=>date('Y-m-d H:i:s'),'status'=>['New','Qualified','Converted'][$i],'custom_answers'=>[['question'=>'Interested in','answer'=>'Website services']]]);
        $vendor=demo('vendors','vendor_name',['vendor_name'=>'DEMO Partner '.$n,'category'=>'Hosting & Design','contact_person'=>'Demo Support','phone'=>'0000000000','email'=>'vendor'.$n.'@example.invalid','services_offered'=>'Design and hosting','status'=>'Active']);
        demo('vendorBills','project_name',['project_name'=>'DEMO Partner Bill '.$n,'vendor_id'=>$vendor['id'],'total_amount'=>5000,'advance_paid'=>[0,2000,5000][$i],'bill_date'=>$today]);
        demo('recurringExpenses','expense_title',['expense_title'=>'DEMO Monthly Hosting '.$n,'vendor_id'=>$vendor['id'],'category'=>'Hosting','amount'=>1500,'frequency'=>'Monthly','day_of_month'=>1,'next_run_date'=>$day('+30 days'),'auto_entry_enabled'=>false,'notes'=>'Manual demo schedule']);
        $employee=demo('employees','emp_code',['emp_code'=>'DEMO-EMP-00'.$n,'name'=>'DEMO '.['Ananya Sharma','Vikram Patel','Neha Rao'][$i],'email'=>'employee'.$n.'@example.invalid','phone'=>'0000000000','designation'=>['Developer','Designer','Project Manager'][$i],'department'=>'Delivery','joining_date'=>$day('-180 days'),'salary'=>[45000,40000,55000][$i],'bank_details'=>'Demo bank details','status'=>'Active']);
        demo('hrDocuments','ui_id',['ui_id'=>'demo-hr-'.$n,'employee_id'=>$employee['id'],'doc_type'=>'Offer Letter','generated_date'=>$today,'document_data'=>['employee'=>$employee,'rendered_text'=>'DEMO OFFER LETTER'."\n\n".'Dear '.$employee['name'].', this fictional letter demonstrates saved HR documents. Monthly salary: INR '.$employee['salary'].'. For testing only.']]);
        demo('files','id',['id'=>'demo-matrix-'.$n,'client_id'=>$client['id'],'project_id'=>$project['id'],'file_name'=>'DEMO '.$name.' Scope.table','category'=>'Custom Table','file_type'=>'table','reference_type'=>'custom_table','tag'=>'Demo','table_data'=>['id'=>'demo-table-'.$n,'title'=>'DEMO Project Scope','description'=>'Fictional deliverables','theme'=>'blue','columns'=>[['id'=>'scope','header'=>'Deliverable','width'=>60,'align'=>'left'],['id'=>'state','header'=>'Status','width'=>40,'align'=>'left']],'rows'=>[['id'=>'demo-row','cells'=>['scope'=>['id'=>'demo-cell-1','content'=>'Website launch','rowSpan'=>1,'colSpan'=>1],'state'=>['id'=>'demo-cell-2','content'=>'In progress','rowSpan'=>1,'colSpan'=>1]]]],'created_at'=>$today,'updated_at'=>$today]]);
    }
    db()->commit();
    echo "Demo dataset retained in vkd_erp_v2. Reruns preserve existing records and edits. No messages sent.\n";
    foreach(['clients','services','subscriptions','quotations','invoices','projects','tasks','employees','vendors','vendorBills','files'] as $resource) echo $resource.': '.count(collection($resource)).PHP_EOL;
} catch(Throwable $e) { if(db()->inTransaction())db()->rollBack(); throw $e; }

