import { highlight, languages } from 'prismjs';
import React, { useEffect, useState } from 'react';
import Editor from 'react-simple-code-editor';

  export const enum MODES {
    DIY = 'DIY',
    AF = 'AF',
  };

  
export const RecordTest = () => {
  const [testCases, setTestCases] = useState([]);
  const [testCase, setTestCase] = useState('');
  const [testName, setTestName] = useState('');
  const [preTestId, setPreTestId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedOption, setSelectedOption] = useState(''); // DIY or AF
  const [stepsFormat, setStepsFormat] = useState(null); // Store the .steps format data

  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    window.ipcRender.invoke('getAllTestCases').then((data) => {
      setTestCases(data);
    });
  }, []);
  useEffect(() => {
    window.ipcRender.on('testRecoredOnLocal', (data: { test: string }) => {
      setIsLoading(false);
      // The data.test now contains the .steps format display string
      setTestCase(data.test);
      // We'll need to store the original format for conversion back to Playwright
      // For now, we'll handle this in the save process
    });
  }, []);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };


  return (
    <div className="p-5">
      <div className="flex-col justify-between">
        <p className="text-lg font-medium text-slate-600 ">
          You can start the recording session by filling the following details
        </p>
        
        {/* DIY and AF Options - Now at the top */}
        <div className="my-5">
          <label className="block text-sm mb-2 text-slate-600">
            Select Recording Mode
          </label>
          <div className="flex space-x-4">
            <button
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedOption === MODES.DIY
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => handleOptionSelect(MODES.DIY)}
            >
              DIY Mode
            </button>
            <button
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedOption === MODES.AF
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => handleOptionSelect(MODES.AF)}
            >
              AF Mode
            </button>
          </div>
        </div>

        {/* Show fields for both DIY and AF modes */}
        {(selectedOption === MODES.DIY || selectedOption === MODES.AF) && (
          <>
            <div className="my-5 flex items-center">
              <label className="block text-sm  mb-1 text-slate-600 w-1/12">
                Test name
              </label>
              <input
                type="text"
                id="test_name"
                className="bg-gray-50 border w-1/3 border-gray-300 text-gray-900 text-sm rounded-lg  block  p-2.5 dark:bg-white dark:border-gray-600 dark:placeholder-gray-400 dark:text-slate-600 "
                placeholder="Tax summary"
                onChange={(e) => {
                  setTestName(e.target.value);
                }}
                value={testName}
              />
            </div>
            <div className="my-5 flex items-center">
              <label className="block text-sm  mb-1 text-slate-600 w-1/12">
                Select Pretest
              </label>
              <select
                id="pretest"
                className="bg-gray-50 border w-1/3 border-gray-300 text-gray-900 text-sm rounded-lg  block  p-2.5 dark:bg-white dark:border-gray-600 dark:placeholder-gray-400 dark:text-slate-600 "
                onChange={(e) => {
                  setPreTestId(e.target.value.toString());
                }}
                value={preTestId}
              >
                <option value={null}>No Pretest</option>
                {testCases?.map((item) => (
                  <option value={item._id}>{item.name}</option>
                ))}
              </select>
            </div>
            <button
              className={`px-8 py-2 text-white rounded-lg disabled:bg-slate-400 mt-4 ${
                selectedOption === MODES.DIY ? 'bg-blue-500' : 'bg-green-500'
              }`}
              disabled={isLoading || !testName}
              onClick={() => {
                setIsLoading(true);
                window.ipcRender.invoke('recordTestOnLocal', {
                  preTestId: preTestId,
                  mode: selectedOption,
                });
              }}
            >
              Start ({selectedOption} Mode)
            </button>
          </>
        )}

      </div>
      {testCase && !isSaved && (
        <div className="mt-12">
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 mb-4">
            <p className="text-base font-medium text-slate-600">
              Test Case Generated (with test.step() wrappers):
            </p>
            <div className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
              Playwright with test.step()
            </div>
          </div>
          <div className="max-h-[500px] overflow-scroll mb-4">
            <Editor
              className=""
              value={testCase}
              onValueChange={(code) => {
                setTestCase(code);
              }}
              highlight={(code) => highlight(code, languages.js, 'js')}
              padding={10}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 12,
              }}
            />
          </div>
          <button
            className="bg-blue-500 px-8 py-2 text-white rounded-xl disabled:bg-slate-400"
            disabled={isLoading || isSaved}
            onClick={() => {
              setIsLoading(true);
              // Send the .steps format to be converted back to Playwright and saved
              window.ipcRender
                .invoke('recordTest', {
                  name: testName,
                  testCase: testCase, // This is the .steps format
                  preTestId: preTestId,
                  mode: selectedOption,
                  isStepsFormat: true, // Flag to indicate this is .steps format
                })
                .then((data) => {
                  setTimeout(() => {
                    setIsSaved(false);
                  }, 5000);
                  setIsSaved(true);
                });
            }}
          >
            Save (test.step Format)
          </button>
          {isSaved && (
            <p className="text-base font-medium text-green-600 my-4">
              Saved Succefully
            </p>
          )}
        </div>
      )}
    </div>
  );
};
