<?php
declare(strict_types=1);
require_once __DIR__.'/../api/integrations.php';
function smtp_assert(bool $ok,string $label): void {
    if(!$ok) throw new RuntimeException($label);
    echo "PASS: $label\n";
}
$valid=['host'=>'smtp.example.com','port'=>465,'security'=>'ssl','username'=>'sender@example.com','password'=>'test-only','from_email'=>'sender@example.com'];
smtp_assert(smtp_config($valid)['port']===465,'SSL configuration accepted');
smtp_assert(smtp_config(array_replace($valid,['port'=>'587','security'=>'tls']))['port']===587,'TLS configuration accepted');
foreach([
    ['port'=>0],['port'=>65536],['port'=>'587junk'],['security'=>'none'],
    ['host'=>'smtp.example.com:465'],['host'=>"smtp.example.com\r\n".'MAIL'],
    ['from_email'=>"sender@example.com\r\nBcc: victim@example.com"],
    ['username'=>''],['password'=>''],
] as $override) {
    $rejected=false;
    try { smtp_config(array_replace($valid,$override)); } catch(RuntimeException $e) { $rejected=$e->getCode()===422; }
    smtp_assert($rejected,'Invalid '.implode('/',array_keys($override)).' rejected before connection');
}
smtp_assert(str_contains(smtp_error('',535),'authentication rejected'),'Empty cURL authentication error explained');
smtp_assert(str_contains(smtp_error('',550),'550'),'SMTP rejection code preserved');
echo "SMTP CHECKS PASSED; NO EMAILS SENT\n";
