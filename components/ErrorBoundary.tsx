import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logError } from '../lib/errorMonitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logError(error, {
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Auto-recover from stale asset errors (HTML returned for JS or chunk load failures)
    const isStaleAssetError =
      error.message.includes("Unexpected token '<'") ||
      error.message.includes('ChunkLoadError') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module');

    if (isStaleAssetError) {
      const reloadKey = 'healqr_forced_reload_v2';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Allow retry if last reload was more than 10 seconds ago (previous attempt may have used stale cache)
      if (!lastReload || (now - parseInt(lastReload, 10)) > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        // Force a clean reload bypassing cache
        if ('caches' in window) {
          caches.keys().then(names => {
            Promise.all(names.map(name => caches.delete(name))).then(() => {
              window.location.href = '/' + '?v=' + now;
            });
          }).catch(() => {
            window.location.href = '/' + '?v=' + now;
          });
        } else {
          window.location.href = '/' + '?v=' + now;
        }
        return;
      }
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
          <div className="bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-8 border border-zinc-700">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-400 text-center mb-6">
              We're sorry for the inconvenience. The error has been logged and our team will look into it.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-zinc-900 rounded p-4 mb-6 border border-zinc-700">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="font-medium">Reload Page</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-3 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Go Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

