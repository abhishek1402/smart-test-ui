import { ipcMain } from 'electron';
import TestServies from '../testService';
import ManualTestCaseService from '../manualTestCaseService';
import { SimpleManualTestGenerator } from '../simpleManualTestGenerator';
import EnhancedManualTestGenerator from '../enhancedManualTestGenerator';

export function registerManualTestCaseHandlers() {
  // Generate manual test cases handler
  ipcMain.handle('generateManualTestCases', async (event: any, arg: any) => {
    try {
      const testCases = await TestServies.getAllTestCases();
      const automatedTest = testCases.find((tc: any) => tc._id === arg.automatedTestId) as any;
      
      if (!automatedTest) {
        return { success: false, message: 'Automated test case not found' };
      }
      
      const result = await ManualTestCaseService.generateManualTestCases(
        arg.automatedTestId,
        arg.testName || automatedTest.name,
        automatedTest.test,
        arg.serialNumber
      );
      
      return result;
    } catch (error: any) {
      console.error('Error generating manual test cases:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Get manual test cases handler
  ipcMain.handle('getManualTestCases', async (event: any, arg: any) => {
    try {
      // Get the current test case to check if script has changed
      const testCases = await TestServies.getAllTestCases();
      const automatedTest = testCases.find((tc: any) => tc._id === arg.automatedTestId) as any;
      
      if (!automatedTest) {
        return { success: false, message: 'Automated test case not found' };
      }
      
      // Check if manual test cases need regeneration due to script changes
      const needsRegeneration = await ManualTestCaseService.needsRegeneration(
        arg.automatedTestId,
        automatedTest.test
      );
      
      if (needsRegeneration) {
        console.log('⚠️ Test script has changed - automatically regenerating manual test cases...');
        
        // Auto-regenerate manual test cases for the updated script
        const regenerateResult = await ManualTestCaseService.generateManualTestCases(
          arg.automatedTestId,
          automatedTest.name,
          automatedTest.test,
          arg.serialNumber || 1
        );
        
        if (regenerateResult.success) {
          console.log('✅ Manual test cases automatically regenerated for updated script');
          return { success: true, data: regenerateResult.data, autoRegenerated: true };
        } else {
          console.error('❌ Failed to auto-regenerate manual test cases:', regenerateResult.message);
          return {
            success: false,
            message: `Test script has been updated but auto-regeneration failed: ${regenerateResult.message}. Please try clicking "Generate Manual TC" manually.`,
            scriptChanged: true
          };
        }
      }
      
      const manualTestSuite = await TestServies.getManualTestCasesFromTestCase(arg.automatedTestId);
      
      if (manualTestSuite && manualTestSuite.manualTestCases && manualTestSuite.manualTestCases.length > 0) {
        // Migrate old test cases that don't have title field
        let needsUpdate = false;
        const migratedTestCases = manualTestSuite.manualTestCases.map((tc: any) => {
          if (!tc.title || tc.title.trim() === '') {
            needsUpdate = true;
            // Generate title from description (first sentence or first 80 chars)
            const title = tc.testDescription
              ? tc.testDescription.split('.')[0].substring(0, 80).trim()
              : 'Test case title';
            return { ...tc, title };
          }
          return tc;
        });

        // If migration was needed, update the database
        if (needsUpdate) {
          console.log('🔄 Migrating manual test cases to add title field...');
          await TestServies.updateTestCase(arg.automatedTestId, {
            manualTestCases: migratedTestCases
          });
          manualTestSuite.manualTestCases = migratedTestCases;
        }

        return { success: true, data: manualTestSuite };
      } else {
        return { success: false, message: 'No manual test cases found for this test. Please generate them first by clicking "Generate Manual TC".' };
      }
    } catch (error: any) {
      console.error('Error getting manual test cases:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Update manual test case status handler
  ipcMain.handle('updateManualTestCaseStatus', async (event: any, arg: any) => {
    try {
      const result = await TestServies.updateManualTestCaseStatusInTestCase(
        arg.automatedTestId,
        arg.testCaseId,
        arg.status
      );
      
      return result;
    } catch (error: any) {
      console.error('Error updating manual test case status:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Delete manual test cases handler
  ipcMain.handle('deleteManualTestCases', async (event: any, arg: any) => {
    try {
      const result = await TestServies.updateTestCase(arg.automatedTestId, {
        manualTestCases: null,
        manualTestCasesGeneratedAt: null
      });
      
      return result;
    } catch (error: any) {
      console.error('Error deleting manual test cases:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Reset manual test case statuses handler
  ipcMain.handle('resetManualTestCaseStatuses', async (event: any, arg: any) => {
    try {
      const result = await TestServies.resetManualTestCaseStatuses(
        arg.automatedTestId,
        arg.resetReason || 'Manual reset from UI'
      );
      
      return result;
    } catch (error: any) {
      console.error('Error resetting manual test case statuses:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Get execution history handler
  ipcMain.handle('getManualTestCaseExecutionHistory', async (event: any, arg: any) => {
    try {
      const result = await TestServies.getManualTestCaseExecutionHistory(arg.automatedTestId);
      
      return result;
    } catch (error: any) {
      console.error('Error getting execution history:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Convert to manual test cases handler (direct conversion API)
  ipcMain.handle('convertToManualTestCases', async (event: any, arg: any) => {
    try {
      const simpleManualTestCases = await SimpleManualTestGenerator.convertTestScriptToManualTestCases(
        arg.testScript,
        arg.testName,
        arg.testId
      );
      
      // Convert to the format expected by the database (ManualTestCase interface)
      const manualTestCases = simpleManualTestCases.map((tc: any) => ({
        testCaseId: tc.testCaseId,
        testDescription: tc.testDescription,
        title: tc.testDescription.split('.')[0].substring(0, 80).trim() || 'Test case',
        testStep: tc.testStep,
        expectedResult: tc.expectedResult,
        status: tc.status
      }));
      
      // Store manual test cases directly in the TEST-CASES collection
      const result = await TestServies.addManualTestCasesToTestCase(arg.testId, manualTestCases);
      
      if (result.success) {
        return {
          success: true,
          message: `Generated ${simpleManualTestCases.length} manual test cases and stored in TEST-CASES collection`,
          count: simpleManualTestCases.length
        };
      } else {
        return {
          success: false,
          message: 'Failed to store manual test cases: ' + result.message
        };
      }
      
    } catch (error: any) {
      console.error('Error converting to manual test cases:', error);
      return { success: false, message: 'Conversion failed: ' + error.message };
    }
  });

  // Enhanced conversion using Gemini API (CSV output)
  ipcMain.handle('convertToManualTestCasesEnhanced', async (event: any, arg: any) => {
    try {
      console.log('🚀 Starting enhanced manual test case generation with Gemini API...');
      
      // Generate CSV using the enhanced generator
      const csvOutput = await EnhancedManualTestGenerator.generateTestcasesFromContent(
        arg.testScript,
        arg.logs || '',
        arg.scriptPath || null
      );
      
      if (!csvOutput) {
        return {
          success: false,
          message: 'Failed to generate test cases. No output from generator.'
        };
      }
      
      // Parse CSV to count test cases
      const lines = csvOutput.split('\n').filter(line => line.trim());
      const testCaseCount = lines.length - 1; // Subtract header row
      
      console.log(`✅ Generated ${testCaseCount} test cases`);
      
      return {
        success: true,
        message: `Successfully generated ${testCaseCount} manual test cases using Gemini API`,
        csvOutput: csvOutput,
        count: testCaseCount
      };
      
    } catch (error: any) {
      console.error('❌ Error in enhanced conversion:', error);
      return {
        success: false,
        message: 'Enhanced conversion failed: ' + error.message,
        error: error.stack
      };
    }
  });
}