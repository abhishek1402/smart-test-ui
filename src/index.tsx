import { createRoot } from 'react-dom/client';
import React from 'react'
import { App } from './App';
import WindowContext from './windowsContext';
// useState()
// WindowContext
// window.ipcRender.getAllTestCases((event:any,message:any)=>{
//     console.log(">>>>>><MESSAGE>>>>",message)
// })
// let message:Array<string> = []
// window.ipcRender.getAllTestCases((event:any,message:any)=>{
//     console.log(">>>>>><MESSAGE>>>>",message)
//     message = message
// })
// window.ipcRender.getAllTestCases()
const root = createRoot(document.body);
root.render(<App/>);
