import { IpcRenderer, Shell } from "electron";

export {};

declare global {
    // const electron: typeof globals;
    const __APP_VERSION__: string;
    interface Window {
      electron: {
        store: {
          get: (key: string) => unknown;
          set: (key: string, val: unknown) => void;
          delete: (key: string) => void;
        };
       
        
      };
      // ipcRenderer: IpcRender;
      ipcRender:{
        getAllTestCases:(message:any)=>void,
        test123:(message:any)=>void
        invoke: (channel:string, args?:any) => Promise<any>,
        on: (channel: string, func: (...args: unknown[]) => void)=>void
      }
      shell: Shell;
    }
  }


  