import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base=process.env.TEST_URL || 'http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage();page.setDefaultTimeout(30000);
try {
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.getByLabel('Password',{exact:true}).fill(fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1]);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor();
 const snapshot=await(await page.request.get(base+'api/index.php?action=bootstrap')).json();
 const client=snapshot.data.clients[0],service=snapshot.data.services[0];
 snapshot.data.subscriptions.push({id:-1234,client_id:client.id,client_name:client.name,service_id:service.id,service_name:service.service_name,status:'Expired',billing_cycle:'Monthly',start_date:'2020-01-01',expiry_date:'2020-02-01',amount:123,auto_renew:false});
 await page.route('**/api/index.php?action=bootstrap',route=>route.fulfill({json:snapshot}));
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.evaluate(()=>window.dispatchEvent(new Event('portal:refresh')));
 const expiry=page.getByRole('alert',{name:'Expired services'});await expect(expiry).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('portal:error',{detail:'Popup timer test'})));
 const error=page.getByRole('alert').filter({hasText:'Popup timer test'});await expect(error).toBeVisible();
 await page.clock.fastForward(9000);await expect(expiry).toBeVisible();await expect(error).toBeVisible();
 await page.clock.fastForward(1001);await expect(expiry).toHaveCount(0);await expect(error).toHaveCount(0);
 await page.evaluate(()=>window.dispatchEvent(new Event('portal:refresh')));await page.clock.fastForward(3000);await expect(expiry).toHaveCount(0);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('portal:error',{detail:'Popup timer test'})));await expect(error).toBeVisible();
 await page.clock.fastForward(6000);await page.evaluate(()=>window.dispatchEvent(new CustomEvent('portal:error',{detail:'Popup timer test'})));await page.clock.fastForward(5000);await expect(error).toBeVisible();await page.clock.fastForward(5001);await expect(error).toHaveCount(0);
 console.log('PASS: expiry and error alerts remain for 9 seconds, close after 10, expiry does not repeat on refresh, repeated messages restart their timer. No database changes.');
} finally { await browser.close(); }
