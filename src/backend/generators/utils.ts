/**
 * @file utils.ts
 * @description Utility functions for test case generation
 */

import { URL } from 'url';
import { TestStep } from '../playwrightToSteps';
import { ApiSummary, StepSummary, BackendTestCase, FrontendTestCase, BACKEND_JSON_KEYS, FRONTEND_JSON_KEYS } from './types';

/**
 * Detect if script is backend (API) or frontend (UI) focused
 */
export function detectScriptType(scriptContent: string): 'backend' | 'frontend' | 'unknown' {
  const apiPatterns = /page\.route|page\.on\(['"]request|fetch\(|axios\.|http\./gi;
  const uiPatterns = /page\.click|page\.fill|page\.locator|page\.goto/gi;
  
  const apiMatches = (scriptContent.match(apiPatterns) || []).length;
  const uiMatches = (scriptContent.match(uiPatterns) || []).length;
  
  if (apiMatches > uiMatches * 2) return 'backend';
  if (uiMatches > 0) return 'frontend';
  return 'unknown';
}

/**
 * Generate expected outcome for a step
 */
export function generateExpectedOutcome(step: TestStep): string {
  switch (step.action) {
    case 'navigate':
      return 'Page loads successfully';
    case 'click':
      return 'Element responds to click action';
    case 'fill':
    case 'type':
      return 'Field accepts input correctly';
    case 'assert':
      return 'Assertion passes';
    default:
      return 'Action completes successfully';
  }
}

/**
 * Extract meaningful context from test script
 */
export function extractScriptContext(scriptContent: string): string {
  const context: string[] = [];
  
  // Extract test description/title
  const testMatch = scriptContent.match(/test\(['"]([^'"]+)['"]/i) ||
                   scriptContent.match(/describe\(['"]([^'"]+)['"]/i);
  if (testMatch) {
    context.push(`Test Name: ${testMatch[1]}`);
  }
  
  // Extract page URL if present
  const urlMatch = scriptContent.match(/goto\(['"]([^'"]+)['"]/i) ||
                  scriptContent.match(/url:\s*['"]([^'"]+)['"]/i);
  if (urlMatch) {
    context.push(`Application URL: ${urlMatch[1]}`);
  }
  
  // Extract any comments that might provide context
  const comments = scriptContent.match(/\/\/\s*(.+)/g) || [];
  const meaningfulComments = comments
    .map(c => c.replace(/\/\/\s*/, '').trim())
    .filter(c => c.length > 10 && !c.startsWith('TODO') && !c.startsWith('FIXME'))
    .slice(0, 3);
  
  if (meaningfulComments.length > 0) {
    context.push(`Context: ${meaningfulComments.join('. ')}`);
  }
  
  // Extract test data or constants
  const dataMatches = scriptContent.match(/const\s+(\w+)\s*=\s*['"]([^'"]+)['"]/g) || [];
  const testData = dataMatches
    .slice(0, 5)
    .map(m => {
      const match = m.match(/const\s+(\w+)\s*=\s*['"]([^'"]+)['"]/);
      return match ? `${match[1]}: ${match[2]}` : '';
    })
    .filter(Boolean);
  
  if (testData.length > 0) {
    context.push(`Test Data: ${testData.join(', ')}`);
  }
  
  return context.length > 0
    ? context.join('\n')
    : 'No additional context available from script';
}

/**
 * Estimate tokens for chunking
 */
export function estimateTokens(str: string): number {
  return Math.ceil(str.length / 4);
}

/**
 * Smart chunking for API/Step arrays
 */
export function chunkArray<T>(array: T[], maxTokensPerChunk: number = 40000, maxCountPerChunk: number = 25): T[][] {
  const chunks: T[][] = [];
  let currentChunk: T[] = [];
  let currentTokens = 0;

  for (const item of array) {
    const tokenCount = estimateTokens(JSON.stringify(item));
    const wouldExceed =
      currentTokens + tokenCount > maxTokensPerChunk ||
      currentChunk.length >= maxCountPerChunk;

    if (wouldExceed && currentChunk.length) {
      chunks.push(currentChunk);
      currentChunk = [item];
      currentTokens = tokenCount;
    } else {
      currentChunk.push(item);
      currentTokens += tokenCount;
    }
  }

  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
}

/**
 * Process chunks in parallel with concurrency limit
 */
export async function processChunksInParallel<T>(
  chunks: T[][],
  processChunk: (chunk: T[], index: number) => Promise<any[]>,
  concurrency: number = 3
): Promise<any[]> {
  const results: any[] = [];
  
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchPromises = batch.map((chunk, batchIndex) => {
      const chunkIndex = i + batchIndex;
      return processChunk(chunk, chunkIndex);
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
    
    if (i + concurrency < chunks.length) {
      await new Promise(res => setTimeout(res, 500));
    }
  }
  
  return results;
}

/**
 * Safely parse JSON output from LLM
 */
export function safelyParseJsonOutput(rawOutput: string): any[] {
  let cleanOutput = rawOutput
    .replace(/```json|```|^\s*Output:.*?\n|^\s*The JSON output is:\s*|^\s*The list of test cases is:\s*/gim, '')
    .trim();

  if (!cleanOutput.startsWith('[') && cleanOutput.startsWith('{')) {
    cleanOutput = `[${cleanOutput}]`;
  }

  if (!cleanOutput.startsWith('[')) {
    console.error('❌ LLM output is not valid JSON array');
    return [];
  }

  try {
    return JSON.parse(cleanOutput);
  } catch (e: any) {
    console.error('❌ Failed to parse JSON:', e.message);
    return [];
  }
}

/**
 * Validate and normalize backend test case
 */
export function validateAndNormalizeBackendTestcase(testCase: any): BackendTestCase {
  const normalized: any = {};

  normalized.status = 'Completed';
  normalized.automation_status = 'TRUE';

  const emptyKeys = ['original_tc_id', 'product_id', 'subproduct_id', 'feature_id', 'priority', 'labels', 'owner', 'modified_by', 'is_flaky'];
  emptyKeys.forEach(key => { normalized[key] = ''; });

  const requiredKeys = ['title', 'description', 'expected_result', 'flow', 'api', 'method'];

  for (const key of requiredKeys) {
    let value = testCase[key] ? String(testCase[key]).trim() : '';

    if (!value) {
      if (key === 'expected_result') {
        const method = testCase.method ? String(testCase.method).toUpperCase() : 'UNKNOWN';
        value = (method === 'GET') ? 'Data retrieval successful.' : 'Data processed successfully.';
      } else if (key === 'flow') {
        const method = testCase.method ? String(testCase.method).toUpperCase() : 'POST';
        try {
          const apiBase = testCase.api?.startsWith('http') ? testCase.api : `https://app.example.com${testCase.api}`;
          const url = new URL(apiBase);
          value = `Executed ${method} ${url.pathname}`;
        } catch (e) {
          value = `Executed ${method} /api/unknown`;
        }
      } else if (key === 'method') {
        value = 'POST';
      } else if (key === 'title') {
        value = `Test Case - Index ${testCase.originalIndex || 'N/A'}`;
      } else if (key === 'api') {
        value = '/api/unknown';
      }
    }

    // Clean up API field
    if (key === 'api' && value) {
      try {
        if (value.startsWith('http://') || value.startsWith('https://')) {
          const urlObj = new URL(value);
          value = `${urlObj.pathname}${urlObj.search}`;
        }
        value = value.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        value = value.replace(/^\$\{API_BASE_URL\}/, '');
        if (value && !value.startsWith('/')) {
          value = '/' + value;
        }
      } catch (e) {
        // Keep as is
      }
    }

    normalized[key] = value;
  }

  for (const key of BACKEND_JSON_KEYS) {
    if (!normalized.hasOwnProperty(key)) {
      normalized[key] = testCase[key] || '';
    }
  }

  return normalized as BackendTestCase;
}

/**
 * Validate and normalize frontend test case
 */
export function validateAndNormalizeFrontendTestcase(testCase: any): FrontendTestCase {
  const normalized: any = {};

  normalized.status = 'Completed';
  normalized.automation_status = 'TRUE';

  const emptyKeys = ['original_tc_id', 'product_id', 'subproduct_id', 'feature_id', 'priority', 'labels', 'owner', 'modified_by', 'blocked', 'blocked_why'];
  emptyKeys.forEach(key => { normalized[key] = ''; });

  const requiredKeys = ['title', 'description', 'expected_result', 'test_step'];

  for (const key of requiredKeys) {
    let value = testCase[key] ? String(testCase[key]).trim() : '';
    if (!value) {
      value = `Missing value for ${key}.`;
    }
    normalized[key] = value;
  }

  normalized['test_data'] = (testCase['test data'] || testCase['test_data']) ? String(testCase['test data'] || testCase['test_data']).trim() : '';

  for (const key of FRONTEND_JSON_KEYS) {
    if (!normalized.hasOwnProperty(key)) {
      normalized[key] = '';
    }
  }

  return normalized as FrontendTestCase;
}

/**
 * Convert to CSV format
 */
export function convertToCSV(testCases: any[], keys: string[]): string {
  const csvRows = [keys.join(',')];

  testCases.forEach(testCase => {
    const row = keys.map(key => {
      let value = testCase[key];
      if (value === null || value === undefined || value === '') return '';

      // Replace commas with semicolons
      if (typeof value === 'string') {
        value = String(value).replace(/,/g, ';');
      }

      // Clean up newlines and trim
      const str = String(value).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ').trim();

      // Quote if contains double-quote
      if (str.includes('"')) return `"${str}"`;

      return str;
    }).join(',');
    csvRows.push(row);
  });

  return csvRows.join('\n');
}