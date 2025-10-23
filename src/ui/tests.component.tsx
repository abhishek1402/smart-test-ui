import { highlight, languages } from 'prismjs';
import React, { useEffect, useState } from 'react';
import Editor from 'react-simple-code-editor';
import { TestComponent } from './test.component';
import { EditModal } from './edit-modal.component';
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
  const [editingTestCase, setEditingTestCase] = useState<{ name: string; test: string; _id: string; preTestId: string; runForIntegration?: boolean } | null>(null);
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

  const handleEdit = (testCase: { name: string; test: string; _id: string; preTestId: string; runForIntegration?: boolean }) => {
    setEditingTestCase(testCase);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingTestCase(null);
  };
  
  useEffect(() => {
    window.ipcRender.on('testRunFailed', (data: { id: string }) => {
      setTestStarted({ ...testStarted, [data.id]: false });
    });
  }, [testStarted]);
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
  return (
    <div className="p-5">
      {/* Add count display */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Test Cases</h2>
        <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-lg">
          Total: {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-900 uppercase bg-[#f8fbff] dark:bg-[#f8fbff] dark:text-gray-900">
            <tr>
              {/* Add Serial Number column */}
              <th
                scope="col"
                className="w-[5%] px-6 py-3 border border-gray-500"
              >
                Sl.No
              </th>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Name
              </th>
              <th
                scope="col"
                className="w-[25%] px-6 py-3 border border-gray-500"
              >
                Test Cases
              </th>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Device
              </th>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Browser
              </th>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Environment
              </th>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Users
              </th>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Integration
              </th>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((ele, index) => {
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
                />
              );
            })}
          </tbody>
        </table>
      </div>
      
      <EditModal
        isOpen={isEditModalOpen}
        testCase={editingTestCase}
        onClose={handleCloseModal}
        onSave={handleUpdate}
      />
    </div>
  );
};
