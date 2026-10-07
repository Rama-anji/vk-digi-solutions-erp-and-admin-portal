<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit;
require __DIR__.'/../.storage/subscription-qa/api/integrations.php';
$f=json_decode(file_get_contents(__DIR__.'/../.storage/subscription-qa/fixture.json'),true,512,JSON_THROW_ON_ERROR);
if(config()['database']!==$f['database'] || !str_starts_with(config()['database'],'vkd_lifecycle_test_'))throw new RuntimeException('Disposable test DB required.');
try{db()->beginTransaction();$s=complete_renewal(['id'=>$f['free']['id'],'expected_expiry'=>$f['free']['expiry_date']]);usleep(300000);db()->commit();echo $s['expiry_date'];}catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
