<?php
if(PHP_SAPI!=='cli')exit;
require_once __DIR__.'/../api/bootstrap.php';
foreach(['smtp','whatsapp','facebook'] as $provider){$c=integration($provider);echo json_encode(['provider'=>$provider,'host_configured'=>!empty($c['host']),'sender_configured'=>!empty($c['from_email']),'token_configured'=>!empty($c['api_token_configured'])||!empty($c['page_access_token_configured']),'phone_id_configured'=>!empty($c['phone_number_id']),'auto_send'=>!empty($c['auto_send']),'auto_greeting'=>!empty($c['auto_greeting_enabled'])]).PHP_EOL;}
