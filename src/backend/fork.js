const path = require("path");
const fs = require("fs")
const {execSync} = require("child_process")
// import path from "path"
// import fs from "fs"
// import { execSync } from "child_process";
const currentDir = __dirname; //will be inside webpack
const rootDir = path.resolve(currentDir, '../../'); // More levels up as needed

const extractLastGotoUrl = (testScript) => {
    const gotoRegex = /page\.goto\(['"]([^'"]+)['"]\)/g;
    const matches = [...testScript.matchAll(gotoRegex)];
    
    if (matches.length > 0) {
      return matches[matches.length - 1][1]; // Return the last match
    }
    
    return null;
  };


process.parentPort.on('message', async (e) => {
    switch(e.data.type){
        case("run"):{
            const filePath = path.join(rootDir, 'test.spec.js');
            await fs.writeFileSync(filePath, e.data.testCase);
             // Extract the last `goto` URL
            const data = fs.readFileSync(filePath, 'utf8');
            const lastGotoUrl = extractLastGotoUrl(data);
            
            console.log('Last goto URL:', lastGotoUrl); // Use this URL as needed
            try{
                const output = execSync(`npx playwright test test.spec.js --headed ${lastGotoUrl}`,{stdio: 'inherit'});  
            }
            catch(e){
                process.exit()
            }
           
        
            process.exit()
         
        }
        break;
        
    
        
    case("record"):{
        let startUrl;
        if (e.data.startUrl) {
          startUrl = e.data.startUrl;
        }
        console.log('record start url', startUrl)

        try{
          
            console.log(">RECIRDstart>>>>>")
            const output = execSync(`npx playwright codegen -o test.spec.js --load-storage=playwright/.auth/user.json ${startUrl}`);  
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