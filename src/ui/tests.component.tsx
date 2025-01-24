import { highlight, languages } from "prismjs";
import React, { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";


export const TestLists = () =>{
    const [testCases, setTestCases] = useState([]);
    const [env, setEnv] = useState("Dev");

const [testStarted,setTestStarted] = useState<Record<string,boolean>>({})
useEffect(() => {
  window.ipcRender.invoke("getAllTestCases").then((data) => {
    setTestCases(data);
  });
}, []);

useEffect(()=>{
  window.ipcRender.on("testRunFailed",(data:{id:string}) => {
    setTestStarted({...testStarted,[data.id]:false})
  })
},[testStarted])
    return (
        <div className="p-5">
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400" width={100}>
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Name
                </th>
                <th scope="col" className="px-6 py-3" >
                  Test Cases
                </th>
                <th scope="col" className="px-6 py-3 w-50">
                  Select Browser
                </th>
                <th scope="col" className="px-6 py-3">
                  Run
                </th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((ele) => {
                return (
                  <tr className="hover:bg-gray-100 bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td className="px-6 py-4" width={20} >{ele.name}</td>
                    
                    <td className="px-6 py-4 " style={{width:"70%"}} >
                      <div className="h-[200px] overflow-scroll ">
                      <Editor
                      className=""
                          value={ele.test}
                          onValueChange={code => {}}
                          highlight={code => highlight(code, languages.js,'js')}
                          padding={10}
                          style={{
                            fontFamily: '"Fira code", "Fira Mono", monospace',
                            fontSize: 12,
                          }}
                          disabled={true}
                        />
                      </div>
                      
                      </td>
                    <td className="px-6 py-4" width={40}>
                      <select
                        id="Env"
                        value={env}
                        onChange={(e)=>{setEnv(e.target.value)}}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      >
                        <option selected>Choose a Env</option>
                        <option value={"Dev"}>Dev</option>
                        <option value={"Qa"}>Qa</option>
                        <option value={"Prod"}>Prod</option>

                      </select>
                    </td>
                    <td className="px-6 py-4" width={20}>
                      <button
                        type="button"
                        disabled={testStarted[ele._id]}
                        onClick={()=>{
                          setTestStarted({...testStarted,[ele._id]:true})
                          window.ipcRender.invoke('run-test',{test:ele.test,id:ele._id,env:env, preTestId: ele.preTestId}).then(data=>{
                            console.log(data)
                          })
                        
                        }}
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 disabled:bg-slate-400 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      >
                        Run
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </div>
    )
}