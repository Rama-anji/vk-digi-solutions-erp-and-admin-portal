<?php
declare(strict_types=1);
require_once __DIR__.'/../api/actions.php';
function check_edge(bool $ok,string $label): void { if(!$ok)throw new RuntimeException($label); echo "PASS: $label\n"; }
try {
 db()->beginTransaction();
 $client=row("SELECT * FROM clients WHERE client_code='DEMO-001'");
 if(!$client)throw new RuntimeException('Run database/seed-demo.php first.');
 $bill=row("SELECT * FROM vendor_bills WHERE project_name='DEMO Partner Bill 1'");
 try {save_resource('vendorBills',['advance_paid'=>$bill['total_amount']+1],$bill['id']);throw new LogicException('Overpayment accepted');}
 catch(RuntimeException $e){check_edge($e->getCode()===422,'vendor overpayment rejected by the API repository');}
 $mapped=save_resource('clients',['fb_form_id'=>'demo-enquiry'],$client['id']);
 check_edge($mapped['fb_form_id']==='demo-enquiry','partial client mapping uses the existing page');
 try { save_resource('clients',['fb_page_id'=>'missing-page'],$client['id']); throw new LogicException('Invalid mapping accepted'); }
 catch(RuntimeException $e) { check_edge($e->getCode()===422,'changing page cannot retain an unrelated form'); }
 $task=row("SELECT * FROM tasks WHERE task_title='DEMO Aster Retail - Kickoff'");
 query("UPDATE tasks SET completed_at='2026-01-01 10:00:00' WHERE id=?",[$task['id']]);
 $saved=save_resource('tasks',['status'=>'Completed','description'=>'Updated details'],$task['id']);
 check_edge($saved['completed_at']==='2026-01-01 10:00:00','editing completed task preserves completion time');
 $saved=save_resource('tasks',['status'=>'Pending'],$task['id']);
 check_edge($saved['completed_at']===null,'reopening task clears completion time');
 $service=row("SELECT * FROM services_catalog WHERE service_name='DEMO Custom Campaign'");
 $quote=save_resource('quotations',['quotation_number'=>'EDGE-'.bin2hex(random_bytes(5)),'client_id'=>$client['id'],'title'=>'Custom cycle regression','date'=>date('Y-m-d'),'valid_until'=>date('Y-m-d',strtotime('+30 days')),'items'=>[['id'=>'custom-line','description'=>'Custom campaign','service_id'=>$service['id'],'quantity'=>1,'unit_price'=>12000,'billing_cycle'=>'Custom','custom_duration'=>'45 days','start_date'=>date('Y-m-d')]]]);
 $before=(int)query('SELECT COUNT(*) FROM client_subscriptions')->fetchColumn();
 $converted=convert_quote($quote['id']);
 check_edge($converted['invoice']['grand_total']>0,'custom quotation converts to invoice');
 $subscription=row('SELECT * FROM client_subscriptions WHERE client_id=? AND service_id=? ORDER BY id DESC LIMIT 1',[$client['id'],$service['id']]);
 check_edge($subscription['expiry_date']===date('Y-m-d',strtotime('+45 days')),'custom conversion preserves the 45-day renewal term');
 convert_quote($quote['id']);
 check_edge((int)query('SELECT COUNT(*) FROM client_subscriptions')->fetchColumn()===$before+1,'conversion retry does not duplicate subscriptions');
} finally { if(db()->inTransaction())db()->rollBack(); }
echo "EDGE CHECKS PASSED; CHANGES ROLLED BACK\n";
