import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handling to catch and log more details if possible
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global Error caught:', { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('Unhandled Promise Rejection:', event.reason);
};

createRoot(document.getElementById('root')!).render(
    <App />
);
