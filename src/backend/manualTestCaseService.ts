import { ObjectId } from 'mongodb';
import DataBase from './mongoClient';
import EnhancedManualTestGenerator from './enhancedManualTestGenerator';
import TestServies from './testService';
import crypto from 'crypto';

const DB = DataBase.GetDB();
const MANUAL_TEST_CASES_COLLECTION = DB.collection('MANUAL_TEST_CASES');

export interface ManualTestCase {
  testCaseId: string;
  testDescription: string;
  title: string;
  testStep: string;
  expectedResult: string;
  status: 'Pass' | 'Fail' | 'Blocked' | 'Pending';
}

export interface ManualTestSuite {
  _id?: ObjectId;
  automatedTestId: string;
  testName: string;
  serialNumber: number;
  manualTestCases: ManualTestCase[];
  createdAt: Date;
  updatedAt: Date;
  enhancedAnalysis?: {
    qualityPercentage: number;
    coveragePercentage: number;
    overallGrade: string;
    criticalGaps: string[];
    topRecommendations: string[];
  };
}

class ManualTestCaseService {
  /**
   * Generates manual test cases from automated test script using Gemini API
   */
  /**
   * Generate a hash of the test script to detect changes
   */
  private static generateTestScriptHash(testScript: string): string {
    return crypto.createHash('md5').update(testScript).digest('hex');
  }

  static generateManualTestCases = async (
    automatedTestId: string,
    testName: string,
    testScript: string,
    serialNumber: number
  ): Promise<{ success: boolean; message?: string; data?: ManualTestSuite }> => {
    try {
      console.log('🚀 Starting enhanced manual test case generation with Gemini API...');
      console.log('📝 Test ID:', automatedTestId);
      console.log('📝 Test Name:', testName);
      
      // Generate hash of test script to track changes
      const testScriptHash = this.generateTestScriptHash(testScript);
      console.log('🔑 Test script hash:', testScriptHash);
      
      // Generate CSV using enhanced generator with Gemini API
      const csvOutput = await EnhancedManualTestGenerator.generateTestcasesFromContent(
        testScript,
        '', // No logs for now
        null // No script path
      );

      if (!csvOutput) {
        return {
          success: false,
          message: 'Failed to generate test cases. Please check your GEMINI_API_KEY environment variable.'
        };
      }

      // Parse CSV to manual test cases
      const manualTestCases = this.parseCSVToManualTestCases(csvOutput, serialNumber);

      if (manualTestCases.length === 0) {
        return {
          success: false,
          message: 'No test cases were generated from the script.'
        };
      }

      console.log(`✅ Generated ${manualTestCases.length} manual test cases, now saving to TEST-CASES collection...`);

      // Save manual test cases with hash to TEST-CASES collection
      const saveResult = await TestServies.addManualTestCasesToTestCase(automatedTestId, manualTestCases);
      
      if (!saveResult.success) {
        return {
          success: false,
          message: `Failed to save manual test cases: ${saveResult.message}`
        };
      }

      // Also save the hash to track when test script changes
      await TestServies.updateTestCase(automatedTestId, {
        testScriptHash: testScriptHash
      });

      console.log(`✅ Successfully saved ${manualTestCases.length} manual test cases with hash to TEST-CASES collection`);
      
      // Return the manual test suite data
      const manualTestSuite: ManualTestSuite = {
        automatedTestId,
        testName,
        serialNumber,
        manualTestCases,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return {
        success: true,
        message: `🚀 Successfully generated and cached ${manualTestCases.length} high-quality manual test cases using AI!`,
        data: manualTestSuite
      };

    } catch (error: any) {
      console.error('❌ Error generating manual test cases:', error);
      return {
        success: false,
        message: `Failed to generate manual test cases: ${error.message}`
      };
    }
  };

  /**
   * Check if manual test cases need regeneration due to test script changes
   */
  static async needsRegeneration(automatedTestId: string, currentTestScript: string): Promise<boolean> {
    try {
      const currentHash = this.generateTestScriptHash(currentTestScript);
      
      // Get the test case from database
      const DB = DataBase.GetDB();
      const TEST_COLLECTION = DB.collection('TEST-CASES');
      const testCase = await TEST_COLLECTION.findOne({ _id: new ObjectId(automatedTestId) });
      
      if (!testCase) {
        return true; // Test case not found, needs generation
      }
      
      if (!testCase.manualTestCases || testCase.manualTestCases.length === 0) {
        return true; // No manual test cases exist, needs generation
      }
      
      if (!testCase.testScriptHash) {
        return true; // No hash stored, needs regeneration to create hash
      }
      
      // Compare hashes
      const hashesMatch = testCase.testScriptHash === currentHash;
      
      if (!hashesMatch) {
        console.log('⚠️ Test script has changed! Hash mismatch:');
        console.log('  Stored hash:', testCase.testScriptHash);
        console.log('  Current hash:', currentHash);
        console.log('  Manual test cases need regeneration');
      }
      
      return !hashesMatch; // Needs regeneration if hashes don't match
      
    } catch (error) {
      console.error('Error checking if regeneration needed:', error);
      return false; // On error, don't force regeneration
    }
  }

  /**
   * Parse CSV output to ManualTestCase array
   */
  private static parseCSVToManualTestCases(csvOutput: string, serialNumber: number): ManualTestCase[] {
    const lines = csvOutput.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      return []; // No data rows
    }

    const header = lines[0].split(',');
    const testCases: ManualTestCase[] = [];

    // Find column indices - support both old (prerequisites) and new (title) format
    const titleIdx = header.findIndex(h => h.toLowerCase().includes('title'));
    const descIdx = header.findIndex(h => h.toLowerCase().includes('description'));
    const expectedIdx = header.findIndex(h => h.toLowerCase().includes('expected'));
    const stepIdx = header.findIndex(h => h.toLowerCase().includes('step') || h.toLowerCase().includes('flow'));
    const priorityIdx = header.findIndex(h => h.toLowerCase().includes('priority'));

    // Parse each row
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      
      if (row.length < 3) continue; // Skip invalid rows

      // Extract title - use description as fallback if title is empty
      let title = row[titleIdx] || '';
      if (!title || title.trim() === '') {
        // Generate title from description (take first sentence or first 50 chars)
        const desc = row[descIdx] || '';
        title = desc.split('.')[0].substring(0, 80).trim() || 'Test case title';
      }

      const testCase: ManualTestCase = {
        testCaseId: `TC_${String(serialNumber).padStart(3, '0')}_${String(i).padStart(3, '0')}`,
        testDescription: row[descIdx] || title || 'Test case description',
        title: title,
        testStep: row[stepIdx] || 'Execute the test steps as described',
        expectedResult: row[expectedIdx] || 'Test should complete successfully',
        status: 'Pending'
      };

      testCases.push(testCase);
    }

    return testCases;
  }

  /**
   * Parse CSV row handling quoted values
   */
  private static parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

}

export default ManualTestCaseService;