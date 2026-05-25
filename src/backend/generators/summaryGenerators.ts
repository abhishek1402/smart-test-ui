/**
 * @file summaryGenerators.ts
 * @description Functions to generate API and frontend summaries
 */

import { URL } from 'url';
import { playwrightConverter, TestStep } from '../playwrightToSteps';
import { ApiSummary, StepSummary } from './types';
import { generateExpectedOutcome } from './utils';

/**
 * Generate enriched API summary from script
 */
export function generateEnrichedApiSummary(scriptContent: string, logsContent: string): ApiSummary[] {
  const apiCalls: ApiSummary[] = [];
  let index = 0;

  // Extract API calls from logs or script
  const apiRegex = /(GET|POST|PUT|DELETE|PATCH)\s+(https?:\/\/[^\s]+|\/[^\s]*)/gi;
  let match;

  while ((match = apiRegex.exec(scriptContent + '\n' + logsContent)) !== null) {
    const method = match[1].toUpperCase();
    let url = match[2];

    // Clean up URL
    if (url.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        url = urlObj.pathname + urlObj.search;
      } catch (e) {
        // Keep as is if URL parsing fails
      }
    }

    apiCalls.push({
      id: `${method}_${url.split('?')[0]}`,
      originalIndex: index++,
      method,
      url,
      statusCode: 200 // Default, can be enhanced
    });
  }

  return apiCalls;
}

/**
 * Generate enriched frontend summary from steps
 */
export function generateEnrichedFrontendSummary(scriptContent: string, logsContent: string): StepSummary[] {
  const stepsFormat = playwrightConverter.convertToSteps(scriptContent, 'Test');
  const steps: StepSummary[] = [];

  stepsFormat.steps.forEach((step, index) => {
    steps.push({
      id: `STEP_${index + 1}_${step.action}`,
      originalIndex: index,
      stepNumber: index + 1,
      title: step.description,
      actionType: step.action,
      selector: step.target,
      value: step.value,
      expectedOutcome: generateExpectedOutcome(step)
    });
  });

  return steps;
}