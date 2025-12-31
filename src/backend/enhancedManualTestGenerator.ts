/**
 * @file enhancedManualTestGenerator.ts
 * @description Enhanced manual test case generator - Main entry point
 * 
 * This file has been refactored into smaller modules:
 * - generators/apiClient.ts - API communication
 * - generators/types.ts - Type definitions
 * - generators/prompts.ts - Prompt templates
 * - generators/utils.ts - Utility functions
 * - generators/summaryGenerators.ts - Summary generation
 * - generators/testCaseGenerators.ts - Test case generation
 */

import { detectScriptType } from './generators/utils';
import { generateFrontendTestCases, generateBackendTestCases } from './generators/testCaseGenerators';

// Re-export types for backward compatibility
export * from './generators/types';

/**
 * Enhanced Manual Test Generator Class
 */
export class EnhancedManualTestGenerator {
  
  /**
   * Main generation function
   */
  static async generateTestcasesFromContent(
    scriptContent: string,
    logsContent: string = '',
    scriptPath: string | null = null
  ): Promise<string> {
    console.log('🚀 Starting enhanced manual test case generation...');
    console.log('📝 Script content length:', scriptContent?.length || 0);

    if (!scriptContent || scriptContent.trim().length === 0) {
      console.error('❌ Empty script content provided');
      return '';
    }

    const scriptType = detectScriptType(scriptContent);
    console.log(`📊 Detected script type: ${scriptType}`);

    try {
      if (scriptType === 'frontend') {
        return await generateFrontendTestCases(scriptContent, logsContent);
      } else if (scriptType === 'backend') {
        return await generateBackendTestCases(scriptContent, logsContent, scriptPath);
      } else {
        console.warn('⚠️ Unknown script type, defaulting to frontend generation');
        return await generateFrontendTestCases(scriptContent, logsContent);
      }
    } catch (error: any) {
      console.error('❌ Error in generateTestcasesFromContent:', error);
      throw error;
    }
  }
}

export default EnhancedManualTestGenerator;