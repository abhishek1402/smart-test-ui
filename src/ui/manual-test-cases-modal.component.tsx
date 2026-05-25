import React, { useState, useEffect } from 'react';
import { ManualTestCase, ManualTestSuite } from '../backend/manualTestCaseService';
import { ExportConfigModal } from './export-config-modal.component';
import { AnalysisReport } from './analysis-report.component';
import { ExportConfig } from '../backend/advancedExportService';

interface ManualTestCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  automatedTestId: string;
  testName: string;
  serialNumber: number;
}

export const ManualTestCasesModal: React.FC<ManualTestCasesModalProps> = ({
  isOpen,
  onClose,
  automatedTestId,
  testName,
  serialNumber
}) => {
  const [manualTestSuite, setManualTestSuite] = useState<ManualTestSuite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    console.log('=== MODAL EFFECT: isOpen:', isOpen, 'automatedTestId:', automatedTestId, 'hasFetched:', hasFetched);
    if (isOpen && automatedTestId && !hasFetched && !loading) {
      console.log('=== MODAL EFFECT: About to fetch or generate manual test cases (ONCE)');
      setHasFetched(true);
      fetchOrGenerateManualTestCases();
    } else if (!isOpen) {
      // Reset flag when modal closes
      setHasFetched(false);
      setManualTestSuite(null);
      setError(null);
      setExportMessage(null);
    }
  }, [isOpen, automatedTestId]);

  // Listen for test execution results to auto-refresh manual test cases
  useEffect(() => {
    if (!isOpen || !automatedTestId) return;

    const handleTestSuccess = (...args: unknown[]) => {
      const data = args[0] as any;
      console.log('=== FRONTEND: TEST SUCCESS EVENT RECEIVED ===', data);
      console.log('=== FRONTEND: Current automated test ID:', automatedTestId);
      console.log('=== FRONTEND: Event test ID:', data?.id);
      if (data.id === automatedTestId) {
        console.log('=== FRONTEND: IDs match! Refreshing manual test cases after successful test execution');
        // Refresh manual test cases to show updated statuses
        fetchManualTestCases();
        setExportMessage('✅ Test passed! Manual test case statuses updated automatically.');
        setTimeout(() => setExportMessage(null), 5000);
      } else {
        console.log('=== FRONTEND: IDs do not match, ignoring event');
      }
    };

    const handleTestFailure = (...args: unknown[]) => {
      const data = args[0] as any;
      console.log('=== FRONTEND: TEST FAILURE EVENT RECEIVED ===', data);
      console.log('=== FRONTEND: Current automated test ID:', automatedTestId);
      console.log('=== FRONTEND: Event test ID:', data?.id);
      if (data.id === automatedTestId) {
        console.log('=== FRONTEND: IDs match! Refreshing manual test cases after failed test execution');
        // Refresh manual test cases to show updated statuses
        fetchManualTestCases();
        setExportMessage('❌ Test failed! Manual test case statuses updated automatically.');
        setTimeout(() => setExportMessage(null), 5000);
      } else {
        console.log('=== FRONTEND: IDs do not match, ignoring event');
      }
    };

    // Add event listeners
    window.ipcRender?.on('testRunSuccess', handleTestSuccess);
    window.ipcRender?.on('testRunFailed', handleTestFailure);

    // Note: Cleanup is handled automatically when the modal is closed/unmounted
  }, [isOpen, automatedTestId]);

  const fetchOrGenerateManualTestCases = async () => {
    console.log('🔍 fetchOrGenerateManualTestCases called for test ID:', automatedTestId);
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== MODAL: About to call getManualTestCases IPC with automatedTestId:', automatedTestId);
      console.log('=== MODAL: window.ipcRender available:', !!window.ipcRender);
      console.log('=== MODAL: invoke method available:', typeof window.ipcRender?.invoke);
      
      // First try to get existing manual test cases from database
      const result = await window.ipcRender.invoke('getManualTestCases', { automatedTestId, serialNumber });
      console.log('=== MODAL: getManualTestCases IPC result:', result);
      
      if (result && result.success && result.data && result.data.manualTestCases && result.data.manualTestCases.length > 0) {
        if (result.autoRegenerated) {
          console.log('🔄 MODAL: Test script changed - manual test cases automatically regenerated');
          setExportMessage('🔄 Test script was updated. Manual test cases have been automatically regenerated to match the new script.');
          setTimeout(() => setExportMessage(null), 8000);
        } else {
          console.log('✅ MODAL: Found existing manual test cases in database, loading them (NO API CALL)');
          console.log('✅ MODAL: Loaded', result.data.manualTestCases.length, 'test cases from cache');
        }
        setManualTestSuite(result.data);
      } else if (result && result.scriptChanged) {
        // Test script has changed but auto-regeneration failed
        console.log('⚠️ MODAL: Test script has changed, auto-regeneration failed');
        setManualTestSuite(null);
        setError(result.message || '⚠️ Test script has been updated. Please regenerate manual test cases to reflect the changes.');
      } else {
        // Only show generate button if no manual test cases exist
        console.log('ℹ️ MODAL: No manual test cases found in database, showing generate button (NO AUTO-GENERATION)');
        setManualTestSuite(null);
        setError(null); // Clear any error since this is expected for new tests
      }
    } catch (err) {
      console.error('=== MODAL ERROR: Error fetching manual test cases:', err);
      setError('Error communicating with backend: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchManualTestCases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.ipcRender.invoke('getManualTestCases', { automatedTestId });
      
      if (result && result.success) {
        setManualTestSuite(result.data);
      } else {
        setManualTestSuite(null);
      }
    } catch (err) {
      console.error('Error fetching manual test cases:', err);
      setError('Error fetching manual test cases: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const generateManualTestCases = async () => {
    console.log('🚀 generateManualTestCases called - User clicked Generate button');
    console.log('🚀 Test ID:', automatedTestId);
    console.log('🚀 Test Name:', testName);
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Calling generateManualTestCases IPC handler...');
      const result = await window.ipcRender.invoke('generateManualTestCases', {
        automatedTestId,
        testName,
        serialNumber
      });
      
      console.log('🚀 generateManualTestCases IPC result:', result);
      
      if (result && result.success) {
        console.log('✅ Manual test cases generated successfully, updating UI');
        setManualTestSuite(result.data);
      } else {
        console.error('❌ Failed to generate manual test cases:', result?.message);
        setError(result?.message || 'Failed to generate manual test cases');
      }
    } catch (err) {
      console.error('❌ Error generating manual test cases:', err);
      setError('Error generating manual test cases');
    } finally {
      setLoading(false);
    }
  };

  const updateTestCaseStatus = async (testCaseId: string, status: ManualTestCase['status']) => {
    try {
      const result = await window.ipcRender.invoke('updateManualTestCaseStatus', {
        automatedTestId,
        testCaseId,
        status
      });
      
      if (result && result.success) {
        // Update local state
        setManualTestSuite(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            manualTestCases: prev.manualTestCases.map(tc =>
              tc.testCaseId === testCaseId ? { ...tc, status } : tc
            )
          };
        });
      } else {
        alert(result?.message || 'Failed to update test case status');
      }
    } catch (err) {
      console.error('Error updating test case status:', err);
      alert('Error updating test case status');
    }
  };

  const handleExport = async (config: ExportConfig) => {
    setIsExporting(true);
    setExportMessage(null);
    
    try {
      const result = await window.ipcRender.invoke('advancedExportManualTestCases', {
        automatedTestId,
        config
      });
      
      if (result && result.success) {
        setExportMessage(`Export completed successfully! File saved to your selected location.`);
        setTimeout(() => setExportMessage(null), 5000);
      } else {
        setExportMessage(`Export failed: ${result?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error exporting manual test cases:', err);
      setExportMessage('Export failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };


  const handleResetStatuses = async () => {
    if (!confirm('Are you sure you want to reset all manual test case statuses to "Pending"? This will clear all current execution results.')) {
      return;
    }

    setIsResetting(true);
    setExportMessage(null);
    
    try {
      console.log('=== FRONTEND: Resetting manual test case statuses ===');
      const result = await window.ipcRender.invoke('resetManualTestCaseStatuses', {
        automatedTestId,
        resetReason: 'Manual reset from UI'
      });
      
      console.log('=== FRONTEND: Reset result:', result);
      
      if (result && result.success) {
        // Refresh manual test cases to show updated statuses
        await fetchManualTestCases();
        setExportMessage(`✅ Successfully reset ${result.resetCount || 0} manual test cases to "Pending" status.`);
        setTimeout(() => setExportMessage(null), 5000);
      } else {
        setExportMessage(`❌ Reset failed: ${result?.message || 'Unknown error'}`);
        setTimeout(() => setExportMessage(null), 5000);
      }
    } catch (err) {
      console.error('=== FRONTEND: Error resetting manual test case statuses:', err);
      setExportMessage('❌ Reset failed: ' + (err?.message || 'Unknown error'));
      setTimeout(() => setExportMessage(null), 5000);
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusColor = (status: ManualTestCase['status']) => {
    switch (status) {
      case 'Pass':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Fail':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Blocked':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Pending':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };


  console.log('=== MODAL RENDER: isOpen:', isOpen, 'automatedTestId:', automatedTestId);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-[96vw] w-full max-h-[96vh] overflow-hidden flex flex-col">
        {/* Enhanced Header */}
        <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Manual Test Cases</h2>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <span className="font-medium">Test Script: <span className="text-blue-600 font-semibold">{testName}</span></span>
                <span className="font-medium">Generated on: <span className="text-gray-800">{manualTestSuite ? new Date(manualTestSuite.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                }) : 'N/A'}</span></span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {manualTestSuite && (
                <>
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center ${
                      showAnalytics
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <span className="mr-2">📊</span>
                    {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-4xl font-bold leading-none hover:bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Export Message */}
        {exportMessage && (
          <div className={`mx-6 mt-4 p-4 rounded-lg border ${
            exportMessage.includes('successfully')
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <span className="text-xl mr-3">
                {exportMessage.includes('successfully') ? '✅' : '❌'}
              </span>
              <span className="font-medium">{exportMessage}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-auto flex-1 min-h-0">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
              <span className="ml-4 text-lg font-medium">Loading manual test cases...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6 mx-6">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {!loading && !manualTestSuite && !error && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-600 mb-6 text-lg">No manual test cases found for this automated test.</p>
              <button
                onClick={generateManualTestCases}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                Generate Manual Test Cases
              </button>
            </div>
          )}

          {!loading && manualTestSuite && (
            <div className="p-6 space-y-6">
              {/* Analytics Report */}
              {showAnalytics && (
                <AnalysisReport
                  manualTestSuite={manualTestSuite}
                  className="mb-6"
                />
              )}

              {/* Compact Statistics Header */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                {/* First Row - Execution Status */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-600 font-medium">Total:</span>
                      <span className="font-bold text-blue-600 ml-1 text-lg">{manualTestSuite.manualTestCases.length}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      <span className="text-gray-600 font-medium">Pass:</span>
                      <span className="font-bold text-green-600 ml-1">{manualTestSuite.manualTestCases.filter(tc => tc.status === 'Pass').length}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                      <span className="text-gray-600 font-medium">Fail:</span>
                      <span className="font-bold text-red-600 ml-1">{manualTestSuite.manualTestCases.filter(tc => tc.status === 'Fail').length}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                      <span className="text-gray-600 font-medium">Blocked:</span>
                      <span className="font-bold text-yellow-600 ml-1">{manualTestSuite.manualTestCases.filter(tc => tc.status === 'Blocked').length}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                      <span className="text-gray-600 font-medium">Pending:</span>
                      <span className="font-bold text-gray-600 ml-1">{manualTestSuite.manualTestCases.filter(tc => tc.status === 'Pending').length}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-blue-600 font-bold text-2xl">
                        {(() => {
                          const executed = manualTestSuite.manualTestCases.filter(tc => tc.status !== 'Pending').length;
                          const passed = manualTestSuite.manualTestCases.filter(tc => tc.status === 'Pass').length;
                          return executed > 0 ? Math.round((passed / executed) * 100) : 0;
                        })()}%
                      </div>
                      <div className="text-xs text-gray-600">Pass Rate</div>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-300">
                      Professional Quality
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Table */}
              <div className="overflow-x-auto border-2 border-gray-300 rounded-xl shadow-xl">
                <table className="w-full text-sm text-left bg-white">
                  <thead className="text-xs text-gray-900 uppercase bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-4 border-r-2 border-gray-300 font-bold text-center min-w-[120px]">Test Case ID</th>
                      <th className="px-4 py-4 border-r-2 border-gray-300 font-bold min-w-[200px]">Test Description</th>
                      <th className="px-4 py-4 border-r-2 border-gray-300 font-bold min-w-[180px]">Title</th>
                      <th className="px-4 py-4 border-r-2 border-gray-300 font-bold min-w-[200px]">Test Steps</th>
                      <th className="px-4 py-4 border-r-2 border-gray-300 font-bold min-w-[180px]">Expected Result</th>
                      <th className="px-4 py-4 font-bold text-center min-w-[120px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualTestSuite.manualTestCases.map((testCase, index) => (
                      <tr key={testCase.testCaseId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b-2 border-gray-200 hover:bg-blue-50 transition-colors duration-200`}>
                        <td className="px-4 py-4 border-r-2 border-gray-200 font-bold text-blue-700 text-center text-sm">
                          {testCase.testCaseId}
                        </td>
                        <td className="px-4 py-4 border-r-2 border-gray-200 text-sm">
                          <div className="max-h-24 overflow-y-auto font-medium text-gray-800">
                            {testCase.testDescription}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-r-2 border-gray-200 text-sm">
                          <div className="max-h-24 overflow-y-auto whitespace-pre-line text-gray-700">
                            {testCase.title}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-r-2 border-gray-200 text-sm">
                          <div className="whitespace-pre-line text-gray-700">
                            {testCase.testStep || 'No specific steps defined'}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-r-2 border-gray-200 text-sm">
                          <div className="whitespace-pre-line text-gray-700">
                            {testCase.expectedResult}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center">
                            <select
                              value={testCase.status}
                              onChange={(e) => updateTestCaseStatus(testCase.testCaseId, e.target.value as ManualTestCase['status'])}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(testCase.status)}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Pass">Pass</option>
                              <option value="Fail">Fail</option>
                              <option value="Blocked">Blocked</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Simplified Footer - Single Line Actions */}
        <div className="px-6 py-4 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex justify-between items-center">
            {/* Left Side - Simple Summary */}
            <div className="text-sm text-gray-600">
              {manualTestSuite && (
                <>
                  Showing {manualTestSuite.manualTestCases.length} manual test cases |
                  Executed: {manualTestSuite.manualTestCases.filter(tc => tc.status !== 'Pending').length} |
                  Professional Quality
                </>
              )}
            </div>
            
            {/* Right Side - Action Buttons in One Line */}
            <div className="flex space-x-3">
              {manualTestSuite && (
                <>
                  <button
                    onClick={handleResetStatuses}
                    disabled={isResetting}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center disabled:opacity-50"
                    title="Reset all test case statuses to 'Pending'"
                  >
                    <span className="mr-2">🔄</span>
                    {isResetting ? 'Resetting...' : 'Reset Statuses'}
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center"
                  >
                    <span className="mr-2">📥</span>
                    Advanced Export
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Export Configuration Modal */}
        <ExportConfigModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          manualTestSuite={manualTestSuite}
          isExporting={isExporting}
        />
      </div>
    </div>
  );
};