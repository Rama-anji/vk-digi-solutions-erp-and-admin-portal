<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit;
$root=__DIR__.'/../.storage/subscription-qa';
$fixturePath=$root.'/fixture.json';
$pdo=new PDO('mysql:host=127.0.0.1;port=33317;charset=utf8mb4','root','',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$dataDir=str_replace('\\','/',(string)$pdo->query('SELECT @@datadir')->fetchColumn());if(!str_ends_with(rtrim($dataDir,'/'),'/.db-validation'))throw new RuntimeException('Isolated database server required.');
if(($argv[1]??'')==='cleanup'){
 $f=json_decode(file_get_contents($fixturePath),true,512,JSON_THROW_ON_ERROR);
 if(!preg_match('/^vkd_lifecycle_test_[a-f0-9]{12}$/',$f['database']))throw new RuntimeException('Unsafe test database name.');
 $pdo->exec('DROP DATABASE IF EXISTS `'.$f['database'].'`');echo "Disposable test database removed.\n";exit;
}
if(!is_dir($root))mkdir($root,0700,true);
$dbName='vkd_lifecycle_test_'.bin2hex(random_bytes(6));
$sql=str_replace('`vkd_erp_v2`','`'.$dbName.'`',file_get_contents(__DIR__.'/../db.sql'));
foreach(preg_split('/;\s*(?:\r?\n|$)/',trim(preg_replace('/^--.*$/m','',$sql))) as $statement)if(trim($statement)!=='')$pdo->exec($statement);
foreach(['api','assets'] as $dir)if(!is_dir($root.'/'.$dir))mkdir($root.'/'.$dir,0700,true);
foreach(glob(__DIR__.'/../api/*.php') as $file)if(basename($file)!=='config.local.php')copy($file,$root.'/api/'.basename($file));
foreach(glob(__DIR__.'/../dist/assets/*') as $file)copy($file,$root.'/assets/'.basename($file));copy(__DIR__.'/../dist/index.html',$root.'/index.html');
file_put_contents($root.'/api/config.local.php',"<?php\nreturn ".var_export(['host'=>'127.0.0.1','port'=>33317,'database'=>$dbName,'user'=>'root','password'=>'','key'=>base64_encode(random_bytes(32))],true).";\n");
$password='Disposable-lifecycle-test-only-2026';
$stmt=$pdo->prepare('INSERT INTO admins(name,email,password,role) VALUES (?,?,?,?)');$stmt->execute(['QA admin','qa-admin@example.invalid',password_hash($password,PASSWORD_DEFAULT),'Admin']);$stmt->execute(['QA limited user','qa-limited@example.invalid',password_hash($password,PASSWORD_DEFAULT),'Project Manager']);
$pdo->exec("INSERT INTO integration_settings(provider,config) VALUES ('company','{\"legal_name\":\"Lifecycle QA\"}'),('smtp','{\"auto_send\":false}')");
require $root.'/api/integrations.php';
db()->beginTransaction();
$client=save_resource('clients',['client_code'=>'LIFE-QA-1','name'=>'Lifecycle QA Client','client_type'=>'Corporate','contact_person'=>'QA','email'=>'qa-client@example.invalid','mobile'=>'1234567890','city'=>'Test','address'=>'Test','source'=>'QA','status'=>'Active','start_date'=>date('Y-m-d'),'notes'=>'Disposable fixture']);
$service=save_resource('services',['service_name'=>'Lifecycle QA Service','category'=>'Web Development','billing_frequency'=>'Monthly','default_rate'=>'10000.55','description'=>'Disposable test service','status'=>'Active']);
$base=['client_id'=>$client['id'],'service_id'=>$service['id'],'billing_cycle'=>'Monthly','start_date'=>'2026-01-01','amount'=>'10000.55','auto_renew'=>false];
$subs=[];foreach([0,1,15,16,-1,-30] as $days){$subs[(string)$days]=save_resource('subscriptions',array_merge($base,['expiry_date'=>(new DateTimeImmutable('today'))->modify(($days>=0?'+':'').$days.' days')->format('Y-m-d')]));}
$custom=save_resource('subscriptions',array_merge($base,['billing_cycle'=>'Custom','custom_duration'=>'45 days','expiry_date'=>date('Y-m-d'),'auto_renew'=>true,'amount'=>'12.55']));
$free=save_resource('subscriptions',array_merge($base,['expiry_date'=>date('Y-m-d'),'amount'=>'0']));
$bad=queue_subscription_notice($subs['0']['id'],'test','qa-invalid',['name'=>'QA','email'=>'invalid']);
db()->commit();
file_put_contents($fixturePath,json_encode(['database'=>$dbName,'password'=>$password,'client'=>$client,'service'=>$service,'subs'=>$subs,'custom'=>$custom,'free'=>$free,'invalid_notice'=>$bad['id'],'server_date'=>date('Y-m-d')],JSON_THROW_ON_ERROR));
echo "Disposable schema and browser fixtures created (23 tables).\n";
