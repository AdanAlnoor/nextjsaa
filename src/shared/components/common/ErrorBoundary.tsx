import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError } from '@/analytics/utils/analytics';
import { Button } from '@/shared/components/ui/button';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Track the error in analytics
    trackError(error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, render the default error UI
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-red-200 bg-red-50 text-red-700 my-4">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
          <h2 className="text-lg font-semibold mb-2">
            {this.props.componentName ? `Error in ${this.props.componentName}` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-center mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
          </p>
          <Button
            variant="outline"
            onClick={this.handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
} 