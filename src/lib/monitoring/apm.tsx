import * as Sentry from '@sentry/nextjs';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Initialize Sentry
export function initializeSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 0.1,
      integrations: [
        new Sentry.BrowserTracing({
          tracingOrigins: ['localhost', /^https:\/\/.*\.vercel\.app/, /^https:\/\/.*\.com/],
        }),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        return event;
      },
    });
  }
}

// Custom tracer for library operations
const tracer = trace.getTracer('library-estimate-integration', '1.0.0');

export function traceLibraryOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Performance metrics collection
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Send to monitoring service
    this.sendMetric(name, value);
  }

  private sendMetric(name: string, value: number) {
    // Send to your metrics collection service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name,
        value: Math.round(value),
        event_category: 'Performance',
      });
    }
    
    // Also send to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name}: ${value}ms`,
      level: 'info',
      data: { metric: name, value },
    });
  }

  getAverageMetric(name: string): number | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
}

// Error boundary wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error }>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <Sentry.ErrorBoundary
        fallback={fallback || DefaultErrorFallback}
        showDialog
      >
        <Component {...props} />
      </Sentry.ErrorBoundary>
    );
  };
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="error-boundary-fallback p-4 border border-red-300 bg-red-50 rounded">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <details className="mt-2 text-sm text-red-700" style={{ whiteSpace: 'pre-wrap' }}>
        {error.toString()}
      </details>
    </div>
  );
}