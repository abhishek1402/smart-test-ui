/**
 * Converts Playwright test scripts to proprietary .steps format
 */

class PlaywrightToStepsConverter {
  constructor() {
    this.stepId = 1;
  }

  /**
   * Converts a Playwright test script to .steps format
   */
  convertToSteps(playwrightScript, testName = 'Untitled Test') {
    this.stepId = 1;
    const steps = [];
    
    // Remove imports and test wrapper
    const cleanScript = this.cleanScript(playwrightScript);
    
    // Split into lines and process each line
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

  /**
   * Converts .steps format back to Playwright script
   */
  convertToPlaywright(stepsFormat) {
    const imports = `import { test, expect } from '@playwright/test';\n\ntest.use({\n  storageState: '.auth/role1.json'\n});\n\n`;
    const testStart = `test('${stepsFormat.testName}', async ({ page }) => {\n`;
    const testEnd = `});`;
    
    const playwrightLines = stepsFormat.steps.map(step => `  ${step.originalCode}`);
    
    return imports + testStart + playwrightLines.join('\n') + '\n' + testEnd;
  }

  /**
   * Formats .steps for display in UI
   */
  formatStepsForDisplay(stepsFormat) {
    let output = `# ${stepsFormat.testName}\n\n`;
    
    stepsFormat.steps.forEach((step, index) => {
      output += `## Step ${index + 1}: ${step.description}\n`;
      output += `**Action:** ${step.action}\n`;
      if (step.target) output += `**Target:** ${step.target}\n`;
      if (step.value) output += `**Value:** ${step.value}\n`;
      output += `**Code:** \`${step.originalCode}\`\n\n`;
    });
    
    output += `---\n*Converted from Playwright on ${new Date(stepsFormat.metadata.convertedAt).toLocaleString()}*`;
    
    return output;
  }

  cleanScript(script) {
    // Remove imports
    let cleaned = script.replace(/import.*from.*['"].*['"];?\n?/g, '');
    
    // Remove test.use block
    cleaned = cleaned.replace(/test\.use\(\{[\s\S]*?\}\);?\n?/g, '');
    
    // Remove test wrapper
    cleaned = cleaned.replace(/test\(['"].*['"],\s*async\s*\(\{\s*page\s*\}\)\s*=>\s*\{/, '');
    cleaned = cleaned.replace(/\}\);?\s*$/, '');
    
    // Remove extra whitespace
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

    // Parse different Playwright actions
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
    else if (line.includes('.press(')) {
      const matches = line.match(/page\.locator\(['"]([^'"]+)['"]\).*\.press\(['"]([^'"]*)['"]\)/);
      if (matches) {
        step.target = matches[1];
        step.value = matches[2];
      }
      step.action = 'press';
      step.description = `Press "${step.value}" on "${step.target}"`;
    }
    else if (line.includes('.selectOption(')) {
      const matches = line.match(/page\.locator\(['"]([^'"]+)['"]\).*\.selectOption\(['"]([^'"]*)['"]\)/);
      if (matches) {
        step.target = matches[1];
        step.value = matches[2];
      }
      step.action = 'select';
      step.description = `Select "${step.value}" from "${step.target}"`;
    }
    else if (line.includes('expect(')) {
      const expectMatch = line.match(/expect\(.*\)\.(.+)\(/);
      step.action = 'assert';
      step.description = `Assert: ${expectMatch ? expectMatch[1] : 'condition'}`;
    }
    else if (line.includes('.hover()')) {
      const selectorMatch = line.match(/page\.locator\(['"]([^'"]+)['"]\).*\.hover\(\)/);
      step.target = selectorMatch ? selectorMatch[1] : '';
      step.action = 'hover';
      step.description = `Hover over element: ${step.target}`;
    }
    else if (line.includes('.waitFor')) {
      step.action = 'wait';
      step.description = 'Wait for element or condition';
    }
    else {
      // Generic action
      step.action = 'custom';
      step.description = `Custom action: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`;
    }

    return step;
  }
}

// Export singleton instance
const playwrightConverter = new PlaywrightToStepsConverter();

module.exports = {
  PlaywrightToStepsConverter,
  playwrightConverter
};