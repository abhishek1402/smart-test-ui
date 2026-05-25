/**
 * @file testCaseGenerators.ts
 * @description Functions to generate backend and frontend test cases
 */

import { TestStep } from '../playwrightToSteps';
import { BackendTestCase, FrontendTestCase, ApiSummary, StepSummary, BACKEND_JSON_KEYS, FRONTEND_JSON_KEYS } from './types';
import { BACKEND_PROMPT_TEMPLATE, FRONTEND_PROMPT_TEMPLATE } from './prompts';
import { callGeminiWithRetry } from './apiClient';
import {
  extractScriptContext,
  chunkArray,
  processChunksInParallel,
  safelyParseJsonOutput,
  validateAndNormalizeBackendTestcase,
  validateAndNormalizeFrontendTestcase,
  convertToCSV
} from './utils';
import { generateEnrichedApiSummary, generateEnrichedFrontendSummary } from './summaryGenerators';

/**
 * Generate frontend test cases
 */
export async function generateFrontendTestCases(scriptContent: string, logsContent: string): Promise<string> {
  console.log('🖥️ Generating frontend test cases...');

  const enrichedSummary = generateEnrichedFrontendSummary(scriptContent, logsContent);

  if (!enrichedSummary.length) {
    console.warn('⚠️ No frontend steps found in script');
    return '';
  }

  console.log(`📦 Processing ${enrichedSummary.length} frontend steps`);

  const chunks = chunkArray(enrichedSummary, 40000, 25);
  console.log(`📦 Split into ${chunks.length} chunk(s)`);

  const scriptContext = extractScriptContext(scriptContent);

  const processChunk = async (chunk: StepSummary[], index: number): Promise<FrontendTestCase[]> => {
    console.log(`🚀 Processing chunk ${index + 1}/${chunks.length} (${chunk.length} steps)`);

    const userPrompt = `
### TEST SCRIPT CONTEXT:
${scriptContext}

### Frontend Step Summary Chunk (${index + 1}/${chunks.length})
${JSON.stringify(chunk, null, 2)}

---
**INSTRUCTION: 1:1 MAPPING REQUIRED.**
Generate exactly ${chunk.length} comprehensive, production-ready test case objects, one for each step above.
Each test case should be detailed, professional, and include all validation points, edge cases, and business context.
Think like a senior QA engineer creating test cases for a critical production system.
`;

    const messages = [
      { role: 'system', content: FRONTEND_PROMPT_TEMPLATE },
      { role: 'user', content: userPrompt }
    ];

    try {
      const output = await callGeminiWithRetry(messages);
      const generatedTests = safelyParseJsonOutput(output);

      if (generatedTests.length < chunk.length) {
        console.warn(`⚠️ Got ${generatedTests.length} tests for ${chunk.length} steps`);
      }

      return generatedTests.map(test => validateAndNormalizeFrontendTestcase(test));
    } catch (error: any) {
      console.error(`❌ Error processing chunk ${index + 1}:`, error.message);
      return [];
    }
  };

  const allTestCases = await processChunksInParallel(chunks, processChunk, 3);

  // Remove duplicates and assign IDs
  const uniqueTestCases = Array.from(
    new Map(allTestCases.map(test => [test.title, test])).values()
  );

  uniqueTestCases.forEach((testCase, index) => {
    const paddedIndex = String(index + 1).padStart(3, '0');
    testCase.original_tc_id = `TC_${paddedIndex}`;
    // Remove "Step X:" prefix from title
    if (testCase.title) {
      testCase.title = testCase.title.replace(/^Step\s*\d+:\s*/i, '').trim();
    }
  });

  console.log(`✅ Generated ${uniqueTestCases.length} frontend test cases`);

  return convertToCSV(uniqueTestCases, FRONTEND_JSON_KEYS);
}

/**
 * Generate backend test cases
 */
export async function generateBackendTestCases(
  scriptContent: string,
  logsContent: string,
  scriptPath: string | null
): Promise<string> {
  console.log('📡 Generating backend test cases...');

  const enrichedSummary = generateEnrichedApiSummary(scriptContent, logsContent);

  if (!enrichedSummary.length) {
    console.warn('⚠️ No API calls found');
    return '';
  }

  console.log(`📦 Processing ${enrichedSummary.length} API calls`);

  const chunks = chunkArray(enrichedSummary, 40000, 25);
  console.log(`📦 Split into ${chunks.length} chunk(s)`);

  const scriptContext = extractScriptContext(scriptContent);

  const processChunk = async (chunk: ApiSummary[], index: number): Promise<BackendTestCase[]> => {
    console.log(`🚀 Processing chunk ${index + 1}/${chunks.length} (${chunk.length} APIs)`);

    const userPrompt = `
### TEST SCRIPT CONTEXT:
${scriptContext}

### API Summary Chunk (${index + 1}/${chunks.length})
${JSON.stringify(chunk, null, 2)}

---
**INSTRUCTION: 1:1 MAPPING REQUIRED.**
Generate exactly ${chunk.length} comprehensive, production-ready test case objects, one for each API above.
Each test case should be detailed, professional, and include all validation points, security considerations, and business context.
Think like a senior QA engineer creating test cases for a critical production API system.
`;

    const messages = [
      { role: 'system', content: BACKEND_PROMPT_TEMPLATE },
      { role: 'user', content: userPrompt }
    ];

    try {
      const output = await callGeminiWithRetry(messages);
      const generatedTests = safelyParseJsonOutput(output);

      if (generatedTests.length < chunk.length) {
        console.warn(`⚠️ Got ${generatedTests.length} tests for ${chunk.length} APIs`);
      }

      return generatedTests.map(test => validateAndNormalizeBackendTestcase(test));
    } catch (error: any) {
      console.error(`❌ Error processing chunk ${index + 1}:`, error.message);
      return [];
    }
  };

  const allTestCases = await processChunksInParallel(chunks, processChunk, 3);

  // Remove duplicates and assign IDs
  const uniqueTestCases = Array.from(
    new Map(allTestCases.map(test => [`${test.method}_${test.api}_${test.title}`, test])).values()
  );

  uniqueTestCases.forEach((testCase, index) => {
    const paddedIndex = String(index + 1).padStart(3, '0');
    testCase.original_tc_id = `TC_${paddedIndex}`;
  });

  console.log(`✅ Generated ${uniqueTestCases.length} backend test cases`);

  return convertToCSV(uniqueTestCases, BACKEND_JSON_KEYS);
}