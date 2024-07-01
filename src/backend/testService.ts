import path from "path";
import DataBase from "./mongoClient";
import fs from "fs";
import { execSync } from "child_process";
// const DataBase = require("./mongoClient")
// DataBase
const currentDir = __dirname; //will be inside webpack

const rootDir = path.resolve(currentDir, '../../'); // More levels up as needed

const DB = DataBase.GetDB()


const TEST_COLLECTION = DB.collection('TEST-CASES');

class TestServies {
    static getAllTestCases = async ()=>{
        const testCases = await TEST_COLLECTION.find().toArray();
        return testCases
    }

    static runTestCase = async (testCase:string)=>{
        try{
            const filePath = path.join(rootDir, 'test.spec.js');
            console.log("filePath",filePath)
            await fs.writeFileSync(filePath, testCase);
    
            const output = execSync('npm run run-test',{stdio: 'inherit'});  
    
            console.log('Output was:\n', output);
            return {success:true}
        }
        catch(e){
            console.log(">>>EEEE>>>",e)
        }

        // const testCases = await TEST_COLLECTION.find().toArray();
        // return testCases
    }

    
}



export default TestServies