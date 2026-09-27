import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';

describe('ErrorBoundary component', () => {
  let consoleErrorMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error output during intentional error boundary testing
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it('renders children when no error occurs', () => {
    const html = renderToString(
      <ErrorBoundary>
        <div data-testid="child-content">Simulation Running Smoothly</div>
      </ErrorBoundary>,
    );

    expect(html).toContain('Simulation Running Smoothly');
    expect(html).not.toContain('Simulation interrupted');
  });

  it('correctly updates state via getDerivedStateFromError', () => {
    const sampleError = new Error('Canvas context lost');
    const newState = ErrorBoundary.getDerivedStateFromError(sampleError);

    expect(newState).toEqual({
      hasError: true,
      error: sampleError,
    });
  });

  it('renders the default recovery UI when state hasError is true', () => {
    const boundary = new ErrorBoundary({ children: <div>Normal</div> });
    boundary.state = {
      hasError: true,
      error: new Error('Canvas render failed: Out of memory'),
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('Simulation interrupted');
    expect(html).toContain('Restart simulation');
    expect(html).toContain('Reload application');
    expect(html).toContain('Canvas render failed: Out of memory');
    expect(html).toContain('data-testid="error-boundary-reset-btn"');
    expect(html).toContain('data-testid="error-boundary-reload-btn"');
  });

  it('supports custom fallback render prop function', () => {
    const boundary = new ErrorBoundary({
      children: <div>Normal</div>,
      fallback: ({ error, resetErrorBoundary }) => (
        <div data-testid="custom-error">
          Custom: {error.message}
          <button onClick={resetErrorBoundary}>Try Again</button>
        </div>
      ),
    });

    boundary.state = {
      hasError: true,
      error: new Error('Simulated failure'),
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('Simulated failure');
    expect(html).toContain('Custom:');
    expect(html).toContain('Try Again');
  });

  it('triggers onError and resets state on resetErrorBoundary', () => {
    const onReset = vi.fn();
    const onError = vi.fn();
    const boundary = new ErrorBoundary({
      children: <div>Normal</div>,
      onReset,
      onError,
    });

    const testError = new Error('Test error');
    const testErrorInfo = { componentStack: 'App > Canvas' } as React.ErrorInfo;

    // Simulate componentDidCatch
    boundary.componentDidCatch(testError, testErrorInfo);
    expect(onError).toHaveBeenCalledWith(testError, testErrorInfo);

    // Set error state
    boundary.state = {
      hasError: true,
      error: testError,
    };

    // Spy on setState
    const setStateSpy = vi.spyOn(boundary, 'setState');

    // Call resetErrorBoundary
    boundary.resetErrorBoundary();

    expect(onReset).toHaveBeenCalledOnce();
    expect(setStateSpy).toHaveBeenCalledWith({
      hasError: false,
      error: null,
    });
  });
});
