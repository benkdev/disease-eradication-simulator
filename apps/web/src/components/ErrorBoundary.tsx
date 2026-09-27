import React, { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Production React Error Boundary
 * Catches unhandled runtime exceptions in component trees, logs them,
 * and renders a recovery UI rather than allowing the application to crash silently.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    // Ensure error is surfaced in the browser console for debugging
    console.error('Unhandled simulation error caught by ErrorBoundary:', error, errorInfo);
  }

  public resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
    });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;

      return (
        <div className="modal-overlay" role="alert" aria-live="assertive" data-testid="error-boundary-fallback">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            {/* Warning / Error Indicator Icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(194, 57, 95, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--bad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
              Simulation interrupted
            </h2>
            <p className="hint" style={{ marginBottom: 20, color: 'var(--muted)', fontSize: '0.88rem' }}>
              An unexpected error occurred during execution. You can attempt to restart the simulation or reload the application.
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <button
                className="primary"
                data-testid="error-boundary-reset-btn"
                onClick={this.resetErrorBoundary}
                style={{ width: '100%', fontWeight: 600 }}
              >
                Restart simulation
              </button>
              <button
                data-testid="error-boundary-reload-btn"
                onClick={this.handleReload}
                style={{ width: '100%', fontWeight: 500 }}
              >
                Reload application
              </button>
            </div>

            {/* Technical diagnostic details */}
            <details style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  padding: 0,
                  outline: 'none',
                }}
              >
                Technical details
              </summary>
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--bad)', marginBottom: 4 }}>
                  {error.name}: {error.message}
                </p>
                {error.stack && (
                  <pre
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--muted)',
                      background: 'var(--bg)',
                      padding: 8,
                      borderRadius: 6,
                      overflowX: 'auto',
                      maxHeight: 160,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
