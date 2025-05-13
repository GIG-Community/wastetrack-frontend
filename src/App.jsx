import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorProvider } from './contexts/ErrorContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppRoutes from './routes/Routes';
import './App.css';

function App() {
  return (
    <Router>
      <ErrorProvider>
          <LanguageProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </LanguageProvider>
      </ErrorProvider>
    </Router>
  );
}

export default App;