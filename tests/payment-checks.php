<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit;
require_once __DIR__.'/../api/payments.php';
function payment_check(bool $ok,string $name):void {if(!$ok)throw new RuntimeException($name);echo "PASS: $name\n";}
function rejected(callable $action,string $name):void {try{$action();throw new LogicException('Request unexpectedly succeeded: '.$name);}catch(RuntimeException $e){payment_check(in_array($e->getCode(),[422,409],true),$name);}}
try {
 db()->beginTransaction();$client=row('SELECT id FROM clients ORDER BY id LIMIT 1');$other=row('SELECT id FROM clients WHERE id<>? LIMIT 1',[$client['id']]);
 $invoice=save_resource('invoices',['invoice_number'=>'RECEIPT-CHECK-'.bin2hex(random_bytes(6)),'client_id'=>$client['id'],'due_date'=>date('Y-m-d',strtotime('+7 days')),'gst_rate'=>0,'items'=>[['desc'=>'Receipt test','qty'=>1,'rate'=>'1000.55']]]);
 $request=['receipt_key'=>bin2hex(random_bytes(16)),'data'=>['invoice_id'=>$invoice['id'],'amount_received'=>'300.25','payment_method'=>'UPI / NetBanking','payment_date'=>date('Y-m-d'),'transaction_ref'=>'LOCAL-TEST-1']];
 $receipt=record_receipt($request);$fresh=find_record('invoices',$invoice['id']);payment_check($fresh['payment_status']==='Partial'&&$fresh['amount_received']===300.25&&$fresh['balance_due']===700.3,'partial receipt determines status and exact balance');
 payment_check(record_receipt($request)['id']===$receipt['id'],'receipt retry is idempotent');
 $over=$request;$over['receipt_key']=bin2hex(random_bytes(16));$over['data']['amount_received']='700.31';rejected(fn()=>record_receipt($over),'overpayment rejected');
 $over['data']['amount_received']='0.001';rejected(fn()=>record_receipt($over),'sub-paise amounts rejected');
 rejected(fn()=>save_resource('invoices',['payment_status'=>'Paid'],$invoice['id']),'manual status cannot bypass recorded receipts');
 rejected(fn()=>save_resource('invoices',['client_id'=>$other['id']],$invoice['id']),'receipted invoice cannot change client');
 rejected(fn()=>save_resource('payments',$request['data']),'generic payment writes blocked');
 rejected(fn()=>delete_resource('payments',$receipt['id']),'receipt deletion blocked');
 $matched=update_receipt('payment_reconcile',['id'=>$receipt['id'],'bank_reference'=>'STATEMENT-001']);payment_check(!empty($matched['reconciled_at'])&&$matched['bank_reference']==='STATEMENT-001','statement matching persists');
 $advance=record_receipt(['receipt_key'=>bin2hex(random_bytes(16)),'data'=>['client_id'=>$client['id'],'amount_received'=>'700.30','payment_method'=>'NEFT / RTGS','payment_date'=>date('Y-m-d'),'transaction_ref'=>'ADVANCE-001']]);
 payment_check($advance['invoice_id']===null&&(int)$advance['client_id']===(int)$client['id'],'unallocated client advance recorded');
 update_receipt('payment_allocate',['id'=>$advance['id'],'invoice_id'=>$invoice['id']]);$fresh=find_record('invoices',$invoice['id']);payment_check($fresh['payment_status']==='Paid'&&$fresh['balance_due']===0.0,'allocating advance settles invoice');
 update_receipt('payment_allocate',['id'=>$advance['id'],'invoice_id'=>$invoice['id']]);payment_check(receipt_total($invoice['id'])===100055,'allocation retry cannot duplicate money');
 update_receipt('payment_void',['id'=>$receipt['id'],'reason'=>'Incorrect receipt, reversed in local test']);$fresh=find_record('invoices',$invoice['id']);payment_check($fresh['payment_status']==='Partial'&&$fresh['balance_due']===300.25,'void retains history and restores invoice balance');
 update_receipt('payment_void',['id'=>$receipt['id'],'reason'=>'Repeated request']);payment_check(receipt_total($invoice['id'])===70030,'void retry is idempotent');
 rejected(fn()=>update_receipt('payment_reconcile',['id'=>$receipt['id'],'bank_reference'=>'OTHER']),'void receipt cannot be reconciled');
 payment_check((int)query('SELECT COUNT(*) FROM payments_received WHERE invoice_id=?',[$invoice['id']])->fetchColumn()===2,'void receipt remains in history');
}finally{if(db()->inTransaction())db()->rollBack();}
echo "PAYMENT CHECKS PASSED; CHANGES ROLLED BACK\n";
