import { Logger } from '../utils/logger';

const logger = Logger.create('ErrorBoundary');

export interface ErrorDetails {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: Error | unknown;
  timestamp: string;
}

/**
 * Global Error Boundary & Crash Recovery Handler
 */
export class ErrorBoundary {
  private static instance: ErrorBoundary | null = null;
  private hasFatalError: boolean = false;
  private errorContainer: HTMLElement | null = null;

  private constructor() {
    this.registerGlobalHandlers();
  }

  public static initialize(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary();
    }
    return ErrorBoundary.instance;
  }

  public static getInstance(): ErrorBoundary {
    return ErrorBoundary.instance ?? ErrorBoundary.initialize();
  }

  private registerGlobalHandlers(): void {
    window.addEventListener('error', (event: ErrorEvent) => {
      this.handleError({
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.handleError({
        message: `Unhandled Promise Rejection: ${String(event.reason?.message || event.reason)}`,
        error: event.reason,
        timestamp: new Date().toISOString()
      });
    });

    logger.info('Global ErrorBoundary initialized');
  }

  public handleError(details: ErrorDetails, isFatal: boolean = false): void {
    logger.error(`Captured error: ${details.message}`, details.error, {
      source: details.source,
      line: details.lineno,
      column: details.colno
    });

    if (isFatal && !this.hasFatalError) {
      this.hasFatalError = true;
      this.showCrashUI(details);
    }
  }

  /**
   * Safe execution wrapper
   */
  public static tryExecute<T>(fn: () => T, fallback: T, isFatal: boolean = false): T {
    try {
      return fn();
    } catch (err) {
      ErrorBoundary.getInstance().handleError(
        {
          message: err instanceof Error ? err.message : String(err),
          error: err,
          timestamp: new Date().toISOString()
        },
        isFatal
      );
      return fallback;
    }
  }

  /**
   * Safe async execution wrapper
   */
  public static async tryExecuteAsync<T>(
    fn: () => Promise<T>,
    fallback: T,
    isFatal: boolean = false
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      ErrorBoundary.getInstance().handleError(
        {
          message: err instanceof Error ? err.message : String(err),
          error: err,
          timestamp: new Date().toISOString()
        },
        isFatal
      );
      return fallback;
    }
  }

  private showCrashUI(details: ErrorDetails): void {
    if (this.errorContainer || typeof document === 'undefined') return;

    this.errorContainer = document.createElement('div');
    this.errorContainer.id = 'aetheria-error-boundary';
    this.errorContainer.innerHTML = `
      <div class="error-boundary-backdrop">
        <div class="error-boundary-modal">
          <div class="error-boundary-header">
            <span class="error-boundary-icon">⚠️</span>
            <h2>AETHERIA Core Exception Caught</h2>
          </div>
          <p class="error-boundary-desc">
            A fatal simulation or WebGL error occurred. The system safely intercepted this error to prevent an unhandled browser crash.
          </p>
          <div class="error-boundary-details">
            <div class="error-message"><strong>Error:</strong> ${this.escapeHtml(details.message)}</div>
            ${details.source ? `<div class="error-source"><strong>Source:</strong> ${this.escapeHtml(details.source)}:${details.lineno}:${details.colno}</div>` : ''}
            ${details.error instanceof Error && details.error.stack ? `<pre class="error-stack">${this.escapeHtml(details.error.stack)}</pre>` : ''}
          </div>
          <div class="error-boundary-actions">
            <button id="btn-err-reload" class="error-action-btn primary">🔄 Reload Simulation</button>
            <button id="btn-err-reset" class="error-action-btn secondary">🧹 Clear Cache & Reset</button>
            <button id="btn-err-copy" class="error-action-btn tertiary">📋 Copy Diagnostics</button>
          </div>
        </div>
      </div>
    `;

    this.injectStyles();
    document.body.appendChild(this.errorContainer);

    // Event listeners
    document.getElementById('btn-err-reload')?.addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('btn-err-reset')?.addEventListener('click', () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    });

    document.getElementById('btn-err-copy')?.addEventListener('click', () => {
      const logs = Logger.getHistory();
      const report = JSON.stringify({ error: details, logs }, null, 2);
      navigator.clipboard.writeText(report).then(() => {
        alert('Diagnostics report copied to clipboard.');
      });
    });
  }

  private injectStyles(): void {
    const styleId = 'error-boundary-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #aetheria-error-boundary {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(4, 7, 18, 0.85);
        backdrop-filter: blur(20px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e2e8f0;
      }
      .error-boundary-backdrop {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      }
      .error-boundary-modal {
        max-width: 600px;
        width: 100%;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(239, 68, 68, 0.15);
      }
      .error-boundary-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .error-boundary-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #f87171;
        font-weight: 600;
      }
      .error-boundary-icon {
        font-size: 1.5rem;
      }
      .error-boundary-desc {
        color: #94a3b8;
        font-size: 0.9rem;
        line-height: 1.5;
        margin-bottom: 20px;
      }
      .error-boundary-details {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 24px;
        font-size: 0.82rem;
        font-family: 'Fira Code', monospace;
      }
      .error-message {
        color: #fca5a5;
        margin-bottom: 6px;
      }
      .error-source {
        color: #64748b;
        margin-bottom: 8px;
      }
      .error-stack {
        margin: 8px 0 0 0;
        max-height: 140px;
        overflow-y: auto;
        color: #cbd5e1;
        white-space: pre-wrap;
        word-break: break-all;
        font-size: 0.75rem;
      }
      .error-boundary-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .error-action-btn {
        flex: 1;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }
      .error-action-btn.primary {
        background: linear-gradient(135deg, #00f2fe, #4facfe);
        color: #050b14;
      }
      .error-action-btn.primary:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .error-action-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .error-action-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      .error-action-btn.tertiary {
        background: transparent;
        color: #94a3b8;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .error-action-btn.tertiary:hover {
        color: #f1f5f9;
        border-color: rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
