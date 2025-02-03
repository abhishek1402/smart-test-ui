import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export const NavBar = ({}) => {
  const activeClass =
    'rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white';
  const nonActiveClass =
    'rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white';
  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="flex flex-1">
            <div className="flex flex-shrink-0 items-center">
              <a
                href="#"
                className=" text-lg font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                ClearQA
              </a>
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                <NavLink
                  to={'tests'}
                  className={({ isActive }) =>
                    isActive ? activeClass : nonActiveClass
                  }
                >
                  Tests
                </NavLink>
                <NavLink
                  to={'record'}
                  className={({ isActive }) =>
                    isActive ? activeClass : nonActiveClass
                  }
                >
                  Record
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sm:hidden" id="mobile-menu">
        <div className="space-y-1 px-2 pb-3 pt-2">
          <a
            href="#"
            className="block rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
            aria-current="page"
          >
            Dashboard
          </a>
          <a
            href="#"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Team
          </a>
          <a
            href="#"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Projects
          </a>
          <a
            href="#"
            className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Calendar
          </a>
        </div>
      </div>
    </nav>
  );
};
