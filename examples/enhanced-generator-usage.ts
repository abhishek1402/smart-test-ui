/**
 * Enhanced Manual Test Generator - Usage Examples
 * 
 * This file demonstrates how to use the enhanced manual test case generator
 * with Gemini API integration.
 */

import EnhancedManualTestGenerator from '../src/backend/enhancedManualTestGenerator';

// Example 1: Basic Usage - Frontend Test
async function exampleFrontendGeneration() {
  const playwrightScript = `
    import { test, expect } from '@playwright/test';

    test('user login flow', async ({ page }) => {
      await page.goto('https://example.com/login');
      await page.locator('#username').fill('testuser@example.com');
      await page.locator('#password').fill('password123');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.dashboard')).toBeVisible();
    });
  `;

  try {
    console.log('🚀 Generating frontend test cases...');
    const csvOutput = await EnhancedManualTestGenerator.generateTestcasesFromContent(
      playwrightScript,
      '', // No logs
      null // No script path
    );

    console.log('✅ Generated CSV:');
    console.log(csvOutput);
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('frontend-test-cases.csv', csvOutput);
    console.log('📄 Saved to frontend-test-cases.csv');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example 2: Backend API Test
async function exampleBackendGeneration() {
  const playwrightScript = `
    import { test, expect } from '@playwright/test';

    test('API endpoints test', async ({ request }) => {
      // GET request
      const getResponse = await request.get('/api/users');
      expect(getResponse.status()).toBe(200);

      // POST request
      const postResponse = await request.post('/api/users', {
        data: { name: 'John Doe', email: 'john@example.com' }
      });
      expect(postResponse.status()).toBe(201);

      // PUT request
      const putResponse = await request.put('/api/users/1', {
        data: { name: 'Jane Doe' }
      });
      expect(putResponse.status()).toBe(200);

      // DELETE request
      const deleteResponse = await request.delete('/api/users/1');
      expect(deleteResponse.status()).toBe(204);
    });
  `;

  const logs = `
    GET /api/users 200 OK
    POST /api/users 201 Created
    PUT /api/users/1 200 OK
    DELETE /api/users/1 204 No Content
  `;

  try {
    console.log('🚀 Generating backend test cases...');
    const csvOutput = await EnhancedManualTestGenerator.generateTestcasesFromContent(
      playwrightScript,
      logs,
      '/path/to/api-test.spec.ts'
    );

    console.log('✅ Generated CSV:');
    console.log(csvOutput);
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('backend-test-cases.csv', csvOutput);
    console.log('📄 Saved to backend-test-cases.csv');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example 3: Using with IPC in Electron
async function exampleElectronIPC() {
  // In your renderer process (React component):
  const handleGenerateTestCases = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('convertToManualTestCasesEnhanced', {
        testScript: playwrightScriptContent,
        logs: executionLogs,
        scriptPath: scriptFilePath
      });

      if (result.success) {
        console.log(`✅ Generated ${result.count} test cases`);
        
        // Download CSV
        const blob = new Blob([result.csvOutput], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'manual-test-cases.csv';
        a.click();
      } else {
        console.error('❌ Generation failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };
}

// Example 4: Batch Processing Multiple Scripts
async function exampleBatchProcessing() {
  const scripts = [
    { name: 'Login Test', content: '...' },
    { name: 'Checkout Test', content: '...' },
    { name: 'Profile Test', content: '...' }
  ];

  for (const script of scripts) {
    try {
      console.log(`🚀 Processing: ${script.name}`);
      const csvOutput = await EnhancedManualTestGenerator.generateTestcasesFromContent(
        script.content,
        '',
        null
      );

      const fs = require('fs');
      const filename = `${script.name.toLowerCase().replace(/\s+/g, '-')}-test-cases.csv`;
      fs.writeFileSync(filename, csvOutput);
      console.log(`✅ Saved: ${filename}`);
    } catch (error) {
      console.error(`❌ Error processing ${script.name}:`, error);
    }
  }
}

// Run examples (uncomment to test)
// exampleFrontendGeneration();
// exampleBackendGeneration();
// exampleBatchProcessing();

export {
  exampleFrontendGeneration,
  exampleBackendGeneration,
  exampleElectronIPC,
  exampleBatchProcessing
};