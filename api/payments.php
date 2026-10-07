<?php
declare(strict_types=1);
require_once __DIR__.'/repository.php';
function money_cents(mixed $value): int {
    $text=(string)$value;
    if(!preg_match('/^\d{1,12}(?:\.\d{1,2})?$/',$text))fail('Enter a valid amount with up to two decimal places.');
    [$whole,$fraction]=array_pad(explode('.',$text,2),2,'');
    return (int)$whole*100+(int)str_pad($fraction,2,'0');
}
function receipt_invoice(mixed $id): array {
    $invoice=row('SELECT * FROM invoices WHERE id=? FOR UPDATE',[$id]);
    if(!$invoice)fail('Invoice not found.',404);
    return array_merge($invoice,row('SELECT grand_total FROM v_invoice_totals WHERE id=?',[$id]));
}
function receipt_total(mixed $id): int {return money_cents(query('SELECT COALESCE(SUM(amount_received),0) FROM payments_received WHERE invoice_id=? AND voided_at IS NULL',[$id])->fetchColumn());}
function sync_receipt_status(mixed $id): void {
    $invoice=receipt_invoice($id);$paid=receipt_total($id);$total=money_cents($invoice['grand_total']);
    if($paid>$total)fail('Invoice total cannot be below its recorded receipts.');
    $status=$paid>=$total?'Paid':($paid>0?'Partial':($invoice['due_date']<date('Y-m-d')?'Overdue':'Pending'));
    query('UPDATE invoices SET payment_status=? WHERE id=?',[$status,$id]);
}
function record_receipt(array $input): array {
    $d=$input['data']??[];$invoiceId=!empty($d['invoice_id'])?(int)$d['invoice_id']:null;
    if($invoiceId){$invoice=receipt_invoice($invoiceId);$clientId=(int)$invoice['client_id'];}
    else {$clientId=(int)($d['client_id']??0);if(!row('SELECT id FROM clients WHERE id=? FOR UPDATE',[$clientId]))fail('Choose a valid client.');}
    $key=$input['receipt_key']??'';if(!is_string($key)||!preg_match('/^[a-zA-Z0-9_-]{16,64}$/',$key))fail('A valid receipt request key is required.');
    $amount=money_cents($d['amount_received']??'');if($amount<=0)fail('Receipt amount must be greater than zero.');
    $date=$d['payment_date']??'';$parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date);
    if(!$parsed||$parsed->format('Y-m-d')!==$date||$date>date('Y-m-d'))fail('Enter an actual receipt date, not a future date.');
    $method=$d['payment_method']??'';if(!in_array($method,['UPI / NetBanking','NEFT / RTGS','Credit / Debit Card','Cheque','Cash','Stripe / Razorpay'],true))fail('Choose a payment method.');
    $ref=trim($d['transaction_ref']??'');$notes=trim($d['notes']??'');if(strlen($ref)>100||strlen($notes)>5000)fail('Receipt reference or notes are too long.');
    $existing=row('SELECT * FROM payments_received WHERE receipt_key=?',[$key]);
    if($existing){
        if($existing['voided_at']||money_cents($existing['amount_received'])!==$amount||(int)($existing['invoice_id']??0)!==(int)($invoiceId??0)||($invoiceId===null&&(int)$existing['unallocated_client_id']!==$clientId)||$existing['payment_date']!==$date||$existing['payment_method']!==$method||($existing['transaction_ref']??'')!==$ref)fail('This receipt request key has already been used.',409);
        return find_record('payments',$existing['id']);
    }
    if($invoiceId&&receipt_total($invoiceId)+$amount>money_cents($invoice['grand_total']))fail('Payment exceeds the invoice balance. Record excess money as a client advance.');
    $id=write_record('payments_received',['invoice_id'=>$invoiceId,'unallocated_client_id'=>$invoiceId?null:$clientId,'amount_received'=>sprintf('%d.%02d',intdiv($amount,100),$amount%100),'payment_method'=>$method,'transaction_ref'=>$ref,'payment_date'=>$date,'notes'=>$notes,'receipt_key'=>$key]);
    if($invoiceId)sync_receipt_status($invoiceId);audit('Recorded receipt #'.$id.' for client #'.$clientId);
    return find_record('payments',$id);
}
function update_receipt(string $action,array $input): array {
    // Match renewal lock order so a concurrent void cannot invalidate a completed period.
    $linked=row('SELECT r.subscription_id FROM subscription_renewals r JOIN payments_received p ON p.invoice_id=r.invoice_id WHERE p.id=?',[$input['id']??0]);
    if($linked)locked_subscription($linked['subscription_id']);
    $p=row('SELECT * FROM payments_received WHERE id=? FOR UPDATE',[$input['id']??0]);if(!$p)fail('Receipt not found.',404);
    if($action==='payment_void'&&$p['voided_at'])return find_record('payments',$p['id']);
    if($p['voided_at'])fail('This receipt is void.');
    if($action==='payment_allocate') {
        $invoice=receipt_invoice($input['invoice_id']??0);
        if($p['invoice_id']){if((int)$p['invoice_id']===(int)$invoice['id'])return find_record('payments',$p['id']);fail('Receipt already allocated.');}
        if((int)$p['unallocated_client_id']!==(int)$invoice['client_id'])fail('Advance and invoice must belong to the same client.');
        if(receipt_total($invoice['id'])+money_cents($p['amount_received'])>money_cents($invoice['grand_total']))fail('This advance exceeds the invoice balance.');
        query('UPDATE payments_received SET invoice_id=?,unallocated_client_id=NULL WHERE id=?',[$invoice['id'],$p['id']]);sync_receipt_status($invoice['id']);
    }elseif($action==='payment_reconcile') {
        $ref=trim($input['bank_reference']??'');if(strlen($ref)<2||strlen($ref)>100)fail('Enter the bank statement reference used to verify this receipt.');
        if($p['reconciled_at']&&$p['bank_reference']!==$ref)fail('This receipt is already matched to another statement reference.');
        query('UPDATE payments_received SET reconciled_at=COALESCE(reconciled_at,NOW()),bank_reference=? WHERE id=?',[$ref,$p['id']]);
    }elseif($action==='payment_void') {
        if($p['invoice_id'] && row("SELECT id FROM subscription_renewals WHERE invoice_id=? AND status='Renewed' FOR UPDATE",[$p['invoice_id']]))fail('This receipt funded a completed renewal. Preserve it and use an approved refund/credit process.');
        $reason=trim($input['reason']??'');if(strlen($reason)<3||strlen($reason)>500)fail('Enter a reason for voiding this receipt (3–500 characters).');
        if($p['invoice_id'])receipt_invoice($p['invoice_id']);
        query('UPDATE payments_received SET voided_at=NOW(),void_reason=? WHERE id=?',[$reason,$p['id']]);
        if($p['invoice_id'])sync_receipt_status($p['invoice_id']);
    }else fail('Unknown receipt action.');
    audit($action.' receipt #'.$p['id']);return find_record('payments',$p['id']);
}
