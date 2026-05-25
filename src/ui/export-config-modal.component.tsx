import React, { useState, useEffect } from 'react';
import { ManualTestSuite } from '../backend/manualTestCaseService';
import { ExportConfig } from '../backend/advancedExportService';
import { ExportTemplate } from '../backend/exportConfigService';

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  manualTestSuite: ManualTestSuite | null;
  isExporting?: boolean;
}

export const ExportConfigModal: React.FC<ExportConfigModalProps> = ({
  isOpen,
  onClose,
  onExport,
  manualTestSuite,
  isExporting = false
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportConfig['format']>('csv');
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'standard' | 'detailed' | 'summary'>('standard');
  const [customFileName, setCustomFileName] = useState('');

  // These could be fetched from the backend via IPC if needed
  const exportTemplates: ExportTemplate[] = [
    {
      id: 'standard-csv',
      name: 'Standard CSV Report',
      description: 'Basic CSV export with all test case details',
      config: { format: 'csv', includeAnalytics: false, includeCharts: false, template: 'standard' }
    },
    {
      id: 'json-data',
      name: 'JSON Data Export',
      description: 'Raw data export in JSON format for integration',
      config: { format: 'json', includeAnalytics: true, includeCharts: false, template: 'standard' }
    }
  ];

  const formatOptions = {
    csv: {
      name: 'CSV (Comma Separated Values)',
      icon: '📊',
      description: 'Compatible with Excel and other spreadsheet applications',
      supportsCharts: false
    },
    json: {
      name: 'JSON (JavaScript Object Notation)',
      icon: '🔧',
      description: 'Ideal for data integration and API consumption',
      supportsCharts: false
    },
    excel: {
      name: 'Excel Workbook',
      icon: '📈',
      description: 'Microsoft Excel format with multiple worksheets',
      supportsCharts: true
    }
  };

  const testCaseCount = manualTestSuite?.manualTestCases?.length || 0;

  useEffect(() => {
    if (isOpen && manualTestSuite) {
      // Generate default filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const safeName = manualTestSuite.testName.replace(/[^a-zA-Z0-9]/g, '_');
      setCustomFileName(`${safeName}_${timestamp}`);
    }
  }, [isOpen, manualTestSuite]);

  

  const handleExport = () => {
    const config: ExportConfig = {
      format: selectedFormat,
      includeAnalytics,
      includeCharts: includeCharts && formatOptions[selectedFormat].supportsCharts,
      template: selectedTemplate,
      fileName: customFileName ? `${customFileName}.${selectedFormat}` : undefined
    };

    onExport(config);
  };

  const getEstimatedFileSize = () => {
    // This logic could be moved to a utility function
    const baseSize = testCaseCount * 0.5; // KB per test case
    const formatMultipliers: Record<string, number> = {
      csv: 1,
      json: 1.5,
      excel: 2.5
    };
    
    let multiplier = formatMultipliers[selectedFormat] || 1;
    if (includeAnalytics) multiplier += 0.5;
    if (includeCharts) multiplier += 1;

    const estimatedSizeKB = Math.round(baseSize * multiplier);
    return estimatedSizeKB > 1024
      ? `${(estimatedSizeKB / 1024).toFixed(1)} MB`
      : `${estimatedSizeKB} KB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Export Configuration</h2>
              <p className="text-sm text-gray-600">
                Configure export settings for {testCaseCount} test cases from "{manualTestSuite?.testName}"
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl font-bold leading-none hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Format Selection */}
              <div className="space-y-6">
                {/* Export Format */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">📁</span>
                    Export Format
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(formatOptions).map(([format, options]) => (
                      <label
                        key={format}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          selectedFormat === format
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="format"
                          value={format}
                          checked={selectedFormat === format}
                          onChange={(e) => setSelectedFormat(e.target.value as ExportConfig['format'])}
                          className="sr-only"
                        />
                        <span className="text-2xl mr-3">{options.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{options.name}</div>
                          <div className="text-sm text-gray-600">{options.description}</div>
                        </div>
                        {selectedFormat === format && (
                          <span className="text-blue-500 text-xl">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">🎨</span>
                    Report Template
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'standard', name: 'Standard', desc: 'Basic layout with essential information' }
                    ].map(template => (
                      <label
                        key={template.value}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedTemplate === template.value
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={template.value}
                          checked={selectedTemplate === template.value}
                          onChange={(e) => setSelectedTemplate(e.target.value as any)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-gray-600">{template.desc}</div>
                        </div>
                        {selectedTemplate === template.value && (
                          <span className="text-blue-500 text-xl">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Options */}
              <div className="space-y-6">
                {/* File Name */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">📝</span>
                    File Name
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="Enter custom file name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute right-3 top-3 text-gray-500 text-sm">
                      .{selectedFormat}
                    </div>
                  </div>
                </div>

                {/* Export Preview */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <span className="text-xl mr-2">👁️</span>
                    Export Preview
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Format:</span>
                      <span className="font-medium text-blue-900">{formatOptions[selectedFormat].name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Test Cases:</span>
                      <span className="font-medium text-blue-900">{testCaseCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Estimated Size:</span>
                      <span className="font-medium text-blue-900">{getEstimatedFileSize()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Ready to export {testCaseCount} test cases
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !manualTestSuite}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <span className="mr-2">📥</span>
                  Export Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};