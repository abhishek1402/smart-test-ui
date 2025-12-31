/**
 * Export Utility Functions
 * Centralized utility functions for export operations
 */

import { EXPORT_CONFIG, FILE_CONFIG, TIME_CONFIG } from '../config/constants';
import { ManualTestCase, ManualTestSuite } from '../manualTestCaseService';

export class ExportUtils {
  /**
   * Generate CSV content from manual test cases
   */
  static generateCSVContent(testCases: ManualTestCase[]): string {
    const headers = EXPORT_CONFIG.CSV_HEADERS;
    const csvHeader = headers.join(',') + '\n';
    
    const csvRows = testCases.map((tc) => {
      return [
        tc.testCaseId || '',
        `"${(tc.testDescription || '').replace(/"/g, '""')}"`,
        `"${(tc.title || '').replace(/"/g, '""')}"`,
        `"${(tc.testStep || '').replace(/"/g, '""')}"`,
        `"${(tc.expectedResult || '').replace(/"/g, '""')}"`,
        tc.status || ''
      ].join(',');
    }).join('\n');
    
    return csvHeader + csvRows;
  }

  /**
   * Generate JSON content from manual test suite
   */
  static generateJSONContent(manualTestSuite: ManualTestSuite): string {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportFormat: 'JSON',
        testSuiteName: manualTestSuite.testName,
        totalTestCases: manualTestSuite.manualTestCases.length
      },
      testSuite: manualTestSuite
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate safe filename from test name
   */
  static generateSafeFileName(testName: string, format: string, includeTimestamp = true): string {
    const safeName = testName.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = includeTimestamp 
      ? new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      : '';
    
    const parts = ['manual_test_cases', safeName];
    if (timestamp) parts.push(timestamp);
    
    return `${parts.join('_')}.${format}`;
  }

  /**
   * Estimate file size based on test case count and format
   */
  static estimateFileSize(testCaseCount: number, format: string, includeAnalytics = false, includeCharts = false): string {
    const baseSize = testCaseCount * FILE_CONFIG.BASE_SIZE_PER_TEST_CASE;
    let multiplier = FILE_CONFIG.FORMAT_MULTIPLIERS[format as keyof typeof FILE_CONFIG.FORMAT_MULTIPLIERS] || 1;
    
    if (includeAnalytics) multiplier += FILE_CONFIG.FEATURE_MULTIPLIERS.analytics;
    if (includeCharts) multiplier += FILE_CONFIG.FEATURE_MULTIPLIERS.charts;
    
    const estimatedSizeKB = Math.round(baseSize * multiplier);
    return estimatedSizeKB > 1024 
      ? `${(estimatedSizeKB / 1024).toFixed(1)} MB`
      : `${estimatedSizeKB} KB`;
  }

  /**
   * Estimate processing time
   */
  static estimateProcessingTime(testCaseCount: number): string {
    const baseTime = Math.max(1, Math.ceil(testCaseCount / 100));
    return `${baseTime} second${baseTime > 1 ? 's' : ''}`;
  }

  /**
   * Validate export configuration
   */
  static validateExportConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate format
    if (!config.format || !['csv', 'json', 'excel'].includes(config.format)) {
      errors.push('Invalid or missing export format');
    }
    
    // Validate filename if provided
    if (config.fileName && /[<>:"/\\|?*]/.test(config.fileName)) {
      errors.push('File name contains invalid characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Escape CSV field content
   */
  static escapeCSVField(content: string): string {
    if (!content) return '';
    return `"${content.replace(/"/g, '""')}"`;
  }

  /**
   * Generate analytics summary for CSV
   */
  static generateAnalyticsCSVSummary(analytics: any): string {
    let summary = 'ANALYTICS SUMMARY\n';
    summary += `Total Test Cases,${analytics.totalTestCases}\n`;
    summary += `Execution Rate,${analytics.executionRate}%\n`;
    summary += `Pass Rate,${analytics.passRate}%\n`;
    summary += `Quality Score,${analytics.qualityScore}\n`;
    summary += `Risk Assessment,${analytics.riskAssessment}\n\n`;
    
    return summary;
  }
}