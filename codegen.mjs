import { chromium, firefox } from '@playwright/test';
import fs from 'fs/promises';

(async () => {
  const context = await firefox.launchPersistentContext(
    '/Users/doncyriac/Library/Application Support/Firefox',
    {
      headless: false,
      channel: 'firefox',
    }
  );
  // For macOS, use:
  // Microsoft Edge: '/Users/YourUsername/Library/Application Support/Microsoft Edge'
  // Google Chrome:  '/Users/YourUsername/Library/Application Support/Google/Chrome'
  const cookiesData = await fs.readFile(
    '/Users/doncyriac/smart-test-ui/playwright/.auth/user.json',
    'utf-8'
  );
  const cookies = JSON.parse(cookiesData);
  console.log(cookies.cookies);
  context.addCookies(cookies.cookies);
  const page = context.pages()[0];

  await page.pause(); // This will open Codegen if needed

  await context.close();
})();
