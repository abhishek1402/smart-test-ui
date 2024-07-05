

const path = require("path");
const fs = require("fs")
const {execSync} = require("child_process")

// import path from "path"
// import fs from "fs"
// import { execSync } from "child_process";
const currentDir = __dirname; //will be inside webpack
const rootDir = path.resolve(currentDir, '../../'); // More levels up as needed


process.parentPort.on('message', async (e) => {
    switch(e.data.type){
        case("run"):{
            const filePath = path.join(rootDir, 'test.spec.js');
            await fs.writeFileSync(filePath, e.data.testCase);
            try{
                const output = execSync('npx playwright test test.spec.js --headed',{stdio: 'inherit'});  
            }
            catch(e){
                process.exit()
            }
           
        
            process.exit()
         
        };
        break;
        
    
        
    case("record"):{
      
        try{
          
            console.log(">RECIRDstart>>>>>")
            const output = execSync('npx playwright codegen -o test.spec.js',{stdio: 'inherit'});  
            const filePath = path.join(rootDir, 'test.spec.js');
            const data = fs.readFileSync(filePath, 'utf8');
            console.log("recordFork.js",data)
            process.parentPort.postMessage(data)
        }
        catch(e){
            process.exit()
        }
        // const data = fs.readFileSync(filePath, 'utf8');
        // var bodyJson = JSON.stringify(data)
    
    //    await TEST_COLLECTION.insertOne({test:data});
    
        process.exit()
    }
    }
})