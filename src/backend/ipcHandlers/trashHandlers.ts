import { ipcMain } from 'electron';
import TestServies from '../testService';

export function registerTrashHandlers() {
  // Get all trash items handler
  ipcMain.handle('getAllTrashItems', async (event: any, arg: any) => {
    try {
      const trashItems = await TestServies.getAllTrashItems();
      return trashItems;
    } catch (error) {
      console.error('Error in getAllTrashItems IPC handler:', error);
      return [];
    }
  });

  // Restore test case handler
  ipcMain.handle('restoreTestCase', async (event: any, arg: any) => {
    try {
      console.log('Restoring test case with ID:', arg.trashId);
      const result = await TestServies.restoreTestCase(arg.trashId);
      return result;
    } catch (error) {
      console.error('Error in restoreTestCase IPC handler:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Permanent delete test case handler
  ipcMain.handle('permanentDeleteTestCase', async (event: any, arg: any) => {
    try {
      console.log('Permanently deleting test case with ID:', arg.trashId);
      const result = await TestServies.permanentDeleteTestCase(arg.trashId);
      return result;
    } catch (error) {
      console.error('Error in permanentDeleteTestCase IPC handler:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Cleanup expired trash items handler
  ipcMain.handle('cleanupExpiredTrashItems', async (event: any, arg: any) => {
    try {
      const result = await TestServies.cleanupExpiredTrashItems();
      return result;
    } catch (error) {
      console.error('Error in cleanupExpiredTrashItems IPC handler:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });

  // Delete all trash items handler
  ipcMain.handle('deleteAllTrashItems', async (event: any, arg: any) => {
    try {
      console.log('Deleting all trash items via IPC...');
      const result = await TestServies.deleteAllTrashItems();
      return result;
    } catch (error) {
      console.error('Error in deleteAllTrashItems IPC handler:', error);
      return { success: false, message: 'IPC handler error: ' + error.message };
    }
  });
}