import { test, expect } from '@playwright/test';

test.use({
  storageState: 'playwright/.auth/user.json'
});

test('test', async ({ page }) => {
  await page.goto('https://cleartax-dev-http.internal.cleartax.co/filing/2024/134/vPmFYpDDNEWLGWpiJ77XuQ/add-register-client');
  await page.goto('https://sso-dev-pub.internal.cleartax.co/v2?product=cleartax&return_path=L2ZpbGluZy8yMDI0LzEzNC92UG1GWXBERE5FV0xHV3BpSjc3WHVRL2FkZC1yZWdpc3Rlci1jbGllbnQ=');
  await page.goto('https://cleartax-dev-http.internal.cleartax.co/filing/2024/134/vPmFYpDDNEWLGWpiJ77XuQ/add-register-client');
  await page.getByLabel('Enter OTP sent toMobile').click();
  await page.getByLabel('Enter OTP sent toMobile').fill('1234112');
  await page.getByLabel('Enter OTP sent toEmail').click();
  await page.getByLabel('Enter OTP sent toEmail').fill('1232133');
  await expect(page.getByRole('button', { name: 'Verify OTP' })).toBeVisible();
  page.once('dialog', dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    dialog.dismiss().catch(() => {});
  });
  await page.getByRole('button', { name: 'Verify OTP' }).click();
});