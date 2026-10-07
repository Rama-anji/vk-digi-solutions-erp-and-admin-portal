import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base='http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const page=await browser.newPage();
try {
 await page.goto(base+'auth/login.php');
 await page.getByLabel('Password',{exact:true}).fill(fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1]);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor();
 for(const [path,tab] of [['clients/index.php','clients'],['renewals/index.php','renewals'],['invoices/index.php','invoices'],['vendors/bills.php','vendors'],['hr/documents.php','hr'],['vault/index.php','vault']]) {
  const response=await page.goto(base+path);expect(response.status()).toBe(200);await page.locator('aside').waitFor();
  expect(new URL(page.url()).searchParams.get('tab')).toBe(tab);await expect(page.locator('main')).not.toBeEmpty();console.log('PASS: legacy bookmark:',path);
 }
 await page.goto(base+'clients/add.php');await expect(page.getByPlaceholder('e.g. Apex Global Logistics Ltd')).toBeVisible();console.log('PASS: legacy add-client link opens the existing form');
} finally {await browser.close();}
