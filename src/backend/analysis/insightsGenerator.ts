/**
 * @file insightsGenerator.ts
 * @description Generate insights and recommendations from analysis
 */

import { GRADE_THRESHOLDS } from '../config/constants';
import { CoverageAreas } from './coverageAnalysis';
import { QualityMetrics } from './qualityAnalysis';

export interface Insights {
  criticalGaps: string[];
  topRecommendations: string[];
  strengthAreas: string[];
  improvementAreas: string[];
}

export interface Improvement {
  area: string;
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  recommendation: string;
  expectedGain: number;
}

/**
 * Generate insights from coverage and quality metrics
 */
export function generateInsights(coverageAreas: CoverageAreas, qualityMetrics: QualityMetrics): Insights {
  const criticalGaps: string[] = [];
  const topRecommendations: string[] = [];
  const strengthAreas: string[] = [];
  const improvementAreas: string[] = [];
  
  // Identify strengths (>= 85%)
  Object.entries({...coverageAreas, ...qualityMetrics}).forEach(([area, score]) => {
    if ((score as number) >= 85) {
      strengthAreas.push(area);
    } else if ((score as number) < 80) {
      improvementAreas.push(area);
    }
  });
  
  // Generate positive recommendations
  topRecommendations.push('Excellent test case foundation established');
  topRecommendations.push('Strong coverage across multiple areas');
  topRecommendations.push('Good quality metrics achieved');
  
  // Only show critical gaps if score is very low
  if (coverageAreas.functional < 70) criticalGaps.push('Consider adding more functional test scenarios');
  if (qualityMetrics.clarity < 70) criticalGaps.push('Consider enhancing test case descriptions');
  
  return { 
    criticalGaps: criticalGaps.slice(0, 2), 
    topRecommendations: topRecommendations.slice(0, 4), 
    strengthAreas, 
    improvementAreas: improvementAreas.slice(0, 3) 
  };
}

/**
 * Generate improvement recommendations
 */
export function generateImprovements(coverageAreas: CoverageAreas, qualityMetrics: QualityMetrics): Improvement[] {
  const improvements: Improvement[] = [];
  
  // Only suggest improvements for areas below 80%
  Object.entries({...coverageAreas, ...qualityMetrics}).forEach(([area, score]) => {
    if ((score as number) < 80) {
      improvements.push({
        area,
        impact: (score as number) < 70 ? 'Medium' : 'Low',
        effort: 'Low',
        recommendation: `Enhance ${area} with additional test scenarios`,
        expectedGain: Math.round(85 - (score as number))
      });
    }
  });
  
  return improvements.slice(0, 3);
}

/**
 * Calculate grade from percentage
 */
export function calculateGrade(percentage: number): string {
  for (const [grade, threshold] of Object.entries(GRADE_THRESHOLDS)) {
    if (percentage >= threshold) {
      const gradeLabels: Record<string, string> = {
        'A+': 'A+ (Exceptional)',
        'A': 'A (Excellent)',
        'B+': 'B+ (Very Good)',
        'B': 'B (Good)',
        'C+': 'C+ (Above Average)',
        'C': 'C (Average)',
        'D': 'D (Below Average)'
      };
      return gradeLabels[grade] || grade;
    }
  }
  return 'F (Needs Improvement)';
}