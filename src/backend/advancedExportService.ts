import { ManualTestSuite, ManualTestCase } from './manualTestCaseService';
import { ExportUtils } from './utils/exportUtils';
import { RISK_THRESHOLDS, RECOMMENDATION_THRESHOLDS } from './config/constants';
import * as fs from 'fs';
import * as path from 'path';

export interface ExportConfig {
  format: 'csv' | 'json' | 'excel';
  includeAnalytics: boolean;
  includeCharts: boolean;
  customFields?: string[];
  fileName?: string;
  template?: 'standard' | 'detailed' | 'summary';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ExportAnalytics {
  totalTestCases: number;
  testCasesByType: Record<string, number>;
  testCasesByPriority: Record<string, number>;
  testCasesBySeverity: Record<string, number>;
  testCasesByStatus: Record<string, number>;
  executionRate: number;
  passRate: number;
  failRate: number;
  blockedRate: number;
  averageExecutionTime: string;
  qualityScore: number;
  riskAssessment: string;
  recommendations: string[];
}

export class AdvancedExportService {
  
  /**
   * Export manual test cases with advanced options
   */
  static async exportManualTestCases(
    manualTestSuite: ManualTestSuite,
    config: ExportConfig
  ): Promise<{ success: boolean; message: string; filePath?: string; analytics?: ExportAnalytics }> {
    try {
      const analytics = this.generateAnalytics(manualTestSuite);
      const fileName = config.fileName || this.generateFileName(manualTestSuite, config.format);
      const filePath = path.join(process.cwd(), 'exports', fileName);

      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      let result: { success: boolean; message: string; filePath?: string };

      switch (config.format) {
        case 'csv':
          result = await this.exportToCSV(manualTestSuite, filePath, config, analytics);
          break;
        case 'json':
          result = await this.exportToJSON(manualTestSuite, filePath, config, analytics);
          break;
        case 'excel':
          result = await this.exportToExcel(manualTestSuite, filePath, config, analytics);
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      return {
        ...result,
        analytics: config.includeAnalytics ? analytics : undefined
      };

    } catch (error) {
      console.error('Error in advanced export:', error);
      return {
        success: false,
        message: `Export failed: ${error.message}`
      };
    }
  }

  /**
   * Generate comprehensive analytics
   */
  private static generateAnalytics(manualTestSuite: ManualTestSuite): ExportAnalytics {
    const testCases = manualTestSuite.manualTestCases;
    const totalTestCases = testCases.length;

    // Count by type - not available in ManualTestCase, use default
    const testCasesByType = { 'Functional': testCases.length };

    // Count by priority - not available in ManualTestCase, use default
    const testCasesByPriority = { 'Medium': testCases.length };

    // Count by severity - not available in ManualTestCase, use default
    const testCasesBySeverity = { 'Medium': testCases.length };

    // Count by status
    const testCasesByStatus = testCases.reduce((acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate rates
    const executedCount = testCases.filter(tc => tc.status !== 'Pending').length;
    const passedCount = testCases.filter(tc => tc.status === 'Pass').length;
    const failedCount = testCases.filter(tc => tc.status === 'Fail').length;
    const blockedCount = testCases.filter(tc => tc.status === 'Blocked').length;

    const executionRate = totalTestCases > 0 ? Math.round((executedCount / totalTestCases) * 100) : 0;
    const passRate = executedCount > 0 ? Math.round((passedCount / executedCount) * 100) : 0;
    const failRate = executedCount > 0 ? Math.round((failedCount / executedCount) * 100) : 0;
    const blockedRate = executedCount > 0 ? Math.round((blockedCount / executedCount) * 100) : 0;

    // Quality score calculation
    const qualityScore = this.calculateQualityScore(passRate, executionRate, testCasesByType, testCasesByPriority);

    // Risk assessment
    const riskAssessment = this.assessRisk(failRate, blockedRate, testCasesBySeverity);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      executionRate, passRate, failRate, blockedRate, testCasesByType, testCasesByPriority
    );

    return {
      totalTestCases,
      testCasesByType,
      testCasesByPriority,
      testCasesBySeverity,
      testCasesByStatus,
      executionRate,
      passRate,
      failRate,
      blockedRate,
      averageExecutionTime: '15 minutes', // This could be calculated from actual data
      qualityScore,
      riskAssessment,
      recommendations
    };
  }

  /**
   * Export to CSV format
   */
  private static async exportToCSV(
    manualTestSuite: ManualTestSuite,
    filePath: string,
    config: ExportConfig,
    analytics: ExportAnalytics
  ): Promise<{ success: boolean; message: string; filePath: string }> {
    let csvContent = '';

    // Add analytics header if requested
    if (config.includeAnalytics) {
      csvContent += ExportUtils.generateAnalyticsCSVSummary(analytics);
      csvContent += '\n\n';
    }

    // Generate CSV content using utility
    csvContent += ExportUtils.generateCSVContent(manualTestSuite.manualTestCases);

    fs.writeFileSync(filePath, csvContent);

    return {
      success: true,
      message: `CSV export completed successfully. ${manualTestSuite.manualTestCases.length} test cases exported.`,
      filePath
    };
  }

  /**
   * Export to JSON format
   */
  private static async exportToJSON(
    manualTestSuite: ManualTestSuite,
    filePath: string,
    config: ExportConfig,
    analytics: ExportAnalytics
  ): Promise<{ success: boolean; message: string; filePath: string }> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportFormat: 'JSON',
        testSuiteName: manualTestSuite.testName,
        totalTestCases: manualTestSuite.manualTestCases.length
      },
      analytics: config.includeAnalytics ? analytics : undefined,
      testSuite: manualTestSuite
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    fs.writeFileSync(filePath, jsonContent);

    return {
      success: true,
      message: `JSON export completed successfully. ${manualTestSuite.manualTestCases.length} test cases exported.`,
      filePath
    };
  }

