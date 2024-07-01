// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { IpcRendererEvent, contextBridge, ipcRenderer } from "electron";

const ipc = {
    'render': {
        // // From render to main.
        // 'send': [],
        // // From main to render.
        // 'receive': [
        //     'config:data'
        // ],
        // From render to main and back again.
        'sendReceive': [
          'recordTest',
          'getAllTestCases',
          "run-test"

        ]
    }
};


export type Channels = 'ipc-example';



contextBridge.exposeInMainWorld(
    // Allowed 'ipcRenderer' methods.
    'ipcRender', {
        // From render to main.
        sendMessage(channel: Channels, ...args: unknown[]) {
          ipcRenderer.send(channel, ...args);
        },
        on(channel: Channels, func: (...args: unknown[]) => void) {
          const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
            func(...args);
          ipcRenderer.on(channel, subscription);
    
          return () => {
            ipcRenderer.removeListener(channel, subscription);
          };
        },
        // once(channel: Channels, func: (...args: unknown[]) => void) {
        //   ipcRenderer.once(channel, (_event, ...args) => func(...args));
        // },
        // // From render to main and back again.
        invoke: (channel:string, arg:any) => {
          // console.log(">>>>>>>>Preloadkjs invoke ",channel)
          let validChannels = ipc.render.sendReceive;
          if (validChannels.includes(channel)) {
              // console.log(">>>>>>Chaneels11>>>",channel,arg,validChannels)
                return ipcRenderer.invoke(channel, arg);
            }
        },
  
        // getAllTestCases: (message:any) => {
        //   // console.log("preloadJS>>>>>",message)
        //   ipcRenderer.on('getAllTestCases', message);
        // },
        // test123:(message:any)=>{
        //   // console.log("preloadJS>>>>>",message)
        //   ipcRenderer.on('test123', message);
        // }
        
    }
  );