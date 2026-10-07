<?php
declare(strict_types=1);

function subscription_date(mixed $value,string $label='date'): string {
    $parsed=is_string($value)?DateTimeImmutable::createFromFormat('!Y-m-d',$value):false;
    if(!$parsed || $parsed->format('Y-m-d')!==$value)fail('Enter a valid '.$label.'.');
    return $value;
}
function advance_date(string $date,string $cycle,?string $duration=null,?int $day=null): string {
    $start=new DateTimeImmutable(subscription_date($date));
    $months=['Monthly'=>1,'Quarterly'=>3,'Half-Yearly'=>6,'Yearly'=>12];
    $count=$months[$cycle]??null;
    if($cycle==='Custom') {
        if(!preg_match('/^\s*([1-9][0-9]{0,3})\s*(day|week|month|year)s?\s*$/i',$duration??'',$m))fail('Enter a custom duration such as 45 days or 2 months (1-9999 units).');
        $n=(int)$m[1];$unit=strtolower($m[2]);
        if(in_array($unit,['month','year'],true))$count=$n*($unit==='year'?12:1);
        else {$result=$start->modify('+'.$n.' '.$unit)->format('Y-m-d');if(strlen($result)!==10)fail('The service period is outside the supported date range.');return $result;}
    }
    if($count!==null) {
        $target=$start->modify('first day of this month')->modify('+'.$count.' months');
        $result=$target->setDate((int)$target->format('Y'),(int)$target->format('m'),min($day??(int)$start->format('d'),(int)$target->format('t')))->format('Y-m-d');
        if(strlen($result)!==10)fail('The service period is outside the supported date range.');return $result;
    }
    fail($cycle==='One-Time'?'One-time services cannot be renewed.':'Choose a supported billing cycle.');
}
function subscription_status(array $s): array {
    $days=(int)(new DateTimeImmutable(date('Y-m-d')))->diff(new DateTimeImmutable($s['expiry_date']))->format('%r%a');
    $status=$s['status']==='Cancelled'?'Cancelled':($days<0?'Expired':($days<=15?'Expiring Soon':'Active'));
    $countdown=$status==='Cancelled'?'Cancelled':($days<0?'Expired - '.abs($days).' day'.(abs($days)===1?'':'s').' ago':($days===0?'Expires today':($days===1?'Expires tomorrow':'Expires in '.$days.' days')));
    return ['status'=>$status,'days_remaining'=>$days,'countdown'=>$countdown];
}
function subscription_payment_rows(): array {
    return rows("SELECT r.*,i.invoice_number,t.grand_total,COALESCE(p.received,0) AS received FROM subscription_renewals r JOIN invoices i ON i.id=r.invoice_id JOIN v_invoice_totals t ON t.id=i.id LEFT JOIN (SELECT invoice_id,SUM(amount_received) AS received FROM payments_received WHERE voided_at IS NULL GROUP BY invoice_id) p ON p.invoice_id=r.invoice_id ORDER BY r.id DESC");
}
function enrich_subscriptions(array $records): array {
    $groups=[];
    foreach(subscription_payment_rows() as $r){
        $r['payment_status']=money_cents($r['received'])>=money_cents($r['amount']) && money_cents($r['grand_total'])===money_cents($r['amount'])?'Paid':'Unpaid';
        $groups[$r['subscription_id']][]=public_record($r);
    }
    foreach($records as &$s){
        $s=array_merge($s,subscription_status($s));
        $s['legacy_payment_status']=$s['payment_status']??'Unpaid';
        $s['renewal_history']=$groups[$s['id']]??[];$pending=null;
        foreach($s['renewal_history'] as $r)if($r['previous_expiry']===$s['expiry_date'] && $r['status']!=='Renewed'){$pending=$r;break;}
        $s['payment_status']=$pending['payment_status']??'Unpaid';
        $s['renewal_invoice_id']=$pending['invoice_id']??null;$s['renewal_invoice_number']=$pending['invoice_number']??null;
        $s['renewal_state']=$s['status']==='Cancelled'?'Cancelled':($pending?($pending['payment_status']==='Paid'?'Ready to renew':$pending['status']):(!empty($s['renewal_history']) && $s['renewal_history'][0]['status']==='Renewed'?'Renewed':'Unpaid'));
        $s['can_renew']=$s['status']!=='Cancelled' && $s['billing_cycle']!=='One-Time' && ($s['payment_status']==='Paid' || money_cents($s['amount'])===0);
        $s['renewal_error']=$pending['last_error']??null;$s['currency']='INR';
        $s['next_reminder_date']=(new DateTimeImmutable($s['expiry_date']))->modify('-15 days')->format('Y-m-d');
    }
    unset($s);return $records;
}
function validate_subscription(array $data,mixed $id): array {
    $current=$id?row('SELECT * FROM client_subscriptions WHERE id=? FOR UPDATE',[$id]):[];
    if($id && !$current)fail('Subscription not found.',404);
    $values=array_merge($current,$data);
    foreach(['client_id'=>'clients','service_id'=>'services_catalog'] as $field=>$table){
        $related=row("SELECT id,status FROM `$table` WHERE id=?",[$values[$field]??0]);
        if(!$related)fail('Choose an existing '.($field==='client_id'?'client':'service').'.');
        if((!$id || (string)$values[$field]!== (string)$current[$field]) && $related['status']!=='Active')fail('Choose an active client and service.');
    }
    $cycle=$values['billing_cycle']??'';
    if(!in_array($cycle,['Monthly','Quarterly','Half-Yearly','Yearly','Custom','One-Time'],true))fail('Choose a supported billing cycle.');
    $start=subscription_date($values['start_date']??date('Y-m-d'),'service start date');
    $duration=$values['custom_duration']??null;
    if($cycle==='Custom')advance_date($start,$cycle,$duration);
    else {if(!empty($data['custom_duration']))fail('Custom duration is only allowed for Custom billing.');$duration=null;}
    $expiry=subscription_date($values['expiry_date']??($cycle==='One-Time'?$start:advance_date($start,$cycle,$duration)),'service expiry date');
    if($expiry<$start)fail('Service expiry must be on or after its start date.');
    $cents=money_cents($values['amount']??'');
    if(array_key_exists('auto_renew',$data) && !in_array($data['auto_renew'],[true,false,0,1,'0','1'],true))fail('Auto-renew must be enabled or disabled.');
    $auto=(bool)($values['auto_renew']??false);
    if($cycle==='One-Time' && $auto)fail('One-time services cannot auto-renew.');
    if($auto && ($values['status']??'Active')==='Cancelled')fail('Cancelled subscriptions cannot auto-renew. Turn auto-renew off first.');
    $derived=$id?find_record('subscriptions',$id):['payment_status'=>'Unpaid'];
    if(isset($data['payment_status']) && $data['payment_status']!==$derived['payment_status'])fail('Payment status is calculated from receipts. Open the renewal invoice to record or void a payment.');
    $history=$id?rows('SELECT * FROM subscription_renewals WHERE subscription_id=?',[$id]):[];
    if($history){
        foreach(['client_id','service_id','start_date','expiry_date'] as $field)if(isset($data[$field]) && (string)$data[$field]!== (string)$current[$field])fail('This subscription has renewal history. Client, service and period dates are protected; create a separate subscription for a new agreement.');
        foreach($history as $r)if($r['status']!=='Renewed')foreach(['amount','billing_cycle','custom_duration'] as $field)if(array_key_exists($field,$data) && ($field==='amount'?money_cents($data[$field])!==money_cents($current[$field]):(string)$data[$field]!== (string)$current[$field]))fail('An issued renewal invoice fixes its rate and cycle. Resolve the pending renewal before changing these fields.');
    }
    $status=$values['status']??'Active';
    if(!in_array($status,['Active','Expiring Soon','Expired','Cancelled'],true))fail('Invalid service status.');
    $result=['client_id'=>$values['client_id'],'service_id'=>$values['service_id'],'billing_cycle'=>$cycle,'custom_duration'=>$duration,'start_date'=>$start,'expiry_date'=>$expiry,'amount'=>sprintf('%d.%02d',intdiv($cents,100),$cents%100),'auto_renew'=>$auto,'status'=>subscription_status(['status'=>$status,'expiry_date'=>$expiry])['status']];
    if(!$id || $expiry!==$current['expiry_date'] || $cycle!==$current['billing_cycle']) {
        $anchor=(int)substr($expiry,8,2);
        if($cycle!=='One-Time' && $expiry===advance_date($start,$cycle,$duration))$anchor=(int)substr($start,8,2);
        $result['billing_anchor_day']=$anchor;
    }
    if(!$id)$result+=['payment_status'=>'Unpaid','current_period_start'=>$start,'created_at'=>date('Y-m-d H:i:s')];
    return $result;
}
function locked_subscription(mixed $id): array {
    $s=row('SELECT * FROM client_subscriptions WHERE id=? FOR UPDATE',[$id]);if(!$s)fail('Subscription not found.',404);return $s;
}
function eligible_subscription(array $s): void {
    if($s['status']==='Cancelled')fail('Cancelled subscriptions cannot renew.');
    if($s['billing_cycle']==='One-Time')fail('One-time services cannot renew.');
    foreach(['client_id'=>'clients','service_id'=>'services_catalog'] as $field=>$table)if((row("SELECT status FROM `$table` WHERE id=?",[$s[$field]])['status']??'')!=='Active')fail('The client and service must be active to renew.');
}
function prepare_renewal(array $input): array {
    $s=locked_subscription($input['id']??0);
    $expected=subscription_date($input['expected_expiry']??null,'expected expiry');
    $existing=row('SELECT * FROM subscription_renewals WHERE subscription_id=? AND previous_expiry=?',[$s['id'],$expected]);
    if($existing)return array_merge($existing,row('SELECT invoice_number FROM invoices WHERE id=?',[$existing['invoice_id']]));
    if($expected!==$s['expiry_date'])fail('The subscription period changed. Refresh before preparing another renewal.',409);
    eligible_subscription($s);
    $next=advance_date($s['expiry_date'],$s['billing_cycle'],$s['custom_duration'],(int)($s['billing_anchor_day']?:substr($s['expiry_date'],8,2)));
    $service=row('SELECT service_name FROM services_catalog WHERE id=?',[$s['service_id']]);
    $invoice=save_resource('invoices',['invoice_number'=>'REN-'.date('Y').'-'.strtoupper(bin2hex(random_bytes(6))),'client_id'=>$s['client_id'],'due_date'=>$s['expiry_date'],'gst_rate'=>0,'notes'=>'Subscription renewal: '.$s['expiry_date'].' to '.$next.'. INR total agreed rate; no additional tax added.','items'=>[['desc'=>$service['service_name'].' renewal ('.$s['expiry_date'].' to '.$next.')','qty'=>1,'rate'=>$s['amount']]]]);
    $id=write_record('subscription_renewals',['subscription_id'=>$s['id'],'previous_expiry'=>$expected,'period_start'=>$expected,'period_end'=>$next,'billing_cycle'=>$s['billing_cycle'],'custom_duration'=>$s['custom_duration'],'amount'=>$s['amount'],'invoice_id'=>$invoice['id']]);
    audit('Prepared renewal #'.$id.' for subscription #'.$s['id']);
    return array_merge(row('SELECT * FROM subscription_renewals WHERE id=?',[$id]),['invoice_number'=>$invoice['invoice_number']]);
}
function renewal_paid(array $renewal): bool {
    $invoice=receipt_invoice($renewal['invoice_id']);
    $paid=0;foreach(rows('SELECT amount_received FROM payments_received WHERE invoice_id=? AND voided_at IS NULL FOR UPDATE',[$invoice['id']]) as $receipt)$paid+=money_cents($receipt['amount_received']);
    return money_cents($invoice['grand_total'])===money_cents($renewal['amount']) && $paid>=money_cents($renewal['amount']);
}
function complete_renewal(array $input): array {
    $s=locked_subscription($input['id']??0);
    $r=prepare_renewal($input);
    if($r['status']==='Renewed')return find_record('subscriptions',$s['id']);
    eligible_subscription($s);
    if($s['expiry_date']!==$r['previous_expiry'])fail('The subscription period changed. Refresh and review the renewal.',409);
    if(!renewal_paid($r))fail('Unable to renew subscription. Record the full payment on its renewal invoice first.');
    query("UPDATE subscription_renewals SET status='Renewed',attempt_count=attempt_count+1,last_attempt_at=NOW(),last_error=NULL,renewed_at=NOW() WHERE id=?",[$r['id']]);
    query("UPDATE client_subscriptions SET current_period_start=?,expiry_date=?,status=?,payment_status='Unpaid',billing_anchor_day=COALESCE(billing_anchor_day,?) WHERE id=?",[$r['period_start'],$r['period_end'],subscription_status(['status'=>'Active','expiry_date'=>$r['period_end']])['status'],(int)substr($r['previous_expiry'],8,2),$s['id']]);
    audit('Renewed subscription #'.$s['id'].' using invoice #'.$r['invoice_id'].'; '.$r['previous_expiry'].' to '.$r['period_end']);
    queue_subscription_notice($s['id'],'confirmation','renewal-confirmed:'.$r['id']);
    return find_record('subscriptions',$s['id']);
}
function renew_due_subscriptions(): int {
    $count=0;
    foreach(rows("SELECT id FROM client_subscriptions WHERE auto_renew=1 AND status<>'Cancelled' AND billing_cycle<>'One-Time' AND expiry_date<CURRENT_DATE ORDER BY id") as $candidate){
        $s=locked_subscription($candidate['id']);
        if(!$s['auto_renew'] || $s['status']==='Cancelled' || $s['expiry_date']>=date('Y-m-d'))continue;
        try {
            eligible_subscription($s);
            $r=prepare_renewal(['id'=>$s['id'],'expected_expiry'=>$s['expiry_date']]);
            if(!renewal_paid($r)){
                if(!$r['last_attempt_at']){
                    query("UPDATE subscription_renewals SET status='Pending Payment',attempt_count=attempt_count+1,last_attempt_at=NOW(),last_error='Auto-renew is waiting for full invoice payment; no charge attempted.' WHERE id=?",[$r['id']]);
                    audit('Auto-renew pending payment for subscription #'.$s['id']);
                    queue_subscription_notice($s['id'],'payment_required','renewal-unpaid:'.$r['id']);
                }
                continue;
            }
            complete_renewal(['id'=>$s['id'],'expected_expiry'=>$s['expiry_date']]);$count++;
        } catch(RuntimeException $e){
            if(!in_array($e->getCode(),[409,422],true))throw $e;
            // Record one observable failure per period, without repeated charging or extending dates.
            $key='renewal-failed:'.$s['id'].':'.$s['expiry_date'];
            if(!row('SELECT id FROM communications WHERE deduplication_key=?',[$key])){audit('Auto-renew failed for subscription #'.$s['id'].': '.$e->getMessage());queue_subscription_notice($s['id'],'failure',$key);}
        }
    }
    return $count;
}
function queue_subscription_notice(int|string $id,string $kind,string $key,?array $admin=null): array {
    $existing=row('SELECT * FROM communications WHERE deduplication_key=?',[$key]);if($existing)return $existing;
    $s=find_record('subscriptions',$id);$client=row('SELECT email,contact_person FROM clients WHERE id=?',[$s['client_id']]);
    $context=array_merge($s,['client_email'=>$client['email'],'client_contact'=>$client['contact_person'],'notice_kind'=>$kind]);unset($context['renewal_history']);
    $next=$s['payment_status']==='Paid'?'Payment received. Review and complete the renewal.':'Record payment on the renewal invoice before renewing.';
    if($kind==='confirmation')$next='Renewal completed. The updated expiry is shown above.';
    $subject=($kind==='test'?'TEST - ':($kind==='confirmation'?'Renewal confirmed: ':'Renewal reminder: ')).$s['service_name'];
    $body="Client: {$s['client_name']}\nService: {$s['service_name']}\nExpiry: {$s['expiry_date']}\nRenewal amount: INR {$s['amount']}\nBilling cycle: {$s['billing_cycle']} ".($s['custom_duration']??'')."\nAuto-renew: ".($s['auto_renew']?'Enabled':'Manual')."\nPayment: ".($kind==='confirmation'?'Paid':$s['payment_status'])."\nNext action: $next";
    if($kind==='test')$body="TEST ONLY - no subscription, payment or renewal changes.\n\n".$body;
    $recipient=$admin['email']??$client['email'];$valid=(bool)filter_var($recipient,FILTER_VALIDATE_EMAIL);
    $messageId='renew-'.bin2hex(random_bytes(12));
    // Serialize notice writers on the subscription in the same transaction.
    locked_subscription($id);
    $existing=row('SELECT * FROM communications WHERE deduplication_key=?',[$key]);if($existing)return $existing;
    write_record('communications',['id'=>$messageId,'channel'=>'email','purpose'=>$kind==='reminder'?'renewal':'message','subscription_id'=>$id,'recipient_name'=>$admin['name']??$client['contact_person'],'recipient_email'=>$recipient,'subject'=>$subject,'body'=>$body,'context'=>$context,'deduplication_key'=>$key,'status'=>$valid?'Queued':'Failed','error_message'=>$valid?null:'Invalid recipient email. Correct the client email before retrying.']);
    return row('SELECT * FROM communications WHERE id=?',[$messageId]);
}
function test_subscription_reminder(array $input,array $admin): array {
    $key=$input['request_key']??'';if(!is_string($key)||!preg_match('/^[a-zA-Z0-9_-]{16,64}$/',$key))fail('A test reminder request key is required.');
    locked_subscription($input['id']??0);
    audit('Queued admin-only test reminder for subscription #'.$input['id']);
    return queue_subscription_notice($input['id'],'test','renewal-test:'.$input['id'].':'.$key,$admin);
}
