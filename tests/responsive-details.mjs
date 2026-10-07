import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base='http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const issues=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
async function go(tab){await page.goto(base+'index.php?tab='+tab);await page.getByRole('button',{name:'Open navigation',exact:true}).waitFor();}
async function inspect(name){
 const bad=await page.evaluate(()=>{
  const root=document.querySelector('main');
  return [...document.querySelectorAll('main *, .fixed.inset-0 *, .portal-topbar-popover *')].filter(el=>{
   const r=el.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(el).visibility==='hidden')return false;
   if(r.right<=innerWidth+2&&r.left>=-2)return false;
   for(let p=el.parentElement;p&&p!==root;p=p.parentElement)if(['auto','scroll'].includes(getComputedStyle(p).overflowX))return false;
   return true;
  }).slice(0,5).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,50)}));
 });
 if(bad.length){issues.push({name,width:page.viewportSize().width,bad});console.log('OVERFLOW',JSON.stringify(issues.at(-1)));}
 await page.screenshot({path:`test-results/responsive/detail-${page.viewportSize().width}-${name}.png`});
}
try {
 await page.goto(base);await page.getByLabel('Password',{exact:true}).fill(fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1]);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Open navigation',exact:true}).waitFor();
 for(const viewport of [{width:320,height:740},{width:768,height:1024},{width:844,height:390}]) {
  await page.setViewportSize(viewport);
  await go('dashboard');await page.getByRole('button',{name:'Open navigation',exact:true}).click();await expect(page.locator('aside')).toHaveAttribute('data-open','true');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Notifications',exact:true}).click();await inspect('notifications');await page.getByRole('button',{name:'Notifications',exact:true}).click();
  await page.getByRole('button',{name:'Account menu',exact:true}).click();await inspect('account');
  for(const tab of ['infrastructure','vault','employees','vendor-directory','facebook-leads']){await go(tab);await page.getByRole('button',{name:'Add record',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await inspect(tab+'-editor');await page.getByRole('button',{name:'Cancel',exact:true}).click();}
  await go('clients');await page.locator('header').getByRole('button',{name:/New/}).click();await inspect('client-create');
  await go('clients');await page.getByRole('button',{name:'Import CSV',exact:true}).click();await inspect('csv-import');
  await go('services');await page.getByRole('button',{name:'Add New Service Entry'}).click();await inspect('service-create');
  await go('quotations');await page.getByRole('button',{name:'Prepare New Quotation'}).click();await inspect('quotation-create');
  await go('quotations');await page.locator('tr').filter({hasText:'DEMO-Q-001'}).getByTitle('View Official Proposal Document').click();await inspect('quotation-preview');
  await go('invoices');await page.getByRole('button',{name:'Edit Invoice',exact:true}).click();await inspect('invoice-edit');
  await go('projects');await page.getByRole('button',{name:'+ New Project',exact:true}).click();await inspect('project-create');
  await go('projects');await page.getByTitle('Add task to Pending',{exact:true}).click();await inspect('task-create');
  await go('renewals');await page.getByRole('button',{name:'+ Assign New Service',exact:true}).click();await inspect('subscription-create');
  await go('renewals');await page.getByTitle('Open Renewal Email Reminders',{exact:true}).click();await inspect('renewal-outbox');
  await go('files');await page.getByRole('button',{name:'+ Create New Table',exact:true}).click();await inspect('table-create');
  await go('files');await page.getByText('DEMO Aster Retail',{exact:true}).first().click();await page.getByRole('button',{name:'+ Upload File (Doc/PDF)',exact:true}).click();await inspect('file-upload');
  await go('files');await page.getByText('DEMO Aster Retail',{exact:true}).first().click();await page.getByTitle('Edit Table Grid',{exact:true}).first().click();await inspect('table-editor');
  await go('vendors');await page.getByRole('button',{name:'+ Record Vendor Bill',exact:true}).click();await inspect('vendor-bill');
  await go('vendors');await page.getByRole('button',{name:/Recurring Expenses/}).click();await page.getByRole('button',{name:'+ Define Recurring Expense',exact:true}).click();await inspect('recurring-expense');
  await go('hr');for(const name of ['Offer Letter','Appointment Letter','Payslip','Relieving Letter','Experience Letter','NOC','F&F Statement']){await page.getByRole('button',{name,exact:true}).click();await inspect('hr-'+name.replaceAll(/[^a-z]/gi,'-'));}
  await go('dashboard');await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.locator('aside').getByTitle('WhatsApp Business API & Template Messenger').click();await inspect('whatsapp');await page.getByRole('button',{name:'Close WhatsApp',exact:true}).click();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.locator('aside').getByTitle('VKD Source & Database').click();await inspect('source');await page.getByRole('button',{name:'Close source explorer',exact:true}).click();
  console.log('CHECKED forms, dialogs and drawer',viewport.width,viewport.height);
 }
 fs.writeFileSync('test-results/responsive/details.json',JSON.stringify(issues,null,2));expect(errors).toEqual([]);expect(issues).toEqual([]);
}finally{await browser.close();}
