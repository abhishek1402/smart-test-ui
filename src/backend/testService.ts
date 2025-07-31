import path from 'path';
import DataBase from './mongoClient';
import fs from 'fs';
import { execSync } from 'child_process';
import { BrowserWindow, ipcMain, utilityProcess } from 'electron';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';

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
    const regex = /page\.goto\((.*?)\);/s;
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
      await TEST_COLLECTION.find().toArray()
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
    };
    mainWindow: BrowserWindow;
  }) => {
    try {
      const preTestChain = await TestServies.getPreTestChain(
        testCase.preTestId
      );
      preTestChain.push(testCase.test); // Add the final test

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
              mainWindow.webContents.send('testRunFailed', { id: testCase.id });
              reject(new Error('Test run failed'));
            }
          });
        });
      }
    } catch (err) {
      console.error('Error running test case: ', err);
      mainWindow.webContents.send('testRunFailed', { id: testCase.id });
    }
  };

  static recordTestCase = async ({
    mainWindow,
    testCase,
    name,
    preTestId,
  }: {
    mainWindow: BrowserWindow;
    testCase: string;
    name: string;
    preTestId: string;
  }) => {
    try {
      console.log('Record full TEST case preTestId', preTestId);
      const test = await TEST_COLLECTION.insertOne({
        test: testCase,
        name: name,
        preTestId: preTestId,
      });
      return { success: true };
    } catch (e) {
      console.error('Error recording test case: ', e);
    }
  };

  static recordTestCaseOnLocal = async ({
    mainWindow,
    preTestId,
  }: {
    mainWindow: BrowserWindow;
    preTestId: string;
  }) => {
    try {
      console.log('REcorcd fullTEST local', preTestId);
      let startUrl: string | null = null;
      if (preTestId) {
        try {
          const preTest = await TEST_COLLECTION.findOne({
            _id: new ObjectId(preTestId),
          });
          console.log('inside pretest match found in', preTest);
          if (preTest) {
            startUrl = extractLastGotoUrl(preTest.test);
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
      const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'));
      child.postMessage({ type: 'record', startUrl: startUrl });

      child.once('message', async (e) => {
        mainWindow.webContents.send('testRecoredOnLocal', { test: e });
      });
    } catch (e) {}
  };

  static deleteTestCase = async (testId: string) => {
    try {
      console.log('Attempting to delete test case with ID:', testId);
      
      // Check if the testId is a valid ObjectId
      if (!ObjectId.isValid(testId)) {
        console.error('Invalid ObjectId:', testId);
        return { success: false, message: 'Invalid test ID format' };
      }
      
      // Ensure database connection is available
      if (!TEST_COLLECTION) {
        console.error('Database collection not available');
        return { success: false, message: 'Database connection error' };
      }
      
      console.log('About to perform delete operation...');
      const result = await TEST_COLLECTION.deleteOne({
        _id: new ObjectId(testId),
      });
      
      console.log('Delete operation result:', result);
      console.log('Deleted count:', result.deletedCount);
      
      if (result.deletedCount === 1) {
        console.log('Test case deleted successfully');
        return { success: true, message: 'Test case deleted successfully' };
      } else {
        console.log('Test case not found');
        return { success: false, message: 'Test case not found' };
      }
    } catch (error) {
      console.error('Error deleting test case: ', error);
      return { success: false, message: 'Failed to delete test case: ' + error.message };
    }
  };

  static updateTestCase = async (testId: string, updatedData: { name?: string; test?: string; preTestId?: string }) => {
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
}

export default TestServies;
