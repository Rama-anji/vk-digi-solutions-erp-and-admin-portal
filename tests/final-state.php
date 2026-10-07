<?php
declare(strict_types=1);
require_once __DIR__.'/../api/repository.php';
$tables=rows("SHOW FULL TABLES WHERE Table_type='BASE TABLE'");
$views=rows("SHOW FULL TABLES WHERE Table_type='VIEW'");
$counts=[];
foreach($tables as $table){$name=array_values($table)[0];$counts[$name]=(int)query("SELECT COUNT(*) FROM `$name`")->fetchColumn();}
if((int)query("SELECT COUNT(*) FROM clients WHERE client_code REGEXP '^QA-[0-9]+$' OR (email='qa-ui@example.invalid' AND name REGEXP '^QA Browser Client [0-9]+$')")->fetchColumn())throw new RuntimeException('QA clients remain.');
echo json_encode(['database'=>config()['database'],'tables'=>count($tables),'views'=>count($views),'row_counts'=>$counts],JSON_PRETTY_PRINT).PHP_EOL;
