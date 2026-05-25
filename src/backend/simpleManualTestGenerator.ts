/**
 * Simple Manual Test Generator
 * Provides basic conversion from Playwright test scripts to manual test cases
 * without using AI/LLM services
 */

export interface SimpleManualTestCase {
  testCaseId: string;
  testDescription: string;
  prerequisites: string;
  testStep: string;
  expectedResult: string;
  status: string;
  category: string;
  estimatedTime: string;
  testData: string;
}

export class SimpleManualTestGenerator {
  /**
   * Convert a Playwright test script to manual test cases
   * This is a simple parser that extracts test steps from the script
   */
  static async convertTestScriptToManualTestCases(
    testScript: string,
    testName: string,
    testId: string
  ): Promise<SimpleManualTestCase[]> {
    const manualTestCases: SimpleManualTestCase[] = [];
    
    try {
      // Split script into lines
      const lines = testScript.split('\n');
      let testCaseCounter = 1;
      let currentTestCase: Partial<SimpleManualTestCase> = {};
      let stepBuffer: string[] = [];
      
      // Parse the script line by line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('//') || line.startsWith('/*')) {
          continue;
        }
        
        // Detect test blocks
        if (line.includes('test(') || line.includes('test.describe(')) {
          // Extract test description from test('description', ...)
          const match = line.match(/test\(['"`]([^'"`]+)['"`]/);
          if (match) {
            currentTestCase.testDescription = match[1];
          }
          continue;
        }
        
        // Detect page interactions
        if (line.includes('page.goto(')) {
          const urlMatch = line.match(/goto\(['"`]([^'"`]+)['"`]/);
          if (urlMatch) {
            stepBuffer.push(`Navigate to ${urlMatch[1]}`);
          }
        } else if (line.includes('page.click(')) {
          const selectorMatch = line.match(/click\(['"`]([^'"`]+)['"`]/);
          if (selectorMatch) {
            stepBuffer.push(`Click on element: ${selectorMatch[1]}`);
          }
        } else if (line.includes('page.fill(')) {
          const matches = line.match(/fill\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]*)['"`]/);
          if (matches) {
            stepBuffer.push(`Fill field ${matches[1]} with value: ${matches[2] || '[test data]'}`);
          }
        } else if (line.includes('page.type(')) {
          const matches = line.match(/type\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]*)['"`]/);
          if (matches) {
            stepBuffer.push(`Type into field ${matches[1]}: ${matches[2] || '[test data]'}`);
          }
        } else if (line.includes('page.selectOption(')) {
          const matches = line.match(/selectOption\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]*)['"`]/);
          if (matches) {
            stepBuffer.push(`Select option ${matches[2]} from ${matches[1]}`);
          }
        } else if (line.includes('page.check(')) {
          const selectorMatch = line.match(/check\(['"`]([^'"`]+)['"`]/);
          if (selectorMatch) {
            stepBuffer.push(`Check checkbox: ${selectorMatch[1]}`);
          }
        } else if (line.includes('page.uncheck(')) {
          const selectorMatch = line.match(/uncheck\(['"`]([^'"`]+)['"`]/);
          if (selectorMatch) {
            stepBuffer.push(`Uncheck checkbox: ${selectorMatch[1]}`);
          }
        } else if (line.includes('expect(')) {
          // Extract expectations
          const expectMatch = line.match(/expect\(([^)]+)\)/);
          if (expectMatch) {
            if (line.includes('toBeVisible()')) {
              stepBuffer.push(`Verify element is visible: ${expectMatch[1]}`);
            } else if (line.includes('toHaveText(')) {
              const textMatch = line.match(/toHaveText\(['"`]([^'"`]+)['"`]/);
              if (textMatch) {
                stepBuffer.push(`Verify text is: ${textMatch[1]}`);
              }
            } else if (line.includes('toContainText(')) {
              const textMatch = line.match(/toContainText\(['"`]([^'"`]+)['"`]/);
              if (textMatch) {
                stepBuffer.push(`Verify text contains: ${textMatch[1]}`);
              }
            } else if (line.includes('toHaveURL(')) {
              const urlMatch = line.match(/toHaveURL\(['"`]([^'"`]+)['"`]/);
              if (urlMatch) {
                stepBuffer.push(`Verify URL is: ${urlMatch[1]}`);
              }
            }
          }
        }
        
        // Create test case when we have accumulated steps
        if (stepBuffer.length > 0 && (line.includes('});') || i === lines.length - 1)) {
          if (stepBuffer.length >= 2) {
            const testCase: SimpleManualTestCase = {
              testCaseId: `TC_${String(testCaseCounter).padStart(3, '0')}`,
              testDescription: currentTestCase.testDescription || `${testName} - Test Case ${testCaseCounter}`,
              prerequisites: 'Application is accessible and user has valid credentials',
              testStep: stepBuffer.join('\n'),
              expectedResult: 'All steps execute successfully and verifications pass',
              status: 'Pending',
              category: 'UI Testing',
              estimatedTime: `${Math.max(5, stepBuffer.length * 2)} minutes`,
              testData: 'Use test data as specified in the steps'
            };
            
            manualTestCases.push(testCase);
            testCaseCounter++;
          }
          
          // Reset for next test case
          stepBuffer = [];
          currentTestCase = {};
        }
      }
      
      // If no test cases were generated, create a default one
      if (manualTestCases.length === 0) {
        manualTestCases.push({
          testCaseId: 'TC_001',
          testDescription: testName || 'Default Test Case',
          prerequisites: 'Application is accessible',
          testStep: 'Execute the test script as defined',
          expectedResult: 'Test completes successfully',
          status: 'Pending',
          category: 'UI Testing',
          estimatedTime: '10 minutes',
          testData: 'Use appropriate test data'
        });
      }
      
      return manualTestCases;
      
    } catch (error) {
      console.error('Error converting test script to manual test cases:', error);
      // Return a default test case on error
      return [{
        testCaseId: 'TC_001',
        testDescription: testName || 'Test Case',
        prerequisites: 'Application is accessible',
        testStep: 'Execute the test script manually',
        expectedResult: 'Test completes successfully',
        status: 'Pending',
        category: 'UI Testing',
        estimatedTime: '10 minutes',
        testData: 'Use appropriate test data'
      }];
    }
  }
}