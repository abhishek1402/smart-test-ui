import { ipcMain, dialog, BrowserWindow } from 'electron';
import TestServies from '../testService';
import { ExportConfig } from '../advancedExportService';
import { ExportUtils } from '../utils/exportUtils';

export function registerExportHandlers(mainWindow: BrowserWindow) {

  // Advanced export manual test cases handler
  ipcMain.handle('advancedExportManualTestCases', async (event: any, arg: any) => {
    try {
      // Validate input
      if (!arg?.automatedTestId) {
        return { success: false, message: 'Missing automated test ID' };
      }
      
      if (!arg.config) {
        return { success: false, message: 'Missing export configuration' };
      }
      
      const manualTestSuite = await TestServies.getManualTestCasesFromTestCase(arg.automatedTestId);
      
      if (!manualTestSuite) {
        return { success: false, message: 'No manual test suite found for this test. Please generate manual test cases first.' };
      }
      
      if (!manualTestSuite.manualTestCases || manualTestSuite.manualTestCases.length === 0) {
        return { success: false, message: 'No manual test cases found in the test suite. Please generate manual test cases first.' };
      }
      
      // Ensure the manualTestSuite has all required properties
      const completeTestSuite = {
        ...manualTestSuite,
        serialNumber: (manualTestSuite as any).serialNumber || 1,
        createdAt: manualTestSuite.createdAt || new Date(),
        updatedAt: manualTestSuite.updatedAt || new Date()
      };
      
      const config = arg.config as ExportConfig;
      const defaultFileName = config.fileName || ExportUtils.generateSafeFileName(completeTestSuite.testName || 'test_suite', config.format);
      
      const fs = require('fs');
      
      // Show save dialog
      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Manual Test Cases',
        defaultPath: defaultFileName,
        filters: [
          { name: `${config.format.toUpperCase()} Files`, extensions: [config.format] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (saveResult.canceled) {
        return { success: false, message: 'Export canceled by user' };
      }
      
      let content = '';
      
      // Generate content based on format
      try {
        switch (config.format) {
          case 'csv':
            content = ExportUtils.generateCSVContent(completeTestSuite.manualTestCases);
            break;
            
          case 'json':
            content = ExportUtils.generateJSONContent(completeTestSuite);
            break;
            
          default:
            content = ExportUtils.generateCSVContent(completeTestSuite.manualTestCases);
        }
        
      } catch (contentError: any) {
        return { success: false, message: 'Failed to generate export content: ' + contentError.message };
      }
      
      // Write file
      try {
        fs.writeFileSync(saveResult.filePath, content, 'utf8');
        
        if (fs.existsSync(saveResult.filePath)) {
          return {
            success: true,
            message: `Export completed successfully! ${completeTestSuite.manualTestCases.length} test cases exported to ${config.format.toUpperCase()} format.`,
            filePath: saveResult.filePath
          };
        } else {
          return { success: false, message: 'File was not created successfully' };
        }
        
      } catch (writeError: any) {
        return { success: false, message: 'Failed to write export file: ' + writeError.message };
      }
      
    } catch (error: any) {
      console.error('Export error:', error);
      return { success: false, message: 'Export failed: ' + (error.message || 'Unknown error') };
    }
  });

  // Get export templates handler
  ipcMain.handle('getExportTemplates', async (event: any, arg: any) => {
    try {
      const { ExportConfigService } = await import('../exportConfigService');
      const templates = ExportConfigService.getExportTemplates();
      return { success: true, data: templates };
    } catch (error: any) {
      console.error('Error in getExportTemplates IPC handler:', error);
      return { success: false, message: 'Failed to get export templates: ' + error.message };
    }
  });

  // Get export statistics handler
  ipcMain.handle('getExportStatistics', async (event: any, arg: any) => {
    try {
      const { ExportConfigService } = await import('../exportConfigService');
      const statistics = ExportConfigService.getExportStatistics();
      return { success: true, data: statistics };
    } catch (error: any) {
      console.error('Error in getExportStatistics IPC handler:', error);
      return { success: false, message: 'Failed to get export statistics: ' + error.message };
    }
  });
}