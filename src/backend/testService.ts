import path from "path";
import DataBase from "./mongoClient";
import fs from "fs";
import { execSync } from "child_process";
import { BrowserWindow, ipcMain, utilityProcess } from "electron";
import { test } from "node:test";


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

    static runTestCase = async ({testCase,mainWindow}:{testCase:{test:string,id:string,env:"Dev"|"Qa"|"Prod"},mainWindow:BrowserWindow})=>{
    


            const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'))

            child.postMessage({testCase:testCase.test,type:"run"})
           
            child.on("exit",()=>{
                mainWindow.webContents.send('testRunFailed',{id:testCase.id});
            })

     


    }

    static recordTestCase = async ({mainWindow,testCase,name}:{mainWindow:BrowserWindow,testCase:string,name:string})=>{
        try{
           console.log("REcorcd fullTEST cse")
            const test = await TEST_COLLECTION.insertOne({test:testCase,name:name})
            return {success:true}
           
        }
        catch(e){
           
        }


    }

    static recordTestCaseOnLocal = async ({mainWindow}:{mainWindow:BrowserWindow})=>{
        try{
            console.log("REcorcd fullTEST local")
            const child = utilityProcess.fork(path.join(__dirname, 'fork' + '.js'))
            child.postMessage({type:"record"})
            
            child.on("message",async (e)=>{
                mainWindow.webContents.send('testRecoredOnLocal',{test:e});
            })

           
        }
        catch(e){
           
        }


    }

    
}



export default TestServies