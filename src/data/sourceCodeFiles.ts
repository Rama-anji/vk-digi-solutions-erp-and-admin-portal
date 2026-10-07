import databaseSchema from '../../db.sql?raw';
import guide from '../../README.md?raw';
import setup from '../../api/setup.php?raw';
import bootstrap from '../../api/bootstrap.php?raw';
import repository from '../../api/repository.php?raw';
import actions from '../../api/actions.php?raw';
import integrations from '../../api/integrations.php?raw';
import index from '../../api/index.php?raw';
import worker from '../../api/worker.php?raw';
import webhook from '../../api/whatsapp_webhook.php?raw';
export interface SourceFile { name:string;path:string;language:string;category:'Database'|'Configuration'|'Security'|'Authentication'|'Layout'|'Modules';phase:string;description:string;content:string; }
export const PHP_PROJECT_FILES: SourceFile[] = [
 {name:'db.sql',path:'db.sql',language:'sql',category:'Database',phase:'Database',description:'Current normalized schema: 22 tables and 11 read views.',content:databaseSchema},
 {name:'README.md',path:'README.md',language:'markdown',category:'Configuration',phase:'Setup',description:'Local setup, credentials and verification instructions.',content:guide},
 ...Object.entries({setup,bootstrap,repository,actions,integrations,index,worker,whatsapp_webhook:webhook}).map(([name,content])=>({name:name+'.php',path:'api/'+name+'.php',language:'php',category:'Modules' as const,phase:'Backend',description:'Current backend source. Local credentials are excluded.',content}))
];
