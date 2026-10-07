import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base='http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const password=fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1];
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor({timeout:30000});
 for(const name of ['Dashboard','Clients Directory','Services & Pricing','Renewals & Expiry','Invoices & Billing','Quotations','Files & Drive','Vendor Bills & Ledger','Web Infrastructure','Credential Vault','Projects & Tasks','Employees','Vendor Directory','Facebook Leads','Integrations & Settings','HR & Documents']){await page.locator('aside').getByRole('button',{name,exact:true}).click();expect(await page.locator('main').innerText()).not.toBe('');}
 await page.getByRole('button',{name:'Integrations & Settings',exact:true}).click();await page.getByRole('button',{name:'whatsapp',exact:true}).click();await expect(page.locator('code').filter({hasText:'whatsapp_webhook.php'})).toContainText('/vk-digi-solutions-erp-%26-admin-portal/api/whatsapp_webhook.php');
 for(const path of ['.storage/initial-login.txt','api/config.local.php','api/setup.php','db.sql','tests/cleanup.php'])expect((await page.request.get(base+path)).status()).toBe(403);
 expect(errors).toEqual([]);await page.screenshot({path:'test-results/production.png',fullPage:true});console.log('PASS: XAMPP production login, all 16 pages, subfolder webhook URL and private-file protection');
}finally{await browser.close();}
