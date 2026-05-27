import { Component, type ReactNode, type ErrorInfo } from 'react';
import { debugLogger } from '../utils/DebugLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    debugLogger.error(0, 'SYSTEM', `React render error: ${error.message}`, {
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 24,
          color: 'var(--text-primary)',
          background: 'var(--bg-primary)',
          textAlign: 'center',
          gap: 16,
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400 }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={this.handleReset}
            >
              Try Again
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
