const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Embedded Playwright to Steps converter
class PlaywrightToStepsConverter {
  constructor() {
    this.stepId = 1;
  }

  convertToSteps(playwrightScript, testName = 'Untitled Test') {
    this.stepId = 1;
    const steps = [];
    
    const cleanScript = this.cleanScript(playwrightScript);
    const lines = cleanScript.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const step = this.parseLineToStep(line.trim());
      if (step) {
        steps.push(step);
      }
    }

    return {
      testName,
      steps,
      metadata: {
        convertedAt: new Date().toISOString(),
        originalFormat: 'playwright',
        version: '1.0'
      }
    };
  }

  formatStepsForDisplay(stepsFormat) {
    const imports = `import { test, expect } from '@playwright/test';\n\ntest.use({\n  storageState: '.auth/role1.json'\n});\n\n`;
    const testStart = `test('${stepsFormat.testName}', async ({ page }) => {\n`;
    const testEnd = `});`;
    
    let stepsCode = '';
    
    stepsFormat.steps.forEach((step, index) => {
      const stepDescription = step.description.replace(/'/g, "\\'"); // Escape single quotes
      stepsCode += `  await test.step('${index + 1}. ${stepDescription}', async () => {\n`;
      stepsCode += `    ${step.originalCode}\n`;
      stepsCode += `  });\n\n`;
    });
    
    return imports + testStart + stepsCode + testEnd;
  }

  cleanScript(script) {
    let cleaned = script.replace(/import.*from.*['"].*['"];?\n?/g, '');
    cleaned = cleaned.replace(/test\.use\(\{[\s\S]*?\}\);?\n?/g, '');
    cleaned = cleaned.replace(/test\(['"].*['"],\s*async\s*\(\{\s*page\s*\}\)\s*=>\s*\{/, '');
    cleaned = cleaned.replace(/\}\);?\s*$/, '');
    cleaned = cleaned.trim();
    return cleaned;
  }

  parseLineToStep(line) {
    if (!line || line.startsWith('//') || line === '{' || line === '}') {
      return null;
    }

    const step = {
      id: this.stepId++,
      action: 'unknown',
      description: 'Unknown action',
      originalCode: line
    };

    if (line.includes('page.goto(')) {
      const urlMatch = line.match(/page\.goto\(['"]([^'"]+)['"]\)/);
      step.action = 'navigate';
      step.target = urlMatch ? urlMatch[1] : '';
      step.description = `Navigate to ${step.target}`;
    }
    else if (line.includes('.click()')) {
      const selectorMatch = line.match(/page\.locator\(['"]([^'"]+)['"]\).*\.click\(\)/);
      if (!selectorMatch) {
        const directMatch = line.match(/page\.click\(['"]([^'"]+)['"]\)/);
        step.target = directMatch ? directMatch[1] : '';
      } else {
        step.target = selectorMatch[1];
      }
      step.action = 'click';
      step.description = `Click on element: ${step.target}`;
    }
    else if (line.includes('.fill(')) {
      const matches = line.match(/page\.locator\(['"]([^'"]+)['"]\).*\.fill\(['"]([^'"]*)['"]\)/);
      if (matches) {
        step.target = matches[1];
        step.value = matches[2];
      }
      step.action = 'fill';
      step.description = `Fill "${step.target}" with "${step.value}"`;
    }
    else if (line.includes('.type(')) {
      const matches = line.match(/page\.locator\(['"]([^'"]+)['"]\).*\.type\(['"]([^'"]*)['"]\)/);
      if (matches) {
        step.target = matches[1];
        step.value = matches[2];
      }
      step.action = 'type';
      step.description = `Type "${step.value}" in "${step.target}"`;
    }
    else if (line.includes('expect(')) {
      const expectMatch = line.match(/expect\(.*\)\.(.+)\(/);
      step.action = 'assert';
      step.description = `Assert: ${expectMatch ? expectMatch[1] : 'condition'}`;
    }
    else {
      step.action = 'custom';
      step.description = `Custom action: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`;
    }

    return step;
  }
}

const playwrightConverter = new PlaywrightToStepsConverter();

// import path from "path"
// import fs from "fs"
// import { execSync } from "child_process";
const currentDir = __dirname; //will be inside webpack
const rootDir = path.resolve(currentDir, '../../'); // More levels up as needed
const extractLastGotoUrl = (testScript) => {
  const gotoRegex = /page\.goto\(['"]([^'"]+)['"]\)/g;
  const matches = [...testScript.matchAll(gotoRegex)];

  if (matches.length > 0) {
    return matches[matches.length - 1][1]; // Return the last match
  }

  return null;
};

process.parentPort.on('message', async (e) => {
  switch (e.data.type) {
    case 'run':
      {
        const filePath = path.join(rootDir, 'test.spec.js');
        await fs.writeFileSync(filePath, e.data.testCase);
        // Extract the last `goto` URL
        const data = fs.readFileSync(filePath, 'utf8');
        const lastGotoUrl = extractLastGotoUrl(data);

        const headedFlag = e.data.headless ? '' : '--headed';
        const workersFlag = e.data.headless ? '--workers=5 --max-failures=0' : '';

        const environmentConfig = {
          QA:   { baseUrl: 'https://cleartax-qa-http.internal.cleartax.co', buildEnv: 'qa' },
          DEV:  { baseUrl: 'https://cleartax-dev-http.internal.cleartax.co', buildEnv: 'dev' },
          PROD: { baseUrl: 'https://cleartax.in', buildEnv: 'prod' },
        };

        const environment = e.data.environment || 'QA';
        const envConfig = environmentConfig[environment] || environmentConfig.QA;
        const { baseUrl, buildEnv } = envConfig;

        const command = `BASE_URL=${baseUrl} playwright test test.spec.js ${headedFlag} ${workersFlag} --reporter=html ${e.data.projects
          .map((project) => '--project=' + project + ' ')
          .join('')} ${lastGotoUrl} `;
        console.info('Executing tests:', command);

        try {
          const output = execSync(command, {
            timeout: 7200000, // 2 hours (7,200,000 ms = 7,200 s = 120 min)
            stdio: 'inherit',
            maxBuffer: 50 * 1024 * 1024, // 50 MB stdout/stderr buffer
            env: {
              ...process.env,
              BASE_URL: baseUrl,
              BUILD_ENV: buildEnv,
            }
          });
          process.exit(0);
        } catch (e) {
          console.error('Playwright execution failed:', e.message);
          process.exit(e.status || 1);
        }
      }
      break;

    case 'record': {
      let startUrl = 'https://cleartax-qa-http.internal.cleartax.co/';
      if (e.data.startUrl) {
        startUrl = e.data.startUrl;
      }
      console.log('record start url', startUrl);
      
      // Use role1.json for consistent authentication across both DIY and AF modes
      // role1.json is set up with QA environment authentication
      const authFile = '.auth/role1.json';
      
      try {
        console.log('>RECIRDstart>>>>> using auth file:', authFile);
        const output = execSync(
          `npx playwright codegen -o test.spec.js --load-storage=${authFile} ${startUrl}`
        );
        const filePath = path.join(rootDir, 'test.spec.js');
        const playwrightScript = fs.readFileSync(filePath, 'utf8');
        console.log('Original Playwright script:', playwrightScript);
        
        // Convert Playwright script to .steps format
        const stepsFormat = playwrightConverter.convertToSteps(playwrightScript, 'Recorded Test');
        const stepsDisplay = playwrightConverter.formatStepsForDisplay(stepsFormat);
        
        console.log('Converted to .steps format:', stepsDisplay);
        
        // Send the .steps format to the UI
        process.parentPort.postMessage(stepsDisplay);
      } catch (e) {
        console.error('Recording failed:', e);
        process.exit();
      }

      process.exit();
    }
  }
});
