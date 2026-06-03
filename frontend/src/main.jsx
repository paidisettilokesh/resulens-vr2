import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { ResumeProvider } from './context/ResumeContext';

console.log('--- RESULENS BOOTSTRAP ---');

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <UserProvider>
            <ResumeProvider>
                <ThemeProvider>
                    <App />
                </ThemeProvider>
            </ResumeProvider>
        </UserProvider>
    </React.StrictMode>,
);

