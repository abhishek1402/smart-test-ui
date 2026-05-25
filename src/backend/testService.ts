import path from 'path';
import DataBase from './mongoClient';
import fs from 'fs';
import { execSync, exec } from 'child_process';
import { BrowserWindow, ipcMain, utilityProcess, shell } from 'electron';
import { ObjectId } from 'mongodb';
import { playwrightConverter } from './playwrightToSteps';
import { createConsolidatedTestFile, getResultJsonSpecs } from './utils/testConsolidation';
import { BuildEnvironment } from './config/constants';

const currentDir = __dirname; //will be inside webpack

const rootDir = path.resolve(currentDir, '../../'); // More levels up as needed
const backendDir = path.resolve(currentDir, '../../src/backend'); // More levels up as needed

const DB = DataBase.GetDB();

const TEST_COLLECTION = DB.collection('TEST-CASES');

const extractLastGotoUrl = (testScript: string) => {
  const gotoRegex = /page\.goto\(['"]([^'"]+)['"]\)/g;
  const matches = [...testScript.matchAll(gotoRegex)];

  if (matches.length > 0) {
    return matches[matches.length - 1][1]; // Return the last match
  }

  return null;
};

const replaceUrl = (test: string, env: string) => {
  try {
    const urlOriginMap = {
      Dev: 'https://cleartax-dev-http.internal.cleartax.co',
      Qa: 'https://cleartax-qa-http.internal.cleartax.co',
      Prod: 'https://cleartax.in',
    };
    const regex = /page\.goto\((.*?)\);/;
    const url = new URL(test.match(regex)[1].replace(/['"]+/g, ''));
    const newUrl = `${urlOriginMap[env as keyof typeof urlOriginMap]}${
      url.pathname
    }${url.search}`;
    return test.replace(url.toString(), newUrl);
  } catch (e) {
    return test;
  }
};
class TestServies {
  static getPreTestChain = async (initialTestId: string): Promise<string[]> => {
    const preTestChain: string[] = [];
    let currentTestId: string | null = initialTestId;

    while (currentTestId) {
      const currentTest = await TEST_COLLECTION.findOne({
        _id: new ObjectId(currentTestId),
      });
      if (currentTest) {
        preTestChain.unshift(currentTest.test); // Add the test at the beginning
        currentTestId = currentTest.preTestId;
      } else {
        currentTestId = null;
      }
    }

    return preTestChain;
  };
  static getAllTestCases = async () => {
    const testCases = await (
      await TEST_COLLECTION.find({ deleted: { $ne: true } }).toArray()
    ).map((ele) => ({ ...ele, _id: ele._id.toString() }));

    return testCases;
  };

  static runTestCase = async ({
    testCase,
    mainWindow,
  }: {
    testCase: {
      test: string;
      id: string;
      env: 'Dev' | 'Qa' | 'Prod';
      preTestId: string;
      projects: string[];
      format?: string;
    };
    mainWindow: BrowserWindow;
  }) => {
    try {
      const preTestChain = await TestServies.getPreTestChain(
        testCase.preTestId
      );
      
      // The .steps format is now actual Playwright code with test.step() wrappers
      // No conversion needed - can run directly
      preTestChain.push(testCase.test); // Add the final test

      let testPassed = true;
      let testError = null;

      for (let i = 0; i < preTestChain.length; i++) {
        const testScript = preTestChain[i];
        const child = utilityProcess.fork(path.join(__dirname, 'fork.js'));

        child.postMessage({
          testCase: testScript,
          projects: testCase.projects,
          type: 'run',
        });
        await new Promise((resolve, reject) => {
          child.on('exit', (code) => {
            if (code === 0) {
              resolve(true);
            } else {
              testPassed = false;
              testError = `Test execution failed with exit code: ${code}`;
              mainWindow.webContents.send('testRunFailed', { id: testCase.id });
              reject(new Error('Test run failed'));
            }
          });
        });
      }

      // Update manual test case statuses based on test execution result
      console.log('=== UPDATING MANUAL TEST CASE STATUSES ===');
      console.log('Test ID:', testCase.id);
      console.log('Test Passed:', testPassed);
      console.log('Test Error:', testError);
      
      const updateResult = await TestServies.updateManualTestCaseStatusesAfterExecution(testCase.id, testPassed, testError);
      console.log('=== UPDATE RESULT ===', updateResult);
      
      // Send success notification to frontend
      if (testPassed) {
        console.log('=== SENDING SUCCESS EVENT TO FRONTEND ===');
        mainWindow.webContents.send('testRunSuccess', { id: testCase.id });
      }

    } catch (err) {
      console.error('Error running test case: ', err);
      mainWindow.webContents.send('testRunFailed', { id: testCase.id });
      
      // Update manual test case statuses to reflect failure
      console.log('=== UPDATING MANUAL TEST CASE STATUSES (ERROR CASE) ===');
      console.log('Test ID:', testCase.id);
      console.log('Error:', err.message);
      
      const updateResult = await TestServies.updateManualTestCaseStatusesAfterExecution(testCase.id, false, err.message);
      console.log('=== UPDATE RESULT (ERROR CASE) ===', updateResult);
    }
  };

  static recordTestCase = async ({
    mainWindow,
    testCase,
    name,
    preTestId,
    mode,
    runForIntegration = true,
    isStepsFormat = false,
  }: {
    mainWindow: BrowserWindow;
    testCase: string;
    name: string;
    preTestId: string;
    mode: string;
    runForIntegration?: boolean;
    isStepsFormat?: boolean;
  }) => {
    try {
      console.log('Record full TEST case preTestId', preTestId);
      console.log('Is Steps Format:', isStepsFormat);
      
      // Save the test case as-is (either Playwright or .steps format)
      const test = await TEST_COLLECTION.insertOne({
        test: testCase, // Save the .steps format directly
        name: name,
        preTestId: preTestId,
        mode: mode,
        deleted: false,
        createdAt: new Date(),
        runForIntegration: runForIntegration,
        format: isStepsFormat ? 'steps' : 'playwright', // Track the format
      });

      return { success: true };
    } catch (e) {
      console.error('Error recording test case: ', e);
    }
  };

  static recordTestCaseOnLocal = async ({
    mainWindow,
    preTestId,
    mode,
  }: {
    mainWindow: BrowserWindow;
    preTestId: string;
    mode: string;
  }) => {
    try {
      console.log('Record fullTEST local', preTestId, 'mode:', mode);
      
      // Set default URLs based on mode
      const defaultUrls = {
        DIY: 'https://cleartax-qa-http.internal.cleartax.co/filing/itr-filings',
        AF: 'https://cleartax-qa-http.internal.cleartax.co/s/pricing'
      };
      
      let startUrl: string = defaultUrls[mode as keyof typeof defaultUrls] || defaultUrls.DIY;
      
      if (preTestId) {
        try {
          const preTest = await TEST_COLLECTION.findOne({
            _id: new ObjectId(preTestId),
          });
          console.log('inside pretest match found in', preTest);
          if (preTest) {
            const preTestUrl = extractLastGotoUrl(preTest.test);
            if (preTestUrl) {
              startUrl = preTestUrl; // Use pretest URL if available
            }
            const child = utilityProcess.fork(
              path.join(__dirname, 'fork' + '.js')
            );
            child.postMessage({
              testCase: preTest.test,
              projects: ['chrome'],
              type: 'run',
            });
            child.once('exit', () => {
              const child = utilityProcess.fork(
                path.join(__dirname, 'fork' + '.js')
              );
              console.log('startUrl', startUrl);
              console.log('starting recording with pretest');
              child.postMessage({ type: 'record', startUrl: startUrl });

              child.once('message', async (e) => {
                mainWindow.webContents.send('testRecoredOnLocal', { test: e });
              });
            });
          }
          return;
        } catch (err) {
          console.error('Failed to convert preTestId to ObjectId: ', err);
          mainWindow.webContents.send('testRunFailed', { id: preTestId });
          return;
        }
      }
      
      console.log('Starting recording with default URL for mode', mode, ':', startUrl);
      const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'));
      child.postMessage({ type: 'record', startUrl: startUrl });

      child.once('message', async (e) => {
        mainWindow.webContents.send('testRecoredOnLocal', { test: e });
      });
    } catch (e) {}
  };

  static deleteTestCase = async (testId: string) => {
    try {
      console.log('Moving test case to trash with ID:', testId);
      
      // Check if the testId is a valid ObjectId
      if (!ObjectId.isValid(testId)) {
        console.error('Invalid ObjectId:', testId);
        return { success: false, message: 'Invalid test ID format' };
      }
      
      // Mark as deleted instead of moving to separate collection
      const result = await TEST_COLLECTION.updateOne(
        { _id: new ObjectId(testId) },
        {
          $set: {
            deleted: true,
            deletedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          }
        }
      );
      
      if (result.modifiedCount === 1) {
        console.log('Test case moved to trash successfully');
        return { success: true, message: 'Test case moved to trash successfully' };
      } else {
        return { success: false, message: 'Test case not found or already deleted' };
      }
    } catch (error) {
      console.error('Error moving test case to trash: ', error);
      return { success: false, message: 'Failed to delete test case: ' + error.message };
    }
  };

  static getAllTrashItems = async () => {
    try {
      console.log('Getting all trash items...');
      
      const trashItems = await TEST_COLLECTION.find({ deleted: true }).toArray();
      console.log('Raw trash items from DB:', trashItems.length);
      
      const processedItems = trashItems.map((ele) => ({
        ...ele,
        _id: ele._id.toString()
      }));
      
      console.log('Returning processed trash items:', processedItems.length);
      return processedItems;
    } catch (error) {
      console.error('Error getting trash items: ', error);
      return [];
    }
  };

  static restoreTestCase = async (trashId: string) => {
    try {
      console.log('Restoring test case with ID:', trashId);
      
      if (!ObjectId.isValid(trashId)) {
        return { success: false, message: 'Invalid trash ID format' };
      }
      
      // Mark as not deleted instead of moving between collections
      const result = await TEST_COLLECTION.updateOne(
        { _id: new ObjectId(trashId), deleted: true },
        {
          $unset: {
            deleted: "",
            deletedAt: "",
            expiresAt: ""
          }
        }
      );
      
      if (result.modifiedCount === 1) {
        return { success: true, message: 'Test case restored successfully' };
      } else {
        return { success: false, message: 'Trash item not found or already restored' };
      }
    } catch (error) {
      console.error('Error restoring test case: ', error);
      return { success: false, message: 'Failed to restore test case: ' + error.message };
    }
  };

  static permanentDeleteTestCase = async (trashId: string) => {
    try {
      console.log('Permanently deleting test case with ID:', trashId);
      
      if (!ObjectId.isValid(trashId)) {
        return { success: false, message: 'Invalid trash ID format' };
      }
      
      const result = await TEST_COLLECTION.deleteOne({
        _id: new ObjectId(trashId),
        deleted: true
      });
      
      if (result.deletedCount === 1) {
        return { success: true, message: 'Test case permanently deleted' };
      } else {
        return { success: false, message: 'Trash item not found' };
      }
    } catch (error) {
      console.error('Error permanently deleting test case: ', error);
      return { success: false, message: 'Failed to permanently delete test case: ' + error.message };
    }
  };

  static cleanupExpiredTrashItems = async () => {
    try {
      const result = await TEST_COLLECTION.deleteMany({
        deleted: true,
        expiresAt: { $lte: new Date() }
      });
      
      console.log(`Cleaned up ${result.deletedCount} expired trash items`);
      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Error cleaning up expired trash items: ', error);
      return { success: false, message: 'Failed to cleanup expired items: ' + error.message };
    }
  };

  static deleteAllTrashItems = async () => {
    try {
      console.log('Deleting all trash items...');
      
      const result = await TEST_COLLECTION.deleteMany({ deleted: true });
      
      console.log(`Deleted all trash items. Count: ${result.deletedCount}`);
      return { success: true, deletedCount: result.deletedCount, message: `Successfully deleted ${result.deletedCount} items from trash` };
    } catch (error) {
      console.error('Error deleting all trash items: ', error);
      return { success: false, message: 'Failed to delete all trash items: ' + error.message };
    }
  };

  static updateTestCase = async (testId: string, updatedData: { name?: string; test?: string; preTestId?: string; runForIntegration?: boolean , mode?: string; manualTestCases?: any; manualTestCasesGeneratedAt?: any; testScriptHash?: string }) => {
    try {
      if (!testId) {
        const result = { success: false, message: 'Test ID is required' };
        console.log('Returning result:', result);
        return result;
      }
      
      if (!ObjectId.isValid(testId)) {
        const result = { success: false, message: 'Invalid test ID format' };
        console.log('Returning result:', result);
        return result;
      }
      
      const updateFields: any = {};
      if (updatedData.name !== undefined) updateFields.name = updatedData.name;
      if (updatedData.test !== undefined) updateFields.test = updatedData.test;
      if (updatedData.preTestId !== undefined) updateFields.preTestId = updatedData.preTestId;
      if (updatedData.mode !== undefined) updateFields.mode = updatedData.mode;
      if (updatedData.runForIntegration !== undefined) updateFields.runForIntegration = updatedData.runForIntegration;
      if (updatedData.manualTestCases !== undefined) updateFields.manualTestCases = updatedData.manualTestCases;
      if (updatedData.manualTestCasesGeneratedAt !== undefined) updateFields.manualTestCasesGeneratedAt = updatedData.manualTestCasesGeneratedAt;
      if (updatedData.testScriptHash !== undefined) updateFields.testScriptHash = updatedData.testScriptHash;
      
      if (Object.keys(updateFields).length === 0) {
        const result = { success: false, message: 'No fields to update' };
        console.log('Returning result:', result);
        return result;
      }
      
      const result = await TEST_COLLECTION.updateOne(
        { _id: new ObjectId(testId) },
        { $set: updateFields }
      );
      
      if (result.matchedCount > 0) {
        const successResult = { success: true, message: 'Test case updated successfully' };
        return successResult;
      } else {
        const failResult = { success: false, message: 'Test case not found' };
        return failResult;
      }
      
    } catch (error) {
      console.error('Error:', error);
      const errorResult = { success: false, message: `Database error: ${error.message}` };
      console.log('=== ERROR - Returning result:', errorResult);
      return errorResult;
    }
  };

  /**
   * Add manual test cases directly to the test case document
   */
  static addManualTestCasesToTestCase = async (testId: string, manualTestCases: any[]) => {
    try {
      console.log('Adding manual test cases to test case:', testId);
      
      if (!ObjectId.isValid(testId)) {
        return { success: false, message: 'Invalid test ID format' };
      }
      
      // Get existing test case to preserve manual status changes
      const existingTestCase = await TEST_COLLECTION.findOne({ _id: new ObjectId(testId) });
      
      let finalManualTestCases = manualTestCases;
      
      // If there are existing manual test cases, preserve their statuses
      if (existingTestCase && existingTestCase.manualTestCases && existingTestCase.manualTestCases.length > 0) {
        console.log('=== PRESERVING EXISTING MANUAL STATUS CHANGES ===');
        console.log('Existing test cases:', existingTestCase.manualTestCases.length);
        console.log('New test cases:', manualTestCases.length);
        
        // Create a map of existing statuses by testCaseId
        const existingStatusMap = new Map();
        existingTestCase.manualTestCases.forEach((tc: any) => {
          existingStatusMap.set(tc.testCaseId, {
            status: tc.status,
            updatedAt: tc.updatedAt,
            lastExecutionResult: tc.lastExecutionResult,
            executionHistory: tc.executionHistory,
            lastAutoUpdate: tc.lastAutoUpdate,
            autoUpdated: tc.autoUpdated
          });
        });
        
        // Merge existing statuses with new test cases
        finalManualTestCases = manualTestCases.map((newTc: any) => {
          const existingData = existingStatusMap.get(newTc.testCaseId);
          if (existingData) {
            console.log(`=== PRESERVING STATUS: ${newTc.testCaseId} = ${existingData.status} ===`);
            return {
              ...newTc,
              status: existingData.status, // Preserve existing status
              updatedAt: existingData.updatedAt || newTc.updatedAt,
              lastExecutionResult: existingData.lastExecutionResult,
              executionHistory: existingData.executionHistory || [],
              lastAutoUpdate: existingData.lastAutoUpdate,
              autoUpdated: existingData.autoUpdated || false
            };
          } else {
            console.log(`=== NEW TEST CASE: ${newTc.testCaseId} = ${newTc.status} ===`);
            return newTc;
          }
        });
        
        console.log('=== STATUS PRESERVATION COMPLETE ===');
      }
      
      const result = await TEST_COLLECTION.updateOne(
        { _id: new ObjectId(testId) },
        {
          $set: {
            manualTestCases: finalManualTestCases,
            manualTestCasesGeneratedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        return { success: true, message: 'Manual test cases added successfully with preserved statuses' };
      } else {
        return { success: false, message: 'Test case not found' };
      }
      
    } catch (error) {
      console.error('Error adding manual test cases to test case:', error);
      return { success: false, message: `Failed to add manual test cases: ${error.message}` };
    }
  };

  /**
   * Get manual test cases from test case document
   */
  static getManualTestCasesFromTestCase = async (testId: string) => {
    try {
      console.log('Getting manual test cases from test case:', testId);
      
      if (!ObjectId.isValid(testId)) {
        return null;
      }
      
      const testCase = await TEST_COLLECTION.findOne({ _id: new ObjectId(testId) });
      
      if (testCase && testCase.manualTestCases) {
        return {
          _id: testCase._id,
          automatedTestId: testId,
          testName: testCase.name,
          manualTestCases: testCase.manualTestCases,
          createdAt: testCase.manualTestCasesGeneratedAt || testCase.createdAt,
          updatedAt: testCase.manualTestCasesGeneratedAt || testCase.createdAt
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Error getting manual test cases from test case:', error);
      return null;
    }
  };

  /**
   * Update manual test case status in test case document
   */
  static updateManualTestCaseStatusInTestCase = async (testId: string, testCaseId: string, status: string) => {
    try {
      console.log('Updating manual test case status in test case:', testId, testCaseId, status);
      
      if (!ObjectId.isValid(testId)) {
        return { success: false, message: 'Invalid test ID format' };
      }
      
      const result = await TEST_COLLECTION.updateOne(
        {
          _id: new ObjectId(testId),
          'manualTestCases.testCaseId': testCaseId
        },
        {
          $set: {
            'manualTestCases.$.status': status,
            'manualTestCases.$.updatedAt': new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        return { success: true, message: 'Manual test case status updated successfully' };
      } else {
        return { success: false, message: 'Manual test case not found' };
      }
      
    } catch (error) {
      console.error('Error updating manual test case status:', error);
      return { success: false, message: `Failed to update status: ${error.message}` };
    }
  };

  /**
   * Update manual test case statuses based on automated test execution results
   * Statuses persist until the next test run or manual reset
   */
  static updateManualTestCaseStatusesAfterExecution = async (testId: string, testPassed: boolean, errorMessage?: string) => {
    try {
      console.log('=== PERSISTENT STATUS UPDATE ===');
      console.log('Test ID:', testId);
      console.log('Test Result:', testPassed ? 'PASSED' : 'FAILED');
      console.log('Error Message:', errorMessage);
      
      if (!ObjectId.isValid(testId)) {
        console.error('Invalid test ID format:', testId);
        return { success: false, message: 'Invalid test ID format' };
      }
      
      // Get the test case with manual test cases
      const testCase = await TEST_COLLECTION.findOne({ _id: new ObjectId(testId) });
      
      if (!testCase || !testCase.manualTestCases || testCase.manualTestCases.length === 0) {
        console.log('No manual test cases found for test:', testId);
        return { success: false, message: 'No manual test cases found' };
      }
      
      // Determine the status to set based on test execution result
      const newStatus = testPassed ? 'Pass' : 'Fail';
      
      // Update all manual test cases with the execution result and execution history
      const updatedManualTestCases = testCase.manualTestCases.map((tc: any) => {
        // Preserve existing execution history
        const executionHistory = tc.executionHistory || [];
        
        // Add new execution record
        const newExecutionRecord = {
          executedAt: new Date(),
          passed: testPassed,
          status: newStatus,
          errorMessage: errorMessage || null,
          autoUpdated: true,
          executionId: new ObjectId().toString()
        };
        
        // Keep last 10 execution records for history
        const updatedHistory = [newExecutionRecord, ...executionHistory].slice(0, 10);
        
        return {
          ...tc,
          status: newStatus,
          updatedAt: new Date(),
          lastExecutionResult: newExecutionRecord,
          executionHistory: updatedHistory,
          // Track when status was last automatically updated
          lastAutoUpdate: new Date(),
          // Flag to indicate this was automatically updated
          autoUpdated: true
        };
      });
      
      // Update the test case document with new statuses and execution metadata
      const result = await TEST_COLLECTION.updateOne(
        { _id: new ObjectId(testId) },
        {
          $set: {
            manualTestCases: updatedManualTestCases,
            lastExecutionUpdate: new Date(),
            lastExecutionResult: {
              executedAt: new Date(),
              passed: testPassed,
              status: newStatus,
              errorMessage: errorMessage || null,
              updatedTestCases: updatedManualTestCases.length
            }
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`=== SUCCESS: Updated ${updatedManualTestCases.length} manual test cases to status: ${newStatus} ===`);
        console.log('=== STATUS WILL PERSIST UNTIL NEXT TEST RUN OR MANUAL RESET ===');
        
        return {
          success: true,
          message: `Updated ${updatedManualTestCases.length} manual test cases to ${newStatus}. Status will persist until next test run.`,
          updatedCount: updatedManualTestCases.length,
          status: newStatus,
          persistent: true,
          executedAt: new Date()
        };
      } else {
        return { success: false, message: 'Failed to update manual test cases' };
      }
      
    } catch (error) {
      console.error('Error updating manual test case statuses after execution:', error);
      return { success: false, message: `Failed to update statuses: ${error.message}` };
    }
  };

  /**
   * Reset manual test case statuses to 'Pending' for a new test run
   */
  static resetManualTestCaseStatuses = async (testId: string, resetReason: string = 'Manual reset') => {
    try {
      console.log('=== RESETTING MANUAL TEST CASE STATUSES ===');
      console.log('Test ID:', testId);
      console.log('Reset Reason:', resetReason);
      
      if (!ObjectId.isValid(testId)) {
        console.error('Invalid test ID format:', testId);
        return { success: false, message: 'Invalid test ID format' };
      }
      
      // Get the test case with manual test cases
      const testCase = await TEST_COLLECTION.findOne({ _id: new ObjectId(testId) });
      
      if (!testCase || !testCase.manualTestCases || testCase.manualTestCases.length === 0) {
        console.log('No manual test cases found for test:', testId);
        return { success: false, message: 'No manual test cases found' };
      }
      
      // Reset all manual test cases to 'Pending' status
      const resetManualTestCases = testCase.manualTestCases.map((tc: any) => {
        // Preserve execution history
        const executionHistory = tc.executionHistory || [];
        
        // Add reset record to history
        const resetRecord = {
          executedAt: new Date(),
          passed: null as boolean | null,
          status: 'Pending',
          errorMessage: null as string | null,
          autoUpdated: false,
          resetReason: resetReason,
          executionId: new ObjectId().toString()
        };
        
        const updatedHistory = [resetRecord, ...executionHistory].slice(0, 10);
        
        return {
          ...tc,
          status: 'Pending',
          updatedAt: new Date(),
          lastReset: new Date(),
          resetReason: resetReason,
          executionHistory: updatedHistory,
          // Clear auto-update flag
          autoUpdated: false
        };
      });
      
      // Update the test case document
      const result = await TEST_COLLECTION.updateOne(
        { _id: new ObjectId(testId) },
        {
          $set: {
            manualTestCases: resetManualTestCases,
            lastStatusReset: new Date(),
            lastResetReason: resetReason
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`=== SUCCESS: Reset ${resetManualTestCases.length} manual test cases to 'Pending' status ===`);
        
        return {
          success: true,
          message: `Reset ${resetManualTestCases.length} manual test cases to 'Pending' status`,
          resetCount: resetManualTestCases.length,
          resetAt: new Date(),
          resetReason: resetReason
        };
      } else {
        return { success: false, message: 'Failed to reset manual test cases' };
      }
      
    } catch (error) {
      console.error('Error resetting manual test case statuses:', error);
      return { success: false, message: `Failed to reset statuses: ${error.message}` };
    }
  };

  /**
   * Get execution history for manual test cases
   */
  static getManualTestCaseExecutionHistory = async (testId: string) => {
    try {
      console.log('Getting execution history for test:', testId);
      
      if (!ObjectId.isValid(testId)) {
        return { success: false, message: 'Invalid test ID format' };
      }
      
      const testCase = await TEST_COLLECTION.findOne({ _id: new ObjectId(testId) });
      
      if (!testCase || !testCase.manualTestCases) {
        return { success: false, message: 'No manual test cases found' };
      }
      
      // Extract execution history from all test cases
      const executionHistory = testCase.manualTestCases.map((tc: any) => ({
        testCaseId: tc.testCaseId,
        currentStatus: tc.status,
        lastExecutionResult: tc.lastExecutionResult,
        executionHistory: tc.executionHistory || [],
        lastAutoUpdate: tc.lastAutoUpdate,
        lastReset: tc.lastReset
      }));
      
      return {
        success: true,
        data: {
          testId: testId,
          testName: testCase.name,
          lastExecutionUpdate: testCase.lastExecutionUpdate,
          lastStatusReset: testCase.lastStatusReset,
          lastResetReason: testCase.lastResetReason,
          testCases: executionHistory
        }
      };
      
    } catch (error) {
      console.error('Error getting execution history:', error);
      return { success: false, message: `Failed to get execution history: ${error.message}` };
    }
  };

  static runMultipleTestCases = async ({
    testCaseIds,
    mainWindow,
    projects,
    environment = 'QA',
  }: {
    testCaseIds: string[];
    mainWindow: BrowserWindow;
    projects: string[];
    environment?: string;
  }) => {
    try {
      const testCases = await TEST_COLLECTION.find({
        _id: { $in: testCaseIds.map(id => new ObjectId(id)) },
        deleted: { $ne: true }
      }).toArray();

      if (testCases.length === 0) {
        mainWindow.webContents.send('runAllTestsFailed', {
          message: 'No test cases found',
          results: [],
          totalTests: 0,
          passedTests: 0,
          failedTests: 0
        });
        return { success: false, message: 'No test cases found' };
      }

      const testCasesWithPreTests = [];

      for (const testCase of testCases) {
        if (testCase.preTestId) {
          const preTestChain = await TestServies.getPreTestChain(testCase.preTestId);

          for (const preTest of preTestChain) {
            testCasesWithPreTests.push({
              _id: 'pretest-' + Math.random(),
              test: preTest,
              name: 'PreTest for ' + testCase.name
            });
          }
        }

        testCasesWithPreTests.push({
          ...testCase,
          _id: testCase._id.toString(),
          test: testCase.test,
          name: testCase.name
        });
      }

      const envMap: Record<string, BuildEnvironment> = { DEV: 'dev', PROD: 'prod', QA: 'qa' };
      const buildEnv: BuildEnvironment = envMap[environment] || 'qa';

      const consolidatedTestFile = createConsolidatedTestFile(testCasesWithPreTests, buildEnv);
      const consolidatedTestCode = fs.readFileSync(consolidatedTestFile, 'utf-8');

      const child = utilityProcess.fork(path.join(__dirname, 'fork.js'));

      child.postMessage({
        testCase: consolidatedTestCode,
        projects: projects,
        type: 'run',
        headless: true,
        environment: environment,
      });

      let testResults: { testId: string; name: string; passed: boolean; error?: string }[] = [];

      await new Promise<void>((resolve, reject) => {
        const timeoutDuration = 7500000; // 125 minutes

        const timeout = setTimeout(() => {
          child.kill();

          testResults = testCases.map(tc => ({
            testId: tc._id.toString(),
            name: tc.name,
            passed: false,
            error: 'Test execution timeout'
          }));

          mainWindow.webContents.send('runAllTestsFailed', {
            message: 'Test execution timeout',
            results: testResults,
            totalTests: testCases.length,
            passedTests: 0,
            failedTests: testCases.length
          });

          reject(new Error('Test execution timeout'));
        }, timeoutDuration);

        child.on('exit', (code) => {
          clearTimeout(timeout);

          // Parse the Playwright JSON report for per-test results
          const reportPath = path.join(rootDir, 'playwright-report', 'results.json');
          const specResults = TestServies.parsePlaywrightResults(reportPath);

          if (code === 0) {
            testResults = testCases.map(tc => ({
              testId: tc._id.toString(),
              name: tc.name,
              passed: true
            }));

            mainWindow.webContents.send('runAllTestsSuccess', {
              message: `Successfully ran ${testCases.length} test cases`,
              results: testResults,
              totalTests: testCases.length,
              passedTests: testCases.length,
              failedTests: 0
            });
          } else if (specResults.length > 0) {
            // We have per-test granularity from the JSON report
            testResults = testCases.map(tc => {
              const match = specResults.find(s => s.name === tc.name);
              return {
                testId: tc._id.toString(),
                name: tc.name,
                passed: match ? match.ok : false,
                error: match && !match.ok ? `Test failed` : (!match ? `No result found in report` : undefined),
              };
            });

            const passed = testResults.filter(r => r.passed).length;
            const failed = testResults.filter(r => !r.passed).length;

            mainWindow.webContents.send('runAllTestsFailed', {
              message: `${failed} of ${testCases.length} tests failed`,
              results: testResults,
              totalTests: testCases.length,
              passedTests: passed,
              failedTests: failed,
            });
          } else {
            // No JSON report available — fall back to marking all failed
            testResults = testCases.map(tc => ({
              testId: tc._id.toString(),
              name: tc.name,
              passed: false,
              error: `Test execution failed with exit code: ${code}`
            }));

            mainWindow.webContents.send('runAllTestsFailed', {
              message: `Test execution failed with exit code: ${code}`,
              results: testResults,
              totalTests: testCases.length,
              passedTests: 0,
              failedTests: testCases.length
            });
          }

          resolve();
        });
      });

      // Open Playwright HTML report
      try {
        const reportIndexPath = path.join(rootDir, 'playwright-report', 'index.html');
        if (fs.existsSync(reportIndexPath)) {
          shell.openPath(reportIndexPath);
        }
      } catch (reportError) {
        console.error('Error opening report:', reportError);
      }

      // Update manual test case statuses
      for (const testCase of testCases) {
        const testResult = testResults.find(r => r.testId === testCase._id.toString());
        if (testResult) {
          await TestServies.updateManualTestCaseStatusesAfterExecution(
            testCase._id.toString(),
            testResult.passed,
            testResult.error
          );
        }
      }

      try {
        fs.unlinkSync(consolidatedTestFile);
      } catch (_) {}

      const passedCount = testResults.filter(r => r.passed).length;
      const failedCount = testResults.filter(r => !r.passed).length;

      return {
        success: failedCount === 0,
        message: failedCount === 0
          ? `Successfully ran ${testCases.length} test cases`
          : `${failedCount} of ${testCases.length} tests failed`,
        results: testResults,
        totalTests: testCases.length,
        passedTests: passedCount,
        failedTests: failedCount,
      };

    } catch (err: any) {
      console.error('Error running multiple test cases:', err);
      mainWindow.webContents.send('runAllTestsFailed', {
        message: err.message,
        results: []
      });
      return { success: false, message: err.message };
    }
  };

  private static parsePlaywrightResults(reportPath: string): { name: string; ok: boolean }[] {
    try {
      if (!fs.existsSync(reportPath)) return [];
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const results: { name: string; ok: boolean }[] = [];
      if (report.suites) {
        for (const suite of report.suites) {
          results.push(...getResultJsonSpecs(suite));
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}

export default TestServies;
