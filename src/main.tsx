import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { NavigationGuardProvider } from './app/ui/NavigationGuard';
import { App } from './app/App';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './shared/queryClient';
import './assets/fonts/fonts.css';
import './app/design-tokens.css';
import './app/app.css';
import './app/ui.css';
import './app/finmate-theme.css';

document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark');

const router=createBrowserRouter([{path:'*',element:<NavigationGuardProvider><App/></NavigationGuardProvider>}]);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><RouterProvider router={router}/></QueryClientProvider></React.StrictMode>
);
