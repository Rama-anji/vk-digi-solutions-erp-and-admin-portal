import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base=process.env.TEST_URL || 'http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage();page.setDefaultTimeout(30000);
let serviceId,csrf;const errors=[];page.on('pageerror',e=>errors.push(e.message));
const snapshot=async()=>(await(await page.request.get(base+'api/index.php?action=bootstrap')).json()).data;
try {
 await page.goto(base+'?tab=services',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Password',{exact:true}).fill(fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1]);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor();
 csrf=(await(await page.request.get(base+'api/index.php?action=session')).json()).csrf;
 const data=await snapshot(),client=data.clients[0];const title='Client service flow QA '+Date.now();
 await page.getByRole('button',{name:'Add New Service Entry',exact:true}).click();
 const form=page.locator('#add-service-form');
 await form.getByLabel('Assign to client',{exact:true}).selectOption(String(client.id));
 await form.getByLabel('Service start date').fill('2027-01-01');await form.getByLabel('Service end date').fill('2027-02-01');
 await form.getByPlaceholder('e.g. Enterprise Cloud Infrastructure AMC, UI/UX Design Sprint...').fill(title);
 await form.locator('input[type=number]').fill('321.45');
 const saved=page.waitForResponse(r=>r.url().includes('action=save')&&r.request().method()==='POST');
 await form.getByRole('button',{name:'Save Service & View Client Profile',exact:true}).click();
 const response=await saved,result=await response.json();expect(response.status(),JSON.stringify(result)).toBe(200);serviceId=result.result.id;
 const subs=(await snapshot()).subscriptions.filter(s=>s.service_id===serviceId);expect(subs).toHaveLength(1);expect(subs[0].client_id).toBe(client.id);
 await expect(page.getByRole('heading',{name:client.name,exact:true})).toBeVisible();
 await expect(page.locator(`[data-subscription-id="${subs[0].id}"]`)).toContainText(title);
 await expect(page.locator(`[data-subscription-id="${subs[0].id}"]`)).toContainText('321.45');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('aside').waitFor();
 await page.getByPlaceholder('Search by name, code, contact, city...').fill(client.client_code);
 await expect(page.locator('tr').filter({hasText:client.client_code})).toContainText(title);
 await page.getByRole('button',{name:'View Profile',exact:true}).click();await expect(page.locator(`[data-subscription-id="${subs[0].id}"]`)).toContainText(title);
 const invalidTitle=title+' invalid';
 const failed=await page.request.post(base+'api/index.php?action=save',{headers:{'X-CSRF-Token':csrf},data:{resource:'services',data:{service_name:invalidTitle,category:'Web Development',default_rate:100,billing_frequency:'Monthly',description:'QA',status:'Active',client_assignment:{client_id:client.id,start_date:'2027-02-01',expiry_date:'2027-01-01',auto_renew:false}}}});
 expect(failed.ok()).toBe(false);expect((await snapshot()).services.some(s=>s.service_name===invalidTitle)).toBe(false);
 expect(errors).toEqual([]);console.log('PASS: create and assign from Services, automatic client profile, directory and reload persistence, invalid dates leave no service.');
} finally {
 if(serviceId){const data=await snapshot();for(const sub of data.subscriptions.filter(s=>s.service_id===serviceId)){const r=await page.request.post(base+'api/index.php?action=delete',{headers:{'X-CSRF-Token':csrf},data:{resource:'subscriptions',id:sub.id}});expect(r.ok()).toBe(true);}const r=await page.request.post(base+'api/index.php?action=delete',{headers:{'X-CSRF-Token':csrf},data:{resource:'services',id:serviceId}});expect(r.ok()).toBe(true);console.log('Test records removed.');}
 await browser.close();
}
