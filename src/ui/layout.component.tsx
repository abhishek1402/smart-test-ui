import { Outlet } from "react-router-dom"
import { NavBar } from "./navbar.component"
import React from "react";

export const Layout = () =>{
    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <NavBar/>
            <div className="flex-1 overflow-auto">
                <Outlet/>
            </div>
        </div>
    )
}