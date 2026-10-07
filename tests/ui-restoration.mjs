import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const base='http://localhost/vk-digi-solutions-erp-%26-admin-portal/';
const password=fs.readFileSync('.storage/initial-login.txt','utf8').match(/Password: (.+)/)[1];
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/KEEP SMILE/AppData/Local/ms-playwright/chromium-1232/chrome-win64/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:1040}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(base);await expect(page.getByRole('heading',{name:'Admin Portal Sign In'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toHaveCSS('background-color','rgb(239, 124, 0)');
 await page.getByRole('button',{name:'Forgot password?',exact:true}).click();await expect(page.getByRole('status')).toContainText('Contact your administrator');await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
 await page.getByLabel('Password',{exact:true}).fill('incorrect-test-password');await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');await page.getByRole('button',{name:'Hide password',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Incorrect');console.log('PASS: original login styling, password controls and real error handling');
 await page.getByLabel('Password',{exact:true}).fill('');await page.reload();await page.screenshot({path:'test-results/restored-login-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/restored-login-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.setViewportSize({width:1440,height:1040});
 await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('aside').waitFor({timeout:30000});console.log('PASS: restored login authenticates with the live backend');
 for(const name of ['Web Infrastructure','Credential Vault','Employees','Vendor Directory','Facebook Leads']){
  await page.locator('aside').getByRole('button',{name,exact:true}).click();await expect(page.locator('.portal-section-header')).toBeVisible();await page.getByRole('button',{name:'Add record',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Save',exact:true})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);console.log('PASS: styled directory and editor:',name);
 }
 await page.locator('aside').getByRole('button',{name:'Web Infrastructure',exact:true}).click();await page.screenshot({path:'test-results/restored-infrastructure.png',fullPage:true});await page.getByRole('button',{name:'Add record',exact:true}).click();await page.screenshot({path:'test-results/restored-editor.png',fullPage:true});await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.locator('aside').getByRole('button',{name:'Integrations & Settings',exact:true}).click();await expect(page.getByLabel('Legal company name')).toBeVisible();await page.getByRole('button',{name:'Email / SMTP',exact:true}).click();await expect(page.getByLabel('SMTP host',{exact:true})).toBeVisible();await page.screenshot({path:'test-results/restored-settings.png',fullPage:true});
 await page.locator('aside').getByRole('button',{name:'HR & Documents',exact:true}).click();await expect(page.getByRole('heading',{name:'HR & Documents'})).toBeVisible();await page.screenshot({path:'test-results/restored-hr.png',fullPage:true});
 expect(errors).toEqual([]);console.log('ALL RESTORED UI CHECKS PASSED; no business records changed');
}finally{await browser.close();}
