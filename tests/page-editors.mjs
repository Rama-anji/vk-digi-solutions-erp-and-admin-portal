import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base=process.env.TEST_URL || 'http://localhost:3003';
const f=JSON.parse(fs.readFileSync('test-results/fixture-records.json','utf8'));
const password=fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1];
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const nav=async name=>{await page.locator('aside').getByRole('button',{name,exact:true}).click();};
try {
 await page.goto(base);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor({timeout:60000});
 for(const name of ['Dashboard','Clients Directory','Services & Pricing','Renewals & Expiry','Invoices & Billing','Quotations','Files & Drive','Vendor Bills & Ledger','Web Infrastructure','Credential Vault','Projects & Tasks','Employees','Vendor Directory','Facebook Leads','Integrations & Settings','HR & Documents']){
   await nav(name);await page.waitForTimeout(100);expect(await page.locator('main').innerText()).not.toBe('');expect(errors,name).toEqual([]);console.log('PASS:',name);
 }
 for(const name of ['Offer Letter','Appointment Letter','Payslip','Relieving Letter','Experience Letter','NOC','F&F Statement']){await page.getByRole('button',{name,exact:true}).click();expect((await page.locator('#printable-hr-doc').innerText()).length).toBeGreaterThan(200);}console.log('PASS: seven HR document templates');
 await nav('Quotations');await page.locator('tr').filter({hasText:f.quote.quotation_number}).getByTitle('Edit quotation').click();
 await page.getByPlaceholder(/Enterprise Cloud ERP/).fill('QA edited proposal');await page.getByRole('button',{name:/Save Quotation Changes|Save & Automatically Generate Invoice|Create & Save Quotation/}).first().click();
 await expect(page.locator('tr').filter({hasText:f.quote.quotation_number})).toContainText('QA edited proposal',{timeout:20000});console.log('PASS: quotation editor saves existing record');
 await nav('Invoices & Billing');await page.getByText(f.invoice.invoice_number,{exact:true}).first().click();await page.getByRole('button',{name:'Edit Invoice',exact:true}).click();await page.getByLabel('Discount amount',{exact:true}).fill('125');await page.getByRole('button',{name:'Save & Update Invoice',exact:true}).click();await expect(page.getByRole('button',{name:'Edit Invoice',exact:true})).toBeVisible({timeout:20000});
 const updated=await page.evaluate(async()=>{const r=await fetch('./api/index.php?action=bootstrap');return (await r.json()).data;});expect(updated.invoices.find(i=>i.id===f.invoice.id).grand_total).toBe(2212.5);console.log('PASS: invoice discount edit and database totals');
 await nav('Files & Drive');await page.getByText(updated.clients.find(c=>c.id===f.client.id).name,{exact:true}).first().click();await page.getByRole('button',{name:'+ Upload File (Doc/PDF)',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'qa-ui.txt',mimeType:'text/plain',buffer:Buffer.from('Browser uploaded bytes')});await page.getByPlaceholder('e.g. Master_Service_Agreement_2026.pdf').fill('QA UI upload.txt');
 const notes=page.locator('label').filter({hasText:'Internal Notes'}).locator('..').locator('textarea');if(await notes.count())await notes.fill('Browser upload notes');
 await page.getByRole('button',{name:'Upload & Save File',exact:true}).click();await expect(page.getByText('QA UI upload.txt',{exact:true}).first()).toBeVisible({timeout:20000});console.log('PASS: real browser file upload form');
 expect(errors).toEqual([]);console.log('ALL PAGE AND EDITOR CHECKS PASSED');
}finally{await page.screenshot({path:'test-results/page-editors.png',fullPage:true});await browser.close();}
