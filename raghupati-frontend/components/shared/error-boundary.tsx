"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // Update state with error info
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full"
          >
            <div className="bg-[#0c0c14] border border-red-500/20 rounded-2xl p-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full">
                  <AlertTriangle className="size-12 text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-white text-center mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-zinc-400 text-center mb-6">
                An unexpected error occurred. We've logged the issue and will look into it.
              </p>

              {/* Error Details (Development Mode) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <p className="text-xs font-mono text-red-400 mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-[10px] text-zinc-600 overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="size-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-sm font-medium text-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="size-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-sm font-medium text-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="size-4" />
                  Go Home
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Made with Bob
