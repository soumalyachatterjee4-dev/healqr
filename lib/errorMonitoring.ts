import * as Sentry from "@sentry/react";

export const initErrorMonitoring = () => {
  // Only initialize in production
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: "https://placeholder@sentry.io/placeholder", // Replace with your Sentry DSN
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% of transactions for performance
      
      // Session Replay - for debugging user issues
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Environment
      environment: import.meta.env.MODE,
      
      // Release tracking
      release: `healqr@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
      
      // Filter out sensitive data
      beforeSend(event, hint) {
        // Remove sensitive user data
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        
        // Filter out network errors from flaky connections
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message).toLowerCase();
          if (message.includes('network') || message.includes('fetch')) {
            return null; // Don't send network errors
          }
        }
        
        return event;
      },
      
      // Ignore common errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
      ],
    });
  }
};

// Log custom errors
export const logError = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error:', error, context);
  }
};

// Log custom messages
export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level);
  } else {
    console[level === 'warning' ? 'warn' : level](message);
  }
};

// Set user context for error tracking
export const setUserContext = (userId: string, role?: string) => {
  if (import.meta.env.PROD) {
    Sentry.setUser({
      id: userId,
      role: role,
    });
  }
};

// Clear user context on logout
export const clearUserContext = () => {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
};
