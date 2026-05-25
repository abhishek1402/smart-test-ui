import { BrowserWindow } from 'electron';
import { registerTestCaseHandlers } from './testCaseHandlers';
import { registerTrashHandlers } from './trashHandlers';
import { registerManualTestCaseHandlers } from './manualTestCaseHandlers';
import { registerExportHandlers } from './exportHandlers';

export function registerAllIpcHandlers(mainWindow: BrowserWindow) {
  // Register all IPC handlers
  registerTestCaseHandlers(mainWindow);
  registerTrashHandlers();
  registerManualTestCaseHandlers();
  registerExportHandlers(mainWindow);
  
  console.log('All IPC handlers registered successfully');
}