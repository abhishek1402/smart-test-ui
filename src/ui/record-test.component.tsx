import { highlight, languages } from "prismjs";
import React, { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";

export const RecordTest = () => {
  const [testCases, setTestCases] = useState([]);
  const [testCase, setTestCase] = useState("");
  const [testName,setTestName] = useState("");
  const [preTestId,setPreTestId] = useState(null);
  const [isSaved,setIsSaved] = useState(false)

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    window.ipcRender.invoke("getAllTestCases").then((data) => {
      setTestCases(data);
    });
  }, []);

  useEffect(() => {
    window.ipcRender.on("testRecoredOnLocal", (data: { test: string }) => {
      setIsLoading(false);
      setTestCase(data.test);
    });
  }, []);

  return (
    <div className="p-5">
      <div className="flex-col justify-between">
        <p className="text-lg font-medium text-slate-600 ">
          You can start the recording session by filling the following details
        </p>

        <div className="my-5 flex items-center">
            <label  className="block text-sm  mb-1 text-slate-600 w-1/12">Test name</label>
            <input type="text" id="test_name" className="bg-gray-50 border w-1/3 border-gray-300 text-gray-900 text-sm rounded-lg  block  p-2.5 dark:bg-white dark:border-gray-600 dark:placeholder-gray-400 dark:text-slate-600 " placeholder="Tax summary" onChange={(e)=>{setTestName(e.target.value)}}  value={testName}/>
        </div>
        <div className="my-5 flex items-center">
            <label  className="block text-sm  mb-1 text-slate-600 w-1/12">Select Pretest</label>
            <select id="pretest" className="bg-gray-50 border w-1/3 border-gray-300 text-gray-900 text-sm rounded-lg  block  p-2.5 dark:bg-white dark:border-gray-600 dark:placeholder-gray-400 dark:text-slate-600 " onChange={(e)=>{setPreTestId(e.target.value.toString())}}  value={preTestId}>
             <option value={null}>No Pretest</option>
             {testCases?.map(item => (
                 <option value={item._id}>{item.name}</option>
             ))}
            </select>
        </div>
        <button
          className="bg-blue-500 px-8 py-2 text-white rounded-lg disabled:bg-slate-400 "
          disabled={isLoading || !testName }
          onClick={() => {
            setIsLoading(true);
            window.ipcRender.invoke("recordTestOnLocal", {preTestId: preTestId});
          }}
        >
          Start
        </button>
      </div>
      {
        testCase && !isSaved &&
      <div className="mt-12">
        
        <p className="text-base font-medium text-slate-600 border-t border-slate-200 pt-4 mb-4">
          Test Case Generated:
        </p>
        <div className="max-h-[500px] overflow-scroll  mb-4">
            <Editor
            className=""
            value={testCase}
            onValueChange={(code) => {
                setTestCase(code);
            }}
            highlight={(code) => highlight(code, languages.js, "js")}
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
            window.ipcRender.invoke("recordTest",{name:testName,testCase:testCase, preTestId: preTestId}).then(data=>{
                setTimeout(()=>{
                    setIsSaved(false)
                },5000)
                setIsSaved(true)
            })
          }}
        >
          Save
        </button>
          {
            isSaved && <p className="text-base font-medium text-green-600 my-4">
            Saved Succefully
          </p>
          }
        
      </div>
      }
    </div>
  );
};
