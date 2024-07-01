import React, { useEffect ,useState}  from 'react';
// import { ipcRenderer } from 'electron';
// const { ipcRenderer } = window.require('electron');

export const App = () =>{
    const [testCases,setTestCases] = useState([])
    useEffect(()=>{
        window.ipcRender.invoke('getAllTestCases').then(data=>{
            console.log("TENHHEN>>>");
            console.log(data)
            setTestCases(data)
        })

        // window.ipcRender.getAllTestCases((event:any,message:any)=>{
        //         console.log(">>>>>><MESSAGE>>>>",message)
        //         setTestCases(message)
        //     })

        // window.ipcRender.test123((event:any,message:any)=>{
        //     // console.log(">>>>>><MESSAGE>>>>",message)
        //     // setTestCases(message)
        // })
    },[])
    // useEffect(() => {
    //     ipcRenderer.on('getAllTestCases', () => {
    //         console.log(">>>>>message>>")
    //     //   console.log(countRef.current);
    //     //   countRef.current++;
    //     })
    //     return () => {
    //       ipcRenderer.removeAllListeners('ping');
    //     };
    //   }, []);
    // console.log("Message>>>",testCases)
    return(
        <>
        <table  style={{width:"100%"}}>
            <tr>
               
                <th style={{width:"20%"}}>
                    Name 
                </th>
                <th style={{width:"40%"}}>
                    Test Cases
                </th>
                <th style={{width:"20%"}}>
                    Select Browser
                </th>
                <th style={{width:"20%"}}>
                    Run
                </th>
            </tr>
        </table>
        {testCases.map(ele=>{
            return <tr>
            
                <td style={{width:"20%"}}>
                        {ele.name}
                </td>
                <td style={{width:"40%"}}>
                    {ele.test}
                </td>
                <td style={{width:"20%"}}> 
                    <select>
                        <option>Chrome</option>
                        <option>Edge</option>
                    </select>
                </td>
                <td style={{width:"20%"}}>
                    <button onClick={()=>{
                            window.ipcRender.invoke('run-test',ele.test).then(data=>{
                                console.log("TENHHEN>>>");
                                console.log(data)
                            })

                        }}>Run</button>
                </td>
            </tr>
           
        })}
        </>
    )

}

