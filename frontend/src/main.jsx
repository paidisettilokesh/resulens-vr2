import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Typography: Load explicit font weights to prevent synthetic/blurry faux-bolding
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';

import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/outfit/900.css';

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

