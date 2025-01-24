import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
    await page.goto('https://cleartax-qa-http.internal.cleartax.co/services/');
    await page.getByRole('button', { name: 'Login/Register' }).click();
    await page.getByPlaceholder('Enter email').click();
    await page.getByPlaceholder('Enter email').fill('clear.testingdashboard+adminrm@gmail.com');
    await page.getByPlaceholder('Password').click();
    await page.getByPlaceholder('Password').fill('dashboardADMINRM1!');
    await page.getByRole('button', { name: 'Login' }).click();
  // Wait until the page receives the cookies.
  //
  // Sometimes login flow sets cookies in the process of several redirects.
  // Wait for the final URL to ensure that the cookies are actually set.
  await page.waitForURL('https://cleartax-qa-http.internal.cleartax.co/services/');
  // Alternatively, you can wait until the page reaches a state where all cookies are set.

  await page.context().storageState({ path: authFile });
});