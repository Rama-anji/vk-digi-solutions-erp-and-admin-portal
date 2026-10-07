import { spawn } from 'node:child_process';
import fs from 'node:fs';
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port=3000','--host=0.0.0.0'],{stdio:'inherit',windowsHide:true});
const php=process.env.PHP_BINARY || (process.platform==='win32'?'C:/xampp/php/php.exe':'php');
let worker;
const tick=()=>{if(worker || !fs.existsSync('api/config.local.php'))return;worker=spawn(php,['api/worker.php'],{stdio:'inherit',windowsHide:true});worker.on('error',e=>{console.error('Worker:',e.message);worker=null;});worker.on('exit',()=>worker=null);};
tick();const timer=setInterval(tick,60000);
const stop=()=>{clearInterval(timer);if(worker)worker.kill();vite.kill();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);vite.on('exit',code=>{stop();process.exitCode=code||0;});
