/**
 * Application Constants and Configuration
 * Centralized location for all hardcoded values and magic numbers
 */

export const SCORING_CONFIG = {
  // Coverage Analysis Weights
  COVERAGE_WEIGHTS: {
    functional: 1.5,
    dataValidation: 1.2,
    errorHandling: 1.0,
    security: 1.1,
    boundary: 0.8,
    uiInteraction: 1.0,
    performance: 0.7,
    accessibility: 0.6
  },

  // Quality Analysis Weights
  QUALITY_WEIGHTS: {
    clarity: 1.2,
    completeness: 1.3,
    traceability: 1.0,
    riskCoverage: 1.1,
    efficiency: 0.9,
    reliability: 1.0
  },

  // Base Scores (optimized for better results)
  BASE_SCORES: {
    functional: 70,
    dataValidation: 75,
    errorHandling: 80,
    security: 85,
    boundary: 85,
    uiInteraction: 90,
    performance: 90,
    accessibility: 95,
    clarity: 70,
    completeness: 75,
    traceability: 80,
    riskCoverage: 75,
    efficiency: 80,
    reliability: 85
  },

  // Score Multipliers
  SCORE_MULTIPLIERS: {
    hasFormInteraction: 15,
    hasValidation: 10,
    hasExpectedBehavior: 15,
    hasDetailedResults: 5,
    hasAuth: 10,
    hasBrowserSecurity: 5,
    hasDataInput: 10,
    hasInteraction: 5,
    hasUIElements: 5,
    hasPerformance: 10,
    hasAccessibility: 5
  },

  // Combined Score Weights
  COMBINED_WEIGHTS: {
    coverage: 0.4,
    quality: 0.6
  }
};

export const FILE_CONFIG = {
  // File size estimation (KB per test case)
  BASE_SIZE_PER_TEST_CASE: 0.5,
  
  // Format multipliers
  FORMAT_MULTIPLIERS: {
    csv: 1,
    json: 1.5,
    excel: 2.5
  },

  // Feature multipliers
  FEATURE_MULTIPLIERS: {
    analytics: 0.5,
    charts: 1.0
  },

  // File extensions
  EXTENSIONS: {
    csv: 'csv',
    json: 'json',
    excel: 'xlsx'
  }
};

export const TIME_CONFIG = {
  // Time estimation
  BASE_TIME_MINUTES: 5,
  TIME_PER_STEP_MINUTES: 2,
  
  // Time thresholds
  TIME_THRESHOLDS: {
    short: 10,
    medium: 20,
    long: 30,
    extended: 45,
    maximum: 60
  }
};

export const TEST_CASE_CONFIG = {
  // Test case ID format
  ID_FORMAT: {
    prefix: 'TC_',
    serialPadding: 3,
    counterPadding: 3
  },

  // Default values
  DEFAULTS: {
    status: 'Pending' as const,
    priority: 'Medium' as const,
    severity: 'Major' as const,
    type: 'Positive' as const,
    estimatedTime: '15 minutes'
  },

  // Prerequisites templates
  PREREQUISITES_TEMPLATES: {
    basic: [
      'Application should be accessible and functional',
      'User should have necessary permissions to perform the test'
    ],
    browser: [
      'Browser should be open and internet connection is available',
      'User should have valid credentials if login is required'
    ],
    form: [
      'Test data should be prepared and available',
      'All mandatory field requirements should be understood'
    ]
  }
};

export const EXPORT_CONFIG = {
  // Default templates
  DEFAULT_TEMPLATES: [
    {
      id: 'standard-csv',
      name: 'Standard CSV Report',
      description: 'Basic CSV export with all test case details',
      config: {
        format: 'csv' as const,
        includeAnalytics: false,
        includeCharts: false,
        template: 'standard' as const
      },
      isDefault: true
    },
    {
      id: 'json-data',
      name: 'JSON Data Export',
      description: 'Raw data export in JSON format for integration',
      config: {
        format: 'json' as const,
        includeAnalytics: true,
        includeCharts: false,
        template: 'standard' as const
      }
    },
    {
      id: 'excel-workbook',
      name: 'Excel Workbook',
      description: 'Excel-compatible format with multiple sheets',
      config: {
        format: 'excel' as const,
        includeAnalytics: true,
        includeCharts: false,
        template: 'detailed' as const
      }
    }
  ],

  // CSV Headers
  CSV_HEADERS: [
    'Test Case ID',
    'Test Description',
    'Title',
    'Test Steps',
    'Expected Result',
    'Status'
  ],

  // History limits
  HISTORY_LIMIT: 50,
  RECENT_EXPORTS_LIMIT: 10
};

export const VALIDATION_CONFIG = {
  // Supported formats
  SUPPORTED_FORMATS: ['csv', 'json', 'excel'],
  SUPPORTED_TEMPLATES: ['standard', 'detailed', 'summary'],
  
  // File name validation
  INVALID_FILENAME_CHARS: /[<>:"/\\|?*]/,
  
  // Limits
  MAX_TEST_CASES_WARNING: 1000,
  MAX_FILENAME_LENGTH: 255
};

export const GRADE_THRESHOLDS = {
  'A+': 95,
  'A': 90,
  'B+': 85,
  'B': 80,
  'C+': 75,
  'C': 70,
  'D': 60
};

export const RISK_THRESHOLDS = {
  HIGH: {
    failRate: 20,
    blockedRate: 15,
    criticalCount: 0
  },
  MEDIUM: {
    failRate: 10,
    blockedRate: 5,
    majorCount: 5
  }
};

export const RECOMMENDATION_THRESHOLDS = {
  executionRate: 80,
  passRate: 90,
  failRate: 15,
  blockedRate: 10,
  minHighPriorityTests: 2
};