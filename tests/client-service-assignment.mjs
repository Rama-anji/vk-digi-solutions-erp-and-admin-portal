import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base=process.env.TEST_URL || 'http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage();page.setDefaultTimeout(30000);let createdId,csrf;const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base+'?tab=clients',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Password',{exact:true}).fill(fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1]);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor();
 const data=(await(await page.request.get(base+'api/index.php?action=bootstrap')).json()).data;
 csrf=(await(await page.request.get(base+'api/index.php?action=session')).json()).csrf;
 const client=data.clients[0],service=data.services.find(s=>s.status!=='Inactive');
 const open=async()=>{await page.getByPlaceholder(/Search/i).last().fill(client.client_code);await page.getByRole('button',{name:'View Profile',exact:true}).click();};
 await open();await page.getByRole('button',{name:'Add service to client',exact:true}).click();
 const form=page.locator('form').filter({has:page.getByRole('heading',{name:'Assign a service',exact:true})});
 await form.getByLabel('Service',{exact:true}).selectOption(String(service.id));
 await form.getByLabel('Billing cycle',{exact:true}).selectOption('Monthly');
 await form.getByLabel('Client rate (INR)',{exact:true}).fill('123.45');
 await form.getByLabel('Service start date').fill('2027-01-01');await form.getByLabel('Service end date').fill('2027-02-01');
 const saved=page.waitForResponse(r=>r.url().includes('action=save')&&r.request().method()==='POST');
 await form.getByRole('button',{name:'Save client service',exact:true}).click();const response=await saved;const result=await response.json();expect(response.status(),JSON.stringify(result)).toBe(200);createdId=result.result.id;
 await expect(page.locator(`[data-subscription-id="${createdId}"]`)).toContainText(service.service_name);
 await expect(page.locator(`[data-subscription-id="${createdId}"]`)).toContainText('123.45');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('aside').waitFor();await open();await expect(page.locator(`[data-subscription-id="${createdId}"]`)).toBeVisible();
 await page.getByRole('button',{name:'Back to Clients Directory',exact:true}).click();await expect(page.locator('tr').filter({hasText:client.client_code})).toContainText(service.service_name);
 expect(errors).toEqual([]);console.log('PASS: service saves, appears in correct profile and directory, and persists after reload.');
} finally {if(createdId){const r=await page.request.post(base+'api/index.php?action=delete',{headers:{'X-CSRF-Token':csrf},data:{resource:'subscriptions',id:createdId}});console.log('Test record cleanup:',r.status());}await browser.close();}
