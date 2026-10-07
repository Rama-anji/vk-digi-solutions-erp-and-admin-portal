<?php
declare(strict_types=1);
// Resolve redirects from the public URL, avoiding filesystem paths in Apache on Windows.
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';
$base=preg_replace('~(?:dashboard\.php|auth/login\.php|(?:clients|renewals|invoices|quotations|vault|vendors|hr)/[^/]+\.php|(?:login|dashboard|clients|renewals|invoices|quotations|vendors|hr)/?|legacy-route\.php)$~','',$path);
$tab=$_GET['tab']??'dashboard';
if(!in_array($tab,['dashboard','clients','renewals','invoices','quotations','vault','vendors','hr'],true))$tab='dashboard';
$target=$base.'index.php?tab='.rawurlencode($tab);
if(($_GET['create']??'')==='1' && in_array($tab,['clients','invoices'],true))$target.='&create=1';
header('Location: '.$target,true,302);
exit;
