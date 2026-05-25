import { highlight, languages } from 'prismjs';
import React, { useEffect, useState } from 'react';
import Editor from 'react-simple-code-editor';
import { TestComponent } from './test.component';
import { EditModal } from './edit-modal.component';
import { filterTestCasesBySearch } from './utils/testFilters';
export const TestLists = () => {
  const [testCases, setTestCases] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>(['Desktop']);
  const [selectedBrowsers, setSelectedBrowsers] = useState<string[]>([
    'Chrome',
  ]);
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>(['Dev']);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(['USER']);
  const [testStarted, setTestStarted] = useState<Record<string, boolean>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<{ name: string; test: string; _id: string; preTestId: string; runForIntegration?: boolean, mode?: string, format?: string } | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<'QA' | 'DEV' | 'PROD'>('QA');
  const [pendingTestIds, setPendingTestIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    window.ipcRender.invoke('getAllTestCases').then((data) => {
      setTestCases(data);
    });
  }, []);
  
  const refreshTestCases = () => {
    window.ipcRender.invoke('getAllTestCases').then((data) => {
      setTestCases(data);
    });
  };
  
  const handleDelete = async (testId: string) => {
    try {
     window.ipcRender.invoke('deleteTestCase', { testId }).then(result=>{
        console.log(result)
        if (result && result.success) {
          // Refresh the test cases list after successful deletion
          refreshTestCases();
          alert('Test case deleted successfully');
        } else {
          const message = result?.message || 'Unknown error occurred';
          alert('Failed to delete test case: ' + message);
        }
      });
    } catch (error) {
      console.error('Error deleting test case:', error);
      alert('Error deleting test case: ' + error.message);
    }
  };

  const handleUpdate = async (testId: string, updatedData: { name?: string; test?: string; runForIntegration?: boolean }): Promise<void> => {
    try {
      const result = await window.ipcRender.invoke('updateTestCase', { testId, updatedData });
      if (!result) {
        throw new Error('No result returned from IPC handler');
      }
      
      if (result && result.success === true) {
        refreshTestCases();
        alert('Test case updated successfully!');
      } else {
        const message = result?.message || 'Failed to save test case';
        alert(message);
        throw new Error(message);
      }
    } catch (error) {
      console.error('Error updating test case:', error);
      alert('Error updating test case: ' + (error instanceof Error ? error.message : String(error)));
      throw error; 
    }
  };

  const handleEdit = (testCase: { name: string; test: string; _id: string; preTestId: string; runForIntegration?: boolean, mode?: string, format?: string }) => {
    setEditingTestCase(testCase);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingTestCase(null);
  };
  
  useEffect(() => {
    const cleanupTestRunFailed = window.ipcRender.on('testRunFailed', (data: { id: string }) => {
      setTestStarted((prev) => ({ ...prev, [data.id]: false }));
    });

    const cleanupSuccess = window.ipcRender.on('runAllTestsSuccess', (data: any) => {
      setIsRunningAll(false);
      alert(`Successfully ran ${data.totalTests} test cases!\n\nPassed: ${data.passedTests}\nFailed: ${data.failedTests}`);
    });

    const cleanupFailed = window.ipcRender.on('runAllTestsFailed', (data: any) => {
      setIsRunningAll(false);
      alert(`Test execution completed with failures\n\nTotal: ${data.totalTests}\nPassed: ${data.passedTests}\nFailed: ${data.failedTests}\n\nError: ${data.message}`);
    });

    return () => {
      cleanupTestRunFailed();
      cleanupSuccess();
      cleanupFailed();
    };
  }, []);
  const handleEnvChange = (env: string) => {
    setSelectedEnvs((prev) =>
      prev.includes(env) ? prev.filter((e) => e !== env) : [...prev, env]
    );
  };
  const handleUserChange = (env: string) => {
    setSelectedUsers((prev) =>
      prev.includes(env) ? prev.filter((e) => e !== env) : [...prev, env]
    );
  };
  const handleBrowserChange = (browser: string) => {
    setSelectedBrowsers((prev) =>
      prev.includes(browser)
        ? prev.filter((e) => e !== browser)
        : [...prev, browser]
    );
  };
  const handleDeviceChange = (device: string) => {
    setSelectedDevices((prev) =>
      prev.includes(device)
        ? prev.filter((e) => e !== device)
        : [...prev, device]
    );
  };

  // Handle checkbox selection for individual test cases
  const handleTestSelection = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    const filteredIds = filterTestCasesBySearch(testCases, searchTerm).map((tc: any) => tc._id);
    if (checked) {
      setSelectedTestIds(filteredIds);
    } else {
      setSelectedTestIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    }
  };

  const handleRunAll = async () => {
    let testIdsToRun: string[] = [];

    // Priority 1: Check if any checkboxes are selected
    if (selectedTestIds.length > 0) {
      testIdsToRun = selectedTestIds;
    } else {
      testIdsToRun = testCases
        .filter((tc: any) => tc.runForIntegration !== false)
        .map((tc: any) => tc._id);
    }

    if (testIdsToRun.length === 0) {
      alert('No test cases to run. Please select test cases or ensure integration tests are available.');
      return;
    }

    // Store test IDs and show environment selection modal
    setPendingTestIds(testIdsToRun);
    setShowEnvModal(true);
  };

  // Execute tests after environment selection
  const executeTests = async () => {
    const confirmMessage = selectedTestIds.length > 0
      ? `Run ${pendingTestIds.length} selected test case(s) on ${selectedEnvironment} environment?`
      : `Run ${pendingTestIds.length} integration test case(s) on ${selectedEnvironment} environment?`;

    if (!window.confirm(confirmMessage)) {
      setShowEnvModal(false);
      return;
    }

    setShowEnvModal(false);
    setIsRunningAll(true);

    try {
      const result = await window.ipcRender.invoke('runAllTests', {
        testCaseIds: pendingTestIds,
        projects: ['chrome-role1'], // Always use chrome-role1 for RUN ALL
        environment: selectedEnvironment, // Pass selected environment
      });

    } catch (error) {
      console.error('Error running all tests:', error);
      setIsRunningAll(false);
      alert('Error running tests: ' + error.message);
    }
  };

  // Filter test cases based on search term
  const filteredTestCases = filterTestCasesBySearch(testCases, searchTerm);

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header section - stays at top when scrolling */}
      <div className="sticky top-0 z-40 bg-white p-5 pb-3 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Test Cases</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search test cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-80"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              {!searchTerm && (
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  🔍
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunAll}
              disabled={isRunningAll}
              className={`text-white font-bold rounded-lg text-sm px-6 py-2.5 focus:ring-4 focus:outline-none ${
                isRunningAll
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 focus:ring-green-300'
              }`}
            >
              {isRunningAll ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running...
                </span>
              ) : (
                '▶ RUN ALL'
              )}
            </button>
            <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-lg">
              Total: {filteredTestCases.length} test case{filteredTestCases.length !== 1 ? 's' : ''}
            </div>
            {selectedTestIds.length > 0 && (
              <div className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-lg">
                Selected: {selectedTestIds.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content area - only test rows scroll */}
      <div className="flex-1 overflow-auto px-5 pb-5">
        <div className="relative">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-900 uppercase bg-[#f8fbff] dark:bg-[#f8fbff] dark:text-gray-900 sticky top-0 z-30">
            <tr>
              {/* Add Serial Number column with checkbox */}
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "80px" }}
              >
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedTestIds.length === filteredTestCases.length && filteredTestCases.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                    title="Select/Deselect All"
                  />
                  <span>Sl.No</span>
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "180px" }}
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ width: "420px", minWidth: "420px" }}
              >
                Test Cases
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "150px" }}
              >
                Manual Test Cases
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "120px" }}
              >
                Device
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "120px" }}
              >
                Browser
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "130px" }}
              >
                Environment
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "100px" }}
              >
                Users
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "110px" }}
              >
                Integration
              </th>
              <th
                scope="col"
                className="px-6 py-3 border border-gray-500"
                style={{ minWidth: "150px" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTestCases.map((ele, index) => {
              return (
                <TestComponent
                  key={ele._id}
                  ele={ele}
                  serialNumber={index + 1}
                  selectedDevices={selectedDevices}
                  handleDeviceChange={handleDeviceChange}
                  selectedBrowsers={selectedBrowsers}
                  handleBrowserChange={handleBrowserChange}
                  selectedEnvs={selectedEnvs}
                  handleEnvChange={handleEnvChange}
                  testStarted={testStarted}
                  setTestStarted={setTestStarted}
                  selectedUsers={selectedUsers}
                  handleUserChange={handleUserChange}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  isSelected={selectedTestIds.includes(ele._id)}
                  onSelect={handleTestSelection}
                />
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <EditModal
        isOpen={isEditModalOpen}
        testCase={editingTestCase}
        onClose={handleCloseModal}
        onSave={handleUpdate}
      />

      {/* Environment Selection Modal */}
      {showEnvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Select Environment</h3>
            <p className="text-gray-600 mb-6">
              Choose the environment to run {pendingTestIds.length} test case{pendingTestIds.length !== 1 ? 's' : ''}:
            </p>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: selectedEnvironment === 'QA' ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="environment"
                  value="QA"
                  checked={selectedEnvironment === 'QA'}
                  onChange={(e) => setSelectedEnvironment('QA')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">QA Environment</div>
                  <div className="text-sm text-gray-500">cleartax-qa-http.internal.cleartax.co</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: selectedEnvironment === 'DEV' ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="environment"
                  value="DEV"
                  checked={selectedEnvironment === 'DEV'}
                  onChange={(e) => setSelectedEnvironment('DEV')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">DEV Environment</div>
                  <div className="text-sm text-gray-500">cleartax-dev-http.internal.cleartax.co</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: selectedEnvironment === 'PROD' ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="environment"
                  value="PROD"
                  checked={selectedEnvironment === 'PROD'}
                  onChange={(e) => setSelectedEnvironment('PROD')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">PROD Environment</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>cleartax.in</span>
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded">⚠️ Live</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEnvModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeTests}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-800 transition-colors"
              >
                Run Tests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
