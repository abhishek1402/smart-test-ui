import { createRoot } from 'react-dom/client';
import React from 'react'
import { App } from './App';
import { BrowserRouter, HashRouter } from 'react-router-dom';

const root = createRoot(document.body);
root.render(<HashRouter><App/></HashRouter>);
