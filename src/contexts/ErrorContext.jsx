// src/contexts/ErrorContext.jsx
import React, { createContext, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ErrorContext = createContext(null);

export const useError = () => useContext(ErrorContext);

export const ErrorProvider = ({ children }) => {
    const navigate = useNavigate();

    // Function untuk menangani error secara global
    const handleGlobalError = useCallback((error) => {
        console.error('Global error:', error);

        // Log error ke service monitoring jika ada
        // logErrorToService(error);

        // Tentukan jenis error dan redirect ke halaman error yang sesuai
        if (error.message && (
            error.message.includes('permission') ||
            error.message.includes('forbidden') ||
            error.message.includes('denied') ||
            error.code === 'permission-denied'
        )) {
            // Forbidden error
            navigate('/403', { replace: true });
            return;
        }

        // Server error
        navigate('/500', { replace: true });
    }, [navigate]);

    // Patch window.onerror untuk menangkap global JS errors
    React.useEffect(() => {
        const originalOnError = window.onerror;

        window.onerror = (message, source, lineno, colno, error) => {
            console.error('Global JS error:', { message, source, lineno, colno, error });

            // Handle via global error handler
            if (error) {
                handleGlobalError(error);
            }

            // Call original handler if exists
            if (originalOnError) {
                return originalOnError(message, source, lineno, colno, error);
            }

            return false;
        };

        return () => {
            window.onerror = originalOnError;
        };
    }, [handleGlobalError]);

    // Patch unhandled promise rejections
    React.useEffect(() => {
        const unhandledRejectionHandler = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            handleGlobalError(event.reason);
        };

        window.addEventListener('unhandledrejection', unhandledRejectionHandler);

        return () => {
            window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
        };
    }, [handleGlobalError]);

    // Expose the handler to components if needed
    const contextValue = {
        handleError: handleGlobalError
    };

    return (
        <ErrorContext.Provider value={contextValue}>
            {children}
        </ErrorContext.Provider>
    );
};