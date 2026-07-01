import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { ResumeProvider } from './context/ResumeContext';

import ErrorBoundary from './components/ErrorBoundary.jsx';

console.log('--- RESULENS BOOTSTRAP ---');

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <UserProvider>
                <ResumeProvider>
                    <ThemeProvider>
                        <App />
                    </ThemeProvider>
                </ResumeProvider>
            </UserProvider>
        </ErrorBoundary>
    </React.StrictMode>,
);

