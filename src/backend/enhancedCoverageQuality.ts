/**
 * @file enhancedCoverageQuality.ts
 * @description Enhanced Test Coverage and Quality Score System - Main entry point
 * 
 * This file has been refactored into smaller modules:
 * - analysis/coverageAnalysis.ts - Coverage analysis functions
 * - analysis/qualityAnalysis.ts - Quality analysis functions
 * - analysis/insightsGenerator.ts - Insights and recommendations
 */

import { TestStep } from './playwrightToSteps';
import { ManualTestCase, ManualTestSuite } from './manualTestCaseService';
import { SCORING_CONFIG } from './config/constants';
import { performCoverageAnalysis, CoverageAreas } from './analysis/coverageAnalysis';
import { performQualityAnalysis, QualityMetrics } from './analysis/qualityAnalysis';
import { generateInsights, generateImprovements, calculateGrade, Improvement } from './analysis/insightsGenerator';

export interface EnhancedAnalysis {
  testSuiteId: string;
  testName: string;
  timestamp: Date;
  
  // Coverage Analysis (40% weight)
  coverageScore: number;
  coveragePercentage: number;
  coverageAreas: CoverageAreas;
  
  // Quality Analysis (60% weight)
  qualityScore: number;
  qualityPercentage: number;
  qualityMetrics: QualityMetrics;
  
  // Combined Results
  combinedScore: number;
  combinedPercentage: number;
  overallGrade: string;
  
  // Actionable Insights
  criticalGaps: string[];
  topRecommendations: string[];
  strengthAreas: string[];
  improvementAreas: string[];
  
  // Prioritized Improvements
  improvements: Improvement[];
}

export class EnhancedCoverageQualityAnalyzer {
  
  /**
   * Perform enhanced analysis
   */
  static async analyze(testSuite: ManualTestSuite, originalSteps: TestStep[]): Promise<EnhancedAnalysis> {
    const testCases = testSuite.manualTestCases;
    
    // Coverage Analysis
    const coverageAreas = performCoverageAnalysis(testCases, originalSteps);
    
    // Calculate weighted coverage score
    const coverageWeights = SCORING_CONFIG.COVERAGE_WEIGHTS;
    const coverageScore = Object.entries(coverageAreas).reduce((sum, [key, score]) =>
      sum + (score * coverageWeights[key as keyof typeof coverageWeights]), 0
    );
    const maxCoverageScore = Object.values(coverageWeights).reduce((sum, weight) => sum + (100 * weight), 0);
    const coveragePercentage = (coverageScore / maxCoverageScore) * 100;
    
    // Quality Analysis
    const qualityMetrics = performQualityAnalysis(testCases, originalSteps);
    
    // Calculate weighted quality score
    const qualityWeights = SCORING_CONFIG.QUALITY_WEIGHTS;
    const qualityScore = Object.entries(qualityMetrics).reduce((sum, [key, score]) =>
      sum + (score * qualityWeights[key as keyof typeof qualityWeights]), 0
    );
    const maxQualityScore = Object.values(qualityWeights).reduce((sum, weight) => sum + (100 * weight), 0);
    const qualityPercentage = (qualityScore / maxQualityScore) * 100;
    
    // Combined Score
    const combinedWeights = SCORING_CONFIG.COMBINED_WEIGHTS;
    const combinedScore = (coverageScore * combinedWeights.coverage) + (qualityScore * combinedWeights.quality);
    const maxCombinedScore = (maxCoverageScore * combinedWeights.coverage) + (maxQualityScore * combinedWeights.quality);
    const combinedPercentage = (combinedScore / maxCombinedScore) * 100;
    
    // Generate insights
    const { criticalGaps, topRecommendations, strengthAreas, improvementAreas } = generateInsights(coverageAreas, qualityMetrics);
    const improvements = generateImprovements(coverageAreas, qualityMetrics);
    const overallGrade = calculateGrade(combinedPercentage);
    
    return {
      testSuiteId: testSuite.automatedTestId,
      testName: testSuite.testName,
      timestamp: new Date(),
      coverageScore,
      coveragePercentage,
      coverageAreas,
      qualityScore,
      qualityPercentage,
      qualityMetrics,
      combinedScore,
      combinedPercentage,
      overallGrade,
      criticalGaps,
      topRecommendations,
      strengthAreas,
      improvementAreas,
      improvements
    };
  }
}

export default EnhancedCoverageQualityAnalyzer;