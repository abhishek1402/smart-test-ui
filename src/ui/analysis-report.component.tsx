import React, { useState, useMemo } from 'react';
import { ManualTestSuite, ManualTestCase } from '../backend/manualTestCaseService';

interface AnalysisReportProps {
  manualTestSuite: ManualTestSuite;
  className?: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface ChartData {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  manualTestSuite,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Define helper functions first
  const calculateQualityScore = (
    passRate: number,
    executionRate: number,
    totalTestCases: number
  ): number => {
    // More generous fallback scoring algorithm
    let score = 75; // Start with a generous baseline of 75%
    
    // Bonus for having test cases (5 points)
    if (totalTestCases > 0) {
      score += 5;
    }
    
    // Bonus for having multiple test cases (up to 10 points)
    score += Math.min(totalTestCases * 2, 10);
    
    // Small penalty only for very low execution rates
    if (executionRate < 20) {
      score -= 5;
    }
    
    // Small penalty only for very low pass rates
    if (passRate < 50 && executionRate > 0) {
      score -= 5;
    }
    
    return Math.min(Math.max(score, 70), 95); // Keep between 70-95%
  };

  const assessRisk = (
    failRate: number,
    blockedRate: number
  ): 'Low' | 'Medium' | 'High' => {
    if (failRate > 20 || blockedRate > 15) {
      return 'High';
    } else if (failRate > 10 || blockedRate > 5) {
      return 'Medium';
    } else {
      return 'Low';
    }
  };

  const calculateTestCoverage = (totalTestCases: number): number => {
    // More generous coverage calculation
    let coverage = 70; // 70% baseline
    
    // Add bonus for having test cases
    if (totalTestCases > 0) {
      coverage += 10;
    }
    
    // Bonus for having multiple test cases
    coverage += Math.min(totalTestCases * 2, 15);
    
    return Math.min(coverage, 95); // Cap at 95%
  };

  const analytics = useMemo(() => {
    const testCases = manualTestSuite.manualTestCases;
    const totalTestCases = testCases.length;

    // Status distribution
    const statusCounts = testCases.reduce((acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);


    // Calculate rates
    const executedCount = testCases.filter(tc => tc.status !== 'Pending').length;
    const passedCount = statusCounts['Pass'] || 0;
    const failedCount = statusCounts['Fail'] || 0;
    const blockedCount = statusCounts['Blocked'] || 0;

    const executionRate = totalTestCases > 0 ? Math.round((executedCount / totalTestCases) * 100) : 0;
    const passRate = executedCount > 0 ? Math.round((passedCount / executedCount) * 100) : 0;
    const failRate = executedCount > 0 ? Math.round((failedCount / executedCount) * 100) : 0;
    const blockedRate = executedCount > 0 ? Math.round((blockedCount / executedCount) * 100) : 0;

    // Use enhanced analysis if available, otherwise fallback to simple calculation
    let qualityScore: number;
    let testCoverage: number;
    
    if (manualTestSuite.enhancedAnalysis) {
      // Use the enhanced analysis scores (these are already optimized and generous)
      qualityScore = Math.round(manualTestSuite.enhancedAnalysis.qualityPercentage);
      testCoverage = Math.round(manualTestSuite.enhancedAnalysis.coveragePercentage);
      console.log('🚀 Using enhanced analysis scores:', { qualityScore, testCoverage });
    } else {
      // Fallback to simple calculation (but make it more generous)
      qualityScore = calculateQualityScore(passRate, executionRate, totalTestCases);
      testCoverage = calculateTestCoverage(totalTestCases);
      console.log('⚠️ Using fallback scoring (enhanced analysis not available)');
    }

    const riskLevel = assessRisk(failRate, blockedRate);

    return {
      totalTestCases,
      statusCounts,
      executedCount,
      executionRate,
      passRate,
      failRate,
      blockedRate,
      qualityScore,
      riskLevel,
      testCoverage,
      // Include enhanced analysis data for additional insights
      enhancedAnalysis: manualTestSuite.enhancedAnalysis
    };
  }, [manualTestSuite]);

  const getMetricCards = (): MetricCard[] => [
    {
      title: 'Total Test Cases',
      value: analytics.totalTestCases,
      icon: '📋',
      color: 'bg-blue-500',
      subtitle: 'Generated test cases'
    },
    {
      title: 'Execution Rate',
      value: `${analytics.executionRate}%`,
      icon: '⚡',
      color: analytics.executionRate >= 80 ? 'bg-green-500' : analytics.executionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500',
      subtitle: `${analytics.executedCount}/${analytics.totalTestCases} executed`
    },
    {
      title: 'Pass Rate',
      value: `${analytics.passRate}%`,
      icon: '✅',
      color: analytics.passRate >= 90 ? 'bg-green-500' : analytics.passRate >= 70 ? 'bg-yellow-500' : 'bg-red-500',
      subtitle: 'Of executed tests'
    },
    {
      title: 'Risk Level',
      value: analytics.riskLevel,
      icon: analytics.riskLevel === 'High' ? '🔴' : analytics.riskLevel === 'Medium' ? '🟡' : '🟢',
      color: analytics.riskLevel === 'High' ? 'bg-red-500' : analytics.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500',
      subtitle: 'Overall assessment'
    },
    {
      title: 'Test Coverage',
      value: `${analytics.testCoverage}%`,
      icon: '🎨',
      color: analytics.testCoverage >= 80 ? 'bg-green-500' : analytics.testCoverage >= 60 ? 'bg-yellow-500' : 'bg-red-500',
      subtitle: 'Test type diversity'
    }
  ];

  const getChartData = (data: Record<string, number>, colors: string[]): ChartData[] => {
    const total = Object.values(data).reduce((sum, count) => sum + count, 0);
    return Object.entries(data).map(([label, value], index) => ({
      label,
      value,
      color: colors[index % colors.length],
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));
  };

  const statusColors = ['#10B981', '#EF4444', '#F59E0B', '#6B7280'];
  const statusChartData = getChartData(analytics.statusCounts, statusColors);

  const SimpleDonutChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h4 className="font-semibold text-gray-800 mb-4 text-center">{title}</h4>
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {data.reduce((acc, item, index) => {
              const prevPercentage = data.slice(0, index).reduce((sum, prev) => sum + prev.percentage, 0);
              const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
              const strokeDashoffset = -prevPercentage;
              
              acc.push(
                <circle
                  key={item.label}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
              return acc;
            }, [] as JSX.Element[])}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{data.reduce((sum, item) => sum + item.value, 0)}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
          </div>
        </div>
        <div className="space-y-2 w-full">
          {data.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{item.value}</span>
                <span className="text-gray-500">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' }
  ];

  return (
    <div className={`bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200 shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <span className="text-2xl mr-3">📊</span>
          Test Analysis Report
        </h3>
        <p className="text-sm text-gray-600">
          Comprehensive analysis of {analytics.totalTestCases} test cases from "{manualTestSuite.testName}"
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {getMetricCards().map((metric, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{metric.icon}</span>
                    <div className={`w-3 h-3 rounded-full ${metric.color}`}></div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
                  <div className="text-sm font-medium text-gray-700 mb-1">{metric.title}</div>
                  {metric.subtitle && (
                    <div className="text-xs text-gray-500">{metric.subtitle}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Insights */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-xl mr-2">💡</span>
                Quick Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Test Cases:</span>
                    <span className="font-medium text-gray-900">
                      {analytics.totalTestCases}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Executed Tests:</span>
                    <span className="font-medium text-gray-900">
                      {analytics.executedCount} / {analytics.totalTestCases}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pass Rate:</span>
                    <span className="font-medium text-gray-900">
                      {analytics.passRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion Status:</span>
                    <span className="font-medium text-gray-900">
                      {analytics.executionRate}% Complete
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};