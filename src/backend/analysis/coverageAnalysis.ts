/**
 * @file coverageAnalysis.ts
 * @description Coverage analysis functions
 */

import { TestStep } from '../playwrightToSteps';
import { ManualTestCase } from '../manualTestCaseService';
import { SCORING_CONFIG } from '../config/constants';

export interface CoverageAreas {
  functional: number;
  dataValidation: number;
  errorHandling: number;
  security: number;
  boundary: number;
  uiInteraction: number;
  performance: number;
  accessibility: number;
}

/**
 * Analyze functional coverage
 */
export function analyzeFunctional(testCases: ManualTestCase[], originalSteps: TestStep[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.functional;
  
  if (testCases.length > 0) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasFormInteraction;
  
  const actions = ['click', 'fill', 'type', 'select', 'submit', 'navigate', 'enter'];
  const coveredActions = new Set<string>();
  testCases.forEach(tc => {
    actions.forEach(action => {
      if (tc.testStep.toLowerCase().includes(action)) coveredActions.add(action);
    });
  });
  if (coveredActions.size > 0) score += Math.min(coveredActions.size * 2, 10);
  
  if (testCases.length > 1) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Analyze data validation coverage
 */
export function analyzeDataValidation(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.dataValidation;
  
  const hasFormInteraction = testCases.some(tc =>
    tc.testStep.toLowerCase().includes('enter') ||
    tc.testStep.toLowerCase().includes('fill') ||
    tc.testStep.toLowerCase().includes('input') ||
    tc.testStep.toLowerCase().includes('field')
  );
  if (hasFormInteraction) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasFormInteraction;
  
  const hasValidation = testCases.some(tc =>
    tc.expectedResult.toLowerCase().includes('should') ||
    tc.expectedResult.toLowerCase().includes('accept') ||
    tc.expectedResult.toLowerCase().includes('field') ||
    tc.expectedResult.toLowerCase().includes('correctly')
  );
  if (hasValidation) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasValidation;
  
  return Math.min(score, 100);
}

/**
 * Analyze error handling coverage
 */
export function analyzeErrorHandling(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.errorHandling;
  
  const hasExpectedBehavior = testCases.some(tc =>
    tc.expectedResult.toLowerCase().includes('should') ||
    tc.expectedResult.toLowerCase().includes('must') ||
    tc.expectedResult.toLowerCase().includes('expected') ||
    tc.expectedResult.toLowerCase().includes('successfully')
  );
  if (hasExpectedBehavior) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasExpectedBehavior;
  
  const hasDetailedResults = testCases.some(tc =>
    tc.expectedResult.includes('•') ||
    tc.expectedResult.split('\n').length > 1
  );
  if (hasDetailedResults) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasDetailedResults;
  
  return Math.min(score, 100);
}

/**
 * Analyze security coverage
 */
export function analyzeSecurity(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.security;
  
  const hasAuth = testCases.some(tc =>
    tc.testDescription.toLowerCase().includes('login') ||
    tc.testStep.toLowerCase().includes('password') ||
    tc.title.toLowerCase().includes('credential') ||
    tc.title.toLowerCase().includes('login')
  );
  if (hasAuth) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasAuth;
  
  const hasBrowserSecurity = testCases.some(tc =>
    tc.title.toLowerCase().includes('browser') ||
    tc.title.toLowerCase().includes('accessible')
  );
  if (hasBrowserSecurity) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasBrowserSecurity;
  
  return Math.min(score, 100);
}

/**
 * Analyze boundary coverage
 */
export function analyzeBoundary(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.boundary;
  
  const hasDataInput = testCases.some(tc =>
    tc.testStep.toLowerCase().includes('enter') ||
    tc.testStep.toLowerCase().includes('data') ||
    tc.testStep.toLowerCase().includes('field')
  );
  if (hasDataInput) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasDataInput;
  
  const hasValidation = testCases.some(tc =>
    tc.expectedResult.toLowerCase().includes('accept') ||
    tc.expectedResult.toLowerCase().includes('valid')
  );
  if (hasValidation) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasValidation;
  
  return Math.min(score, 100);
}

/**
 * Analyze UI interaction coverage
 */
export function analyzeUIInteraction(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.uiInteraction;
  
  const hasInteraction = testCases.some(tc =>
    tc.testStep.toLowerCase().includes('click') ||
    tc.testStep.toLowerCase().includes('navigate') ||
    tc.testStep.toLowerCase().includes('enter')
  );
  if (hasInteraction) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasInteraction;
  
  const hasUIElements = testCases.some(tc =>
    tc.testStep.toLowerCase().includes('button') ||
    tc.testStep.toLowerCase().includes('field') ||
    tc.testStep.toLowerCase().includes('element')
  );
  if (hasUIElements) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasUIElements;
  
  return Math.min(score, 100);
}

/**
 * Analyze performance coverage
 */
export function analyzePerformance(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.performance;
  
  const hasPerformance = testCases.some(tc =>
    tc.expectedResult.toLowerCase().includes('load') ||
    tc.expectedResult.toLowerCase().includes('successfully') ||
    tc.expectedResult.toLowerCase().includes('complete')
  );
  if (hasPerformance) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasPerformance;
  
  return Math.min(score, 100);
}

/**
 * Analyze accessibility coverage
 */
export function analyzeAccessibility(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.accessibility;
  
  const hasAccessibility = testCases.some(tc =>
    tc.testStep.toLowerCase().includes('click') ||
    tc.testStep.toLowerCase().includes('enter') ||
    tc.title.toLowerCase().includes('browser')
  );
  if (hasAccessibility) score += SCORING_CONFIG.SCORE_MULTIPLIERS.hasAccessibility;
  
  return Math.min(score, 100);
}

/**
 * Perform complete coverage analysis
 */
export function performCoverageAnalysis(testCases: ManualTestCase[], originalSteps: TestStep[]): CoverageAreas {
  return {
    functional: analyzeFunctional(testCases, originalSteps),
    dataValidation: analyzeDataValidation(testCases),
    errorHandling: analyzeErrorHandling(testCases),
    security: analyzeSecurity(testCases),
    boundary: analyzeBoundary(testCases),
    uiInteraction: analyzeUIInteraction(testCases),
    performance: analyzePerformance(testCases),
    accessibility: analyzeAccessibility(testCases)
  };
}