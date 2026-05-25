/**
 * @file qualityAnalysis.ts
 * @description Quality analysis functions
 */

import { TestStep } from '../playwrightToSteps';
import { ManualTestCase } from '../manualTestCaseService';
import { SCORING_CONFIG } from '../config/constants';

export interface QualityMetrics {
  clarity: number;
  completeness: number;
  traceability: number;
  riskCoverage: number;
  efficiency: number;
  reliability: number;
}

/**
 * Analyze clarity
 */
export function analyzeClarity(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.clarity;
  
  const avgDescLength = testCases.reduce((sum, tc) => sum + tc.testDescription.length, 0) / testCases.length;
  if (avgDescLength > 20) score += Math.min(avgDescLength / 10, 15);
  
  const avgStepLength = testCases.reduce((sum, tc) => sum + tc.testStep.length, 0) / testCases.length;
  if (avgStepLength > 30) score += Math.min(avgStepLength / 20, 10);
  
  const avgExpectedLength = testCases.reduce((sum, tc) => sum + tc.expectedResult.length, 0) / testCases.length;
  if (avgExpectedLength > 25) score += Math.min(avgExpectedLength / 15, 5);
  
  return Math.min(score, 100);
}

/**
 * Analyze completeness
 */
export function analyzeCompleteness(testCases: ManualTestCase[], originalSteps: TestStep[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.completeness;
  
  const completeTests = testCases.filter(tc =>
    tc.testDescription && tc.testStep && tc.expectedResult && tc.title
  ).length;
  if (completeTests > 0) score += (completeTests / testCases.length) * 15;
  
  if (testCases.length > 0) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Analyze traceability
 */
export function analyzeTraceability(testCases: ManualTestCase[], originalSteps: TestStep[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.traceability;
  
  const properIds = testCases.filter(tc => tc.testCaseId.match(/^TC_\d{3}_\d{3}$/)).length;
  if (properIds > 0) score += (properIds / testCases.length) * 20;
  
  return Math.min(score, 100);
}

/**
 * Analyze risk coverage
 */
export function analyzeRiskCoverage(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.riskCoverage;
  
  if (testCases.length > 0) score += 15;
  if (testCases.length > 5) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Analyze efficiency
 */
export function analyzeEfficiency(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.efficiency;
  
  if (testCases.length >= 1 && testCases.length <= 20) score += 15;
  
  const uniqueDescriptions = new Set(testCases.map(tc => tc.testDescription)).size;
  if (uniqueDescriptions === testCases.length) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Analyze reliability
 */
export function analyzeReliability(testCases: ManualTestCase[]): number {
  let score = SCORING_CONFIG.BASE_SCORES.reliability;
  
  const hasValidation = testCases.some(tc =>
    tc.expectedResult.toLowerCase().includes('should') ||
    tc.expectedResult.toLowerCase().includes('expected')
  );
  if (hasValidation) score += 10;
  
  const hasTitle = testCases.some(tc => tc.title && tc.title.length > 10);
  if (hasTitle) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Perform complete quality analysis
 */
export function performQualityAnalysis(testCases: ManualTestCase[], originalSteps: TestStep[]): QualityMetrics {
  return {
    clarity: analyzeClarity(testCases),
    completeness: analyzeCompleteness(testCases, originalSteps),
    traceability: analyzeTraceability(testCases, originalSteps),
    riskCoverage: analyzeRiskCoverage(testCases),
    efficiency: analyzeEfficiency(testCases),
    reliability: analyzeReliability(testCases)
  };
}