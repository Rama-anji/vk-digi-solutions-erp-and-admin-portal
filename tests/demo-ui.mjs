import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base='http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const password=fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1];
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('test-results/demo',{recursive:true});
try {
 await page.goto(base);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor();
 for(const name of ['Dashboard','Clients Directory','Services & Pricing','Renewals & Expiry','Invoices & Billing','Quotations','Files & Drive','Vendor Bills & Ledger','Web Infrastructure','Credential Vault','Projects & Tasks','Employees','Vendor Directory','Facebook Leads','Integrations & Settings','HR & Documents']) {
  await page.locator('aside').getByRole('button',{name,exact:true}).click();await expect(page.locator('main')).not.toBeEmpty();
  await page.screenshot({path:'test-results/demo/'+name.replaceAll(/[^a-z0-9]/gi,'-')+'.png',fullPage:true});
  expect(errors).toEqual([]);console.log('PASS: populated production page:',name);
 }
 await page.locator('aside').getByRole('button',{name:'Quotations',exact:true}).click();
 await page.getByRole('button',{name:'Prepare New Quotation'}).click();
 const form=page.locator('#quotation-builder-form');
 const service=form.locator('select').filter({has:page.locator('option').filter({hasText:'DEMO Custom Campaign'})}).first();
 const option=service.locator('option').filter({hasText:'DEMO Custom Campaign'});
 await service.selectOption(await option.getAttribute('value'));
 await expect(form.getByPlaceholder('e.g. 45 Days, 18 Months...')).toHaveValue('45 days');
 await page.getByRole('button',{name:'Add Line Item'}).click();
 console.log('PASS: custom service selection copies its duration and exposes the editor');
 await page.screenshot({path:'test-results/demo/custom-quotation.png',fullPage:true});
 expect(errors).toEqual([]);
} finally {await browser.close();}
