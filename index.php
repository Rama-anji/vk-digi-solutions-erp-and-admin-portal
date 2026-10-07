<?php
declare(strict_types=1);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
$entry=__DIR__.'/dist/index.html';
if(!is_file($entry)){http_response_code(503);echo 'Build the application with npm run build first.';exit;}
readfile($entry);
