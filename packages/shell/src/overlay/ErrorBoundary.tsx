import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional override for the fallback UI. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches uncaught render errors so a single broken subtree doesn't blank the
 * whole app. Console-only by default; pass `fallback` to customise the UI.
 * Class component because React's error-boundary API only works on classes.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-8">
        <div className="max-w-[480px] border border-error/40 bg-surface-raised p-5">
          <h2 className="mb-2 text-lg font-semibold uppercase tracking-wide text-error">
            Something broke
          </h2>
          <p className="mb-3 text-base text-fg-mid">
            The page hit an unhandled error. The app state is intact — try again, or reload if the
            problem persists.
          </p>
          <details className="mb-4">
            <summary className="cursor-pointer text-base text-fg-mid hover:text-fg">Details</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words border border-border bg-surface-sunken p-2 text-base text-fg-mid">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 text-base text-fg-mid hover:text-fg"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="border border-accent/40 bg-accent/15 px-5 py-1.5 text-base uppercase tracking-wide text-accent hover:bg-accent/25"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
