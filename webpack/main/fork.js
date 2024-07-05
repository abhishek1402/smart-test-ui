

const path = require("path");
const fs = require("fs")
const {execSync} = require("child_process")

// import path from "path"
// import fs from "fs"
// import { execSync } from "child_process";
const currentDir = __dirname; //will be inside webpack
console.log("TESTFORMDSAF>>>DSAFDS")
const rootDir = path.resolve(currentDir, '../../'); // More levels up as needed


    process.parentPort.on('message', async (e) => {
    
    
        const filePath = path.join(__dirname, 'test.spec.js');
        await fs.writeFileSync(filePath, e.data.testCase);
        try{
            const output = execSync('npm run run-test',{stdio: 'inherit'});  
            console.log("<<<>>>tyr>>>>",output)
        }
        catch(e){
            console.log(">>>>>ERRor>>>>",e)
            process.exit()
        }
        // const data = fs.readFileSync(filePath, 'utf8');
        // var bodyJson = JSON.stringify(data)
    
    //    await TEST_COLLECTION.insertOne({test:data});
    
        process.exit()
  