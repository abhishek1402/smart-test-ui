import { test as setup } from '@playwright/test';
import path from 'path';

const role1AuthFile = path.join(__dirname, '../.auth/role1.json');
const role2AuthFile = path.join(__dirname, '../.auth/role2.json');
const role3AuthFile = path.join(__dirname, '../.auth/role3.json');
const roleLogins = [
  {
    roleType: 'user',
    userName: 'dadog48694@getasail.com',
    password: 'Dadog48694@getasail.com',
    authFile: role1AuthFile,
  },
  {
    roleType: 'rm',
    userName: 'clear.testingdashboard+rm@gmail.com',
    password: 'dashboardRM1!',
    authFile: role2AuthFile,
  },
  {
    roleType: 'sp',
    userName: 'clear.testingdashboard+ca@gmail.com',
    password: 'dashboardCA1!',
    authFile: role3AuthFile,
  },
];
roleLogins.forEach((roleLogin) => {
  setup(`authenticate ${roleLogin.roleType}`, async ({ page }) => {
    // Perform authentication steps. Replace these actions with your own.
    //await page.goto('https://cleartax.in/s/pricing');
    await page.goto('https://cleartax-qa-http.internal.cleartax.co/s/pricing');
    await page.getByRole('button', { name: 'Login/Signup' }).click();
    await page.getByPlaceholder('Enter email').click();
    await page.getByPlaceholder('Enter email').fill(roleLogin.userName);
    await page
      .locator('#mainContent div')
      .filter({ hasText: 'Welcome! Create your account' })
      .nth(3)
      .click();
    await page.getByPlaceholder('Password').click();
    await page.getByPlaceholder('Password').fill(roleLogin.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('https://cleartax-qa-http.internal.cleartax.co/s/pricing');
    //await page.waitForURL('https://cleartax.in/s/pricing');
    // End of authentication steps.

    await page.context().storageState({ path: roleLogin.authFile });
  });
});
