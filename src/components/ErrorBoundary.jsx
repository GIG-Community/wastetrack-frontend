// src/components/ErrorBoundary.jsx
import React from 'react';
import ServerError from '../pages/ServerError';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error:", error);
        console.error("Error Info:", errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <ServerError />;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;