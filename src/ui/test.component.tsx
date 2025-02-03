import React from 'react';
import { highlight, languages } from 'prismjs';
import Editor from 'react-simple-code-editor';

interface TestComponentProps {
  ele: { name: string; test: string; _id: string; preTestId: string };
  selectedDevices: string[];
  handleDeviceChange: (device: string) => void;
  selectedBrowsers: string[];
  handleBrowserChange: (browser: string) => void;
  selectedEnvs: string[];
  handleEnvChange: (env: string) => void;
  setTestStarted: (testStarted: { [key: string]: boolean }) => void;
  testStarted: { [key: string]: boolean };
  selectedUsers: string[];
  handleUserChange: (user: string) => void;
}

const createProjectArray = (selectedUsers: string[]) => {
  const projects: string[] = [];
  if (selectedUsers.includes('USER')) {
    projects.push('chrome-role1');
    projects.push('firefox-role1');
  }
  if (selectedUsers.includes('RM')) {
    projects.push('chrome-role2');
    projects.push('firefox-role2');
  }
  if (selectedUsers.includes('SP')) {
    projects.push('chrome-role3');
    projects.push('firefox-role3');
  }
  return projects;
};

export const TestComponent: React.FC<TestComponentProps> = ({
  ele,
  selectedDevices,
  handleDeviceChange,
  selectedBrowsers,
  handleBrowserChange,
  selectedEnvs,
  handleEnvChange,
  setTestStarted,
  testStarted,
  selectedUsers,
  handleUserChange,
}) => {
  return (
    <tr className="hover:bg-gray-300 hover:text-gray-900 hover:border-gray-900 bg-white border-b dark:bg-gray-800">
      <td className="w-[10%] px-6 py-4 border border-gray-500 uppercase font-bold">
        {ele.name}
      </td>

      <td className="w-[40%] px-6 py-4 border border-gray-500">
        <div className="h-[200px] overflow-y-auto sm:max-w-[380px] md:max-w-[510px] lg:max-w-[550px] xl:max-w-[650px] 2xl:max-w-[800px]">
          <Editor
            className=""
            value={ele.test}
            onValueChange={(code) => {}}
            highlight={(code) => highlight(code, languages.js, 'js')}
            padding={10}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 12,
            }}
            disabled={true}
          />
        </div>
      </td>
      <td className="w-[10%] px-6 py-4 border border-gray-500">
        <div className="flex flex-col">
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Desktop"
              checked={selectedDevices.includes('Desktop')}
              onChange={() => handleDeviceChange('Desktop')}
              className="mr-2"
            />
            Desktop
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Tablet"
              checked={selectedDevices.includes('Tablet')}
              onChange={() => handleDeviceChange('Tablet')}
              className="mr-2"
            />
            Tablet
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Mobile"
              checked={selectedDevices.includes('Mobile')}
              onChange={() => handleDeviceChange('Mobile')}
              className="mr-2"
            />
            Mobile
          </label>
        </div>
      </td>
      <td className="w-[10%] px-6 py-4 border border-gray-500">
        <div className="flex flex-col">
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Chrome"
              checked={selectedBrowsers.includes('Chrome')}
              onChange={() => handleBrowserChange('Chrome')}
              className="mr-2"
              name="browser"
            />
            Chrome
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Firefox"
              checked={selectedBrowsers.includes('Firefox')}
              onChange={() => handleBrowserChange('Firefox')}
              className="mr-2"
              name="browser"
            />
            Firefox
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Edge"
              checked={selectedBrowsers.includes('Edge')}
              onChange={() => handleBrowserChange('Edge')}
              className="mr-2"
              name="browser"
            />
            Edge
          </label>
        </div>
      </td>
      <td className="w-[10%] px-6 py-4 border border-gray-500">
        <div className="flex flex-col">
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Dev"
              checked={selectedEnvs.includes('Dev')}
              onChange={() => handleEnvChange('Dev')}
              className="mr-2"
              name="env"
            />
            Dev
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Qa"
              checked={selectedEnvs.includes('Qa')}
              onChange={() => handleEnvChange('Qa')}
              className="mr-2"
              name="env"
            />
            Qa
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="Prod"
              checked={selectedEnvs.includes('Prod')}
              onChange={() => handleEnvChange('Prod')}
              className="mr-2"
              name="env"
            />
            Prod
          </label>
        </div>
      </td>
      <td className="w-[10%] px-6 py-4 border border-gray-500">
        <div className="flex flex-col">
          <label className="flex items-center">
            <input
              type="checkbox"
              value="USER"
              checked={selectedUsers.includes('USER')}
              onChange={() => handleUserChange('USER')}
              className="mr-2"
              name="env"
            />
            User
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="RM"
              checked={selectedUsers.includes('RM')}
              onChange={() => handleUserChange('RM')}
              className="mr-2"
              name="env"
            />
            RM
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              value="SP"
              checked={selectedUsers.includes('SP')}
              onChange={() => handleUserChange('SP')}
              className="mr-2"
              name="env"
            />
            SP
          </label>
        </div>
      </td>
      <td className="w-[10%] px-2 py-4 border border-gray-500 2xl:px-6">
        <button
          type="button"
          disabled={testStarted[ele._id]}
          onClick={() => {
            setTestStarted({ ...testStarted, [ele._id]: true });
            window.ipcRender
              .invoke('run-test', {
                test: ele.test,
                id: ele._id,
                env: selectedEnvs.join(','),
                preTestId: ele.preTestId,
                projects: createProjectArray(selectedUsers),
              })
              .then((data) => {
                console.log(data);
              });
          }}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 disabled:bg-slate-400 focus:ring-blue-300 font-medium rounded-lg text-sm w-[80%] px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
          Run
        </button>
      </td>
    </tr>
  );
};
