import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base=process.env.TEST_URL || 'http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const nav=async name=>page.locator('aside').getByRole('button',{name,exact:true}).click();
try {
 await page.goto(base+'?tab=services',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Password',{exact:true}).fill(fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1]);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor();
 const add=page.getByRole('button',{name:'Add New Service Entry',exact:true});await expect(add).toBeVisible();await expect(add).toHaveAttribute('title','Add New Service Entry');expect(await add.innerText()).toBe('Add New Service Entry');await expect(add.locator('svg')).toBeVisible();await add.click();
 await expect(page.locator('#add-service-form')).toBeVisible();await expect(page.getByRole('button',{name:'Save Service to Catalog',exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'Back to Services Catalog',exact:true}).click();
 await nav('Clients Directory');await page.getByRole('button',{name:'View Profile',exact:true}).first().click();await expect(page.getByRole('button',{name:'Edit Profile',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Edit Profile',exact:true})).toHaveText('Edit Profile');
 await page.setViewportSize({width:390,height:844});const edit=page.getByRole('button',{name:'Edit Profile',exact:true});await expect(edit).toBeVisible();const box=await edit.boundingBox();expect(box.width).toBeGreaterThanOrEqual(40);expect(box.x+box.width).toBeLessThanOrEqual(390);await page.setViewportSize({width:1440,height:1000});
 for(const name of ['Dashboard','Services & Pricing','Renewals & Expiry','Invoices & Billing','Quotations','Files & Drive','Vendor Bills & Ledger','Web Infrastructure','Credential Vault','Projects & Tasks','Employees','Vendor Directory','Facebook Leads','Integrations & Settings','HR & Documents']){await nav(name);const actions=page.locator('button.portal-icon-action');expect(await actions.count()).toBeGreaterThan(0);const invalid=await actions.evaluateAll(buttons=>buttons.filter(b=>!b.getAttribute('aria-label')||!b.title||!b.querySelector('svg')||!b.querySelector('.portal-action-label')?.textContent.trim()).length);expect(invalid,name).toBe(0);}
 expect(errors).toEqual([]);console.log('PASS: icons with visible action names, service form navigation, client profile actions, mobile touch targets, and 15 portal pages without browser errors.');
} finally {await browser.close();}