  /**
   * Export to Excel format (Excel-compatible CSV)
   */
  private static async exportToExcel(
    manualTestSuite: ManualTestSuite,
    filePath: string,
    config: ExportConfig,
    analytics: ExportAnalytics
  ): Promise<{ success: boolean; message: string; filePath: string }> {
    let excelContent = '';

    // Analytics sheet data
    if (config.includeAnalytics) {
      excelContent += ExportUtils.generateAnalyticsCSVSummary(analytics);
      excelContent += '\n\n';
    }

    // Test cases data
    excelContent += 'TEST CASES\n';
    excelContent += ExportUtils.generateCSVContent(manualTestSuite.manualTestCases);

    // Change extension to .csv for Excel compatibility
    const csvFilePath = filePath.replace('.xlsx', '.csv').replace('.xls', '.csv');
    fs.writeFileSync(csvFilePath, excelContent);

    return {
      success: true,
      message: `Excel-compatible export completed successfully. ${manualTestSuite.manualTestCases.length} test cases exported.`,
      filePath: csvFilePath
    };
  }


  /**
   * Generate file name based on test suite and format
   */
  private static generateFileName(manualTestSuite: ManualTestSuite, format: string): string {
    return ExportUtils.generateSafeFileName(manualTestSuite.testName, format);
  }

  /**
   * Calculate quality score based on various metrics
   */
  private static calculateQualityScore(
    passRate: number,
    executionRate: number,
    testCasesByType: Record<string, number>,
    testCasesByPriority: Record<string, number>
  ): number {
    let score = 0;

    // Pass rate contribution (40%)
    score += (passRate / 100) * 40;

    // Execution rate contribution (30%)
    score += (executionRate / 100) * 30;

    // Test coverage diversity (20%)
    const typeCount = Object.keys(testCasesByType).length;
    const maxTypes = 6; // Maximum expected types
    score += (Math.min(typeCount, maxTypes) / maxTypes) * 20;

    // Priority distribution (10%)
    const hasHighPriority = testCasesByPriority['High'] > 0;
    const hasMediumPriority = testCasesByPriority['Medium'] > 0;
    const hasLowPriority = testCasesByPriority['Low'] > 0;
    const priorityDiversity = [hasHighPriority, hasMediumPriority, hasLowPriority].filter(Boolean).length;
    score += (priorityDiversity / 3) * 10;

    return Math.round(score);
  }

  /**
   * Assess risk level based on failure and blocked rates
   */
  private static assessRisk(
    failRate: number,
    blockedRate: number,
    testCasesBySeverity: Record<string, number>
  ): string {
    const criticalCount = testCasesBySeverity['Critical'] || 0;
    const majorCount = testCasesBySeverity['Major'] || 0;

    const highThresholds = RISK_THRESHOLDS.HIGH;
    const mediumThresholds = RISK_THRESHOLDS.MEDIUM;

    if (failRate > highThresholds.failRate || blockedRate > highThresholds.blockedRate || criticalCount > highThresholds.criticalCount) {
      return 'High';
    } else if (failRate > mediumThresholds.failRate || blockedRate > mediumThresholds.blockedRate || majorCount > mediumThresholds.majorCount) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }

  /**
   * Generate recommendations based on test metrics
   */
  private static generateRecommendations(
    executionRate: number,
    passRate: number,
    failRate: number,
    blockedRate: number,
    testCasesByType: Record<string, number>,
    testCasesByPriority: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];
    const thresholds = RECOMMENDATION_THRESHOLDS;

    if (executionRate < thresholds.executionRate) {
      recommendations.push(`Increase test execution rate - currently only ${executionRate}% of tests have been executed`);
    }

    if (passRate < thresholds.passRate && executionRate > 50) {
      recommendations.push(`Investigate failing test cases to improve pass rate from ${passRate}%`);
    }

    if (failRate > thresholds.failRate) {
      recommendations.push(`High failure rate detected (${failRate}%) - review test environment and application stability`);
    }

    if (blockedRate > thresholds.blockedRate) {
      recommendations.push(`Significant number of blocked tests (${blockedRate}%) - resolve blocking issues`);
    }

    if (!testCasesByType['Negative']) {
      recommendations.push('Consider adding negative test cases to improve test coverage');
    }

    if (!testCasesByType['Boundary/Edge']) {
      recommendations.push('Add boundary/edge test cases to catch edge case scenarios');
    }

    if ((testCasesByPriority['High'] || 0) < thresholds.minHighPriorityTests) {
      recommendations.push('Ensure critical functionality is covered with high-priority test cases');
    }

    if (recommendations.length === 0) {
      recommendations.push('Test suite appears to be well-structured and executed. Continue monitoring quality metrics.');
    }

    return recommendations;
  }
}

export default AdvancedExportService;