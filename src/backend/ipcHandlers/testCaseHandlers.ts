import { ipcMain, BrowserWindow } from 'electron';
import TestServies from '../testService';

export function registerTestCaseHandlers(mainWindow: BrowserWindow) {
  // Record test case handler
  ipcMain.handle(
    'recordTest',
    async (
      event: any,
      {
        testCase,
        name,
        preTestId,
        runForIntegration,
        mode,
        isStepsFormat
      }: { testCase: string; name: string; preTestId: string; runForIntegration?: boolean , mode: string, isStepsFormat?: boolean }
    ) => {
      const testCases = await TestServies.recordTestCase({
        mainWindow,
        testCase,
        name,
        preTestId,
        mode,
        runForIntegration,
        isStepsFormat,
      });
      return 'abhishek';
    }
  );

  // Record test on local handler
  ipcMain.handle('recordTestOnLocal', async (event: any, arg: any) => {
    const testCases = await TestServies.recordTestCaseOnLocal({
      mainWindow,
      preTestId: arg.preTestId,
      mode: arg.mode,
    });
    return 'abhishek';
  });

  // Get all test cases handler
  ipcMain.handle('getAllTestCases', async (event: any, arg: any) => {
    const testCases = await TestServies.getAllTestCases();
    return testCases;
  });

  // Run test handler
  ipcMain.handle('run-test', async (event: any, arg: any) => {
    console.log('test case', arg);
    const successfullRun = await TestServies.runTestCase({
      testCase: arg,
      mainWindow,
    });
    return successfullRun;
  });

  // Delete test case handler
  ipcMain.handle('deleteTestCase', async (event: any, arg: any) => {
    try {
      console.log('Deleting test case with ID:', arg.testId);
      const result = await TestServies.deleteTestCase(arg.testId);
      return result;
    } catch (error) {
      console.error('Error in deleteTestCase IPC handler:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Update test case handler
  ipcMain.handle('updateTestCase', async (event: any, arg: any) => {
    try {
      if (!arg) {
        console.error('No arguments provided in IPC call');
        return { success: false, message: 'No arguments provided' };
      }
      
      if (!arg.testId) {
        console.error('No testId provided in IPC call');
        return { success: false, message: 'Test ID is required' };
      }
      
      if (!arg.updatedData) {
        console.error('No updatedData provided in IPC call');
        return { success: false, message: 'Updated data is required' };
      }
      
      const result = await TestServies.updateTestCase(arg.testId, arg.updatedData);
      console.log('Backend method completed with result:', result);
      
      if (!result) {
        console.error('Backend returned null/undefined result');
        return { success: false, message: 'Backend returned no result' };
      }
      
      return result;
      
    } catch (error) {
      console.error('Full error object:', error);
      
      const errorResult = {
        success: false,
        message: `IPC handler error: ${error?.message || error?.toString() || 'Unknown IPC error'}`
      };
      return errorResult;
    }
  });

  ipcMain.handle('runAllTests', async (event: any, arg: any) => {
    try {
      if (!arg.testCaseIds || !Array.isArray(arg.testCaseIds)) {
        return { success: false, message: 'Test case IDs array is required' };
      }

      if (arg.testCaseIds.length === 0) {
        return { success: false, message: 'No test cases selected' };
      }

      const result = await TestServies.runMultipleTestCases({
        testCaseIds: arg.testCaseIds,
        mainWindow,
        projects: arg.projects || ['chrome'],
        environment: arg.environment || 'QA',
      });

      return result;
    } catch (error) {
      console.error('Error in runAllTests IPC handler:', error);
      return { success: false, message: 'IPC handler error: ' + (error as Error).message };
    }
  });
}