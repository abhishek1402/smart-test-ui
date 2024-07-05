import { Outlet } from "react-router-dom"
import { NavBar } from "./navbar.component"
import React from "react";

export const Layout = () =>{
    return (<>
        <NavBar/>
        <Outlet/>
    </>)
}