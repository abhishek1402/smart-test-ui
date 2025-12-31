import { ExportConfig } from './advancedExportService';
import { EXPORT_CONFIG } from './config/constants';

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<ExportConfig>;
  isDefault?: boolean;
}

export interface ExportHistory {
  id: string;
  fileName: string;
  format: string;
  exportedAt: Date;
  testSuiteName: string;
  testCaseCount: number;
  filePath: string;
  config: ExportConfig;
}

export class ExportConfigService {
  private static readonly DEFAULT_TEMPLATES: ExportTemplate[] = EXPORT_CONFIG.DEFAULT_TEMPLATES;

  private static exportHistory: ExportHistory[] = [];

  /**
   * Get all available export templates
   */
  static getExportTemplates(): ExportTemplate[] {
    return [...this.DEFAULT_TEMPLATES];
  }


  /**
   * Get export statistics
   */
  static getExportStatistics(): {
    totalExports: number;
    formatBreakdown: Record<string, number>;
    recentExports: number;
    averageTestCaseCount: number;
  } {
    const totalExports = this.exportHistory.length;
    const formatBreakdown = this.exportHistory.reduce((acc, item) => {
      acc[item.format] = (acc[item.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentExports = this.exportHistory.filter(item => 
      new Date(item.exportedAt) > last7Days
    ).length;

    const averageTestCaseCount = totalExports > 0 
      ? Math.round(this.exportHistory.reduce((sum, item) => sum + item.testCaseCount, 0) / totalExports)
      : 0;

    return {
      totalExports,
      formatBreakdown,
      recentExports,
      averageTestCaseCount
    };
  }
  
}

export default ExportConfigService;