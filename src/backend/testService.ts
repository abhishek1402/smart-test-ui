import path from "path";
import DataBase from "./mongoClient";
import fs from "fs";
import { execSync } from "child_process";
import { BrowserWindow, ipcMain, utilityProcess } from "electron";
import { test } from "node:test";
import { ObjectId } from 'mongodb'

const extractLastGotoUrl = (testScript: string) => {
    const gotoRegex = /page\.goto\(['"]([^'"]+)['"]\)/g;
    const matches = [...testScript.matchAll(gotoRegex)];
    
    if (matches.length > 0) {
      return matches[matches.length - 1][1]; // Return the last match
    }
    
    return null;
  };


const currentDir = __dirname; //will be inside webpack

const rootDir = path.resolve(currentDir, '../../'); // More levels up as needed
const backendDir = path.resolve(currentDir, '../../src/backend'); // More levels up as needed

const DB = DataBase.GetDB()


const TEST_COLLECTION = DB.collection('TEST-CASES');

const replaceUrl = (test:string,env:string)=>{
    try{
        const urlOriginMap = {
            "Dev":"https://cleartax-dev-http.internal.cleartax.co",
            "Qa":"https://cleartax-qa-http.internal.cleartax.co",
            "Prod":"https://cleartax.in",
        }
        const regex = /page\.goto\((.*?)\);/s;
        const url = new URL(test.match(regex)[1].replace(/['"]+/g, ''))
        const newUrl = `${urlOriginMap[env as keyof typeof urlOriginMap]}${url.pathname}${url.search}`
        return test.replace(url.toString(),newUrl)
    }
    catch(e){
        return test
    }
}
class TestServies {
    static getAllTestCases = async ()=>{
        const testCases = await (await TEST_COLLECTION.find().toArray()).map(ele=>({...ele,_id:ele._id.toString()}))
    
        return testCases
    }

    static runTestCase = async ({testCase,mainWindow}:{testCase:{test:string,id:string, env:"Dev"|"Qa"|"Prod", preTestId: string},mainWindow:BrowserWindow})=>{
        if(testCase.preTestId) {
            try {
                const preTest = await TEST_COLLECTION.findOne({ _id: new ObjectId(testCase.preTestId) });
                console.log('inside pretest match found in', preTest);
                if(preTest){
                    const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'));
                    child.postMessage({testCase:preTest.test,type:"run"});
                    child.on("exit",()=>{
                        const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'));
                        child.postMessage({testCase:testCase.test,type:"run"});
                        child.on("exit",()=>{
                            mainWindow.webContents.send('testRunFailed',{id:testCase.id});
                        });
                    });
                }
                return;
            } catch (err) {
                console.error("Failed to convert preTestId to ObjectId: ", err);
                mainWindow.webContents.send('testRunFailed',{id:testCase.id});
                return;
            }
        }
        const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'));
        child.postMessage({testCase:testCase.test,type:"run"});
        child.on("exit",()=>{
            mainWindow.webContents.send('testRunFailed',{id:testCase.id});
        });
    }

    static recordTestCase = async ({mainWindow,testCase,name, preTestId}:{mainWindow:BrowserWindow,testCase:string,name:string, preTestId: string})=>{
        try {
            console.log("Record full TEST case preTestId", preTestId);
            const test = await TEST_COLLECTION.insertOne({test: testCase, name: name, preTestId: preTestId});
            return {success: true};
        } catch (e) {
            console.error("Error recording test case: ", e);
        }
    }

    static recordTestCaseOnLocal = async ({mainWindow, preTestId}:{mainWindow:BrowserWindow, preTestId: string})=>{
        try{
            console.log("REcorcd fullTEST local", preTestId);
            let startUrl: string | null = null;
            if(preTestId) {
               
                try {
                    const preTest = await TEST_COLLECTION.findOne({ _id: new ObjectId(preTestId) });
                    console.log('inside pretest match found in', preTest);
                    if(preTest){
                        startUrl = extractLastGotoUrl(preTest.test);
                        const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'));
                        child.postMessage({testCase:preTest.test,type:"run"});
                        child.on("exit",()=>{
                            const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'))
                            child.postMessage({type:"record", startUrl: startUrl });
                            
                            child.on("message",async (e)=>{
                                mainWindow.webContents.send('testRecoredOnLocal',{test:e});
                            })
                        });
                    }
                    return;
                } catch (err) {
                    console.error("Failed to convert preTestId to ObjectId: ", err);
                    mainWindow.webContents.send('testRunFailed',{id:preTestId});
                    return;
                }
            }
            const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'))
            child.postMessage({type:"record", startUrl: startUrl });
            
            child.on("message",async (e)=>{
                mainWindow.webContents.send('testRecoredOnLocal',{test:e});
            })
          
           
        }
        catch(e){
           
        }

    }

    
}



export default TestServies