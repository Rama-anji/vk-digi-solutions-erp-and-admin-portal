import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base='http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('test-results/responsive',{recursive:true});
const names=['Dashboard','Clients Directory','Services & Pricing','Renewals & Expiry','Invoices & Billing','Quotations','Files & Drive','Vendor Bills & Ledger','Web Infrastructure','Credential Vault','Projects & Tasks','Employees','Vendor Directory','Facebook Leads','Integrations & Settings','HR & Documents'];
async function measure(label,width) {
 const result=await page.evaluate(()=>{
  const main=document.querySelector('main');
  const headerItems=[...document.querySelector('.portal-topbar').children].filter(el=>el.getBoundingClientRect().width>0).map(el=>el.getBoundingClientRect());
  const headerOverlap=headerItems.some((a,i)=>headerItems.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2));
  const bad=[...document.querySelectorAll('main *, .portal-topbar *')].filter(el=>{
   const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;
   if(r.right<=innerWidth+2&&r.left>=-2)return false;
   for(let p=el.parentElement;p&&p!==main;p=p.parentElement)if(['auto','scroll'].includes(getComputedStyle(p).overflowX))return false;
   return true;
  }).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,65)}));
  return {headerOverlap,pageOverflow:document.documentElement.scrollWidth>innerWidth+2,mainOverflow:main.scrollWidth>main.clientWidth+2,bad};
 });
 results.push({label,width,...result});
 if(result.headerOverlap||result.pageOverflow||result.mainOverflow||result.bad.length)console.log('OVERFLOW',width,label,JSON.stringify(result));
}
try {
 await page.goto(base);await page.getByLabel('Password',{exact:true}).fill(fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1]);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor();
 for(const width of [320,390,768,1024,1280,1440,1920]) {
  await page.setViewportSize({width,height:width<600?844:960});
  for(const name of names) {
   if(width<1280)await page.getByRole('button',{name:'Open navigation',exact:true}).click();
   await page.locator('aside').getByRole('button',{name,exact:true}).click();
   await page.waitForTimeout(60);await measure(name,width);
   if([390,768,1440].includes(width))await page.screenshot({path:`test-results/responsive/${width}-${name.replaceAll(/[^a-z0-9]/gi,'-')}.png`});
  }
  console.log('CHECKED',width,'all 16 screens');
 }
 fs.writeFileSync('test-results/responsive/results.json',JSON.stringify(results,null,2));
 expect(errors).toEqual([]);
 expect(results.filter(r=>r.headerOverlap||r.pageOverflow||r.mainOverflow||r.bad.length),'All content must fit or use a local scroll region').toEqual([]);
}finally{await browser.close();}
