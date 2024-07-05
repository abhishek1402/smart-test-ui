import React from "react";

import {  Route, Routes } from "react-router-dom";
import { Layout } from "./ui/layout.component";
import { TestLists } from "./ui/tests.component";
import { RecordTest } from "./ui/record-test.component";
export const App = () => {
  console.log(">>>>>Routeing>>>>")
  return (
    <>
     <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TestLists />} />
          <Route path="tests" element={<TestLists />} />
          <Route path="record" element={<RecordTest />} />
          {/* <Route render={() => <Redirect to="/"/>}/> */}
          {/* Using path="*"" means "match anything", so this route
                acts like a catch-all for URLs that we don't have explicit
                routes for. */}
          
          <Route path="*" element={<TestLists />} />
        </Route>
      </Routes>
   
   
    </>
  );
};