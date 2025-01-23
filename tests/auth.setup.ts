import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Perform authentication steps. Replace these actions with your own.

  await page.goto('https://cleartax-qa-http.internal.cleartax.co/services/');
  await page.getByRole('button', { name: 'Login/Register' }).click();
  await page.getByPlaceholder('Enter email').click();
  await page
    .getByPlaceholder('Enter email')
    .fill('clear.testingdashboard+rm@gmail.com');
  await page
    .locator('#mainContent div')
    .filter({ hasText: 'Welcome! Create your account' })
    .nth(3)
    .click();
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('dashboardRM1!');
  await page.getByRole('button', { name: 'Login' }).click();

  // End of authentication steps.

  await page.context().storageState({ path: authFile });
});
