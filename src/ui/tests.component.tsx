import { highlight, languages } from 'prismjs';
import React, { useEffect, useState } from 'react';
import Editor from 'react-simple-code-editor';
import { TestComponent } from './test.component';
export const TestLists = () => {
  const [testCases, setTestCases] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>(['Desktop']);
  const [selectedBrowsers, setSelectedBrowsers] = useState<string[]>([
    'Chrome',
  ]);
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>(['Dev']);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(['USER']);
  const [testStarted, setTestStarted] = useState<Record<string, boolean>>({});
  useEffect(() => {
    window.ipcRender.invoke('getAllTestCases').then((data) => {
      setTestCases(data);
    });
  }, []);
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
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-900 uppercase bg-[#f8fbff] dark:bg-[#f8fbff] dark:text-gray-900">
            <tr>
              <th
                scope="col"
                className="w-[10%] px-6 py-3 border border-gray-500"
              >
                Name
              </th>
              <th
                scope="col"
                className="w-[40%] px-6 py-3 border border-gray-500"
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
                Run
              </th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((ele) => {
              return (
                <TestComponent
                  ele={ele}
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
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
