/**
 * Logger Utility
 * Structured logging with levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    [key: string]: any;
}

const LOG_COLORS = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m',
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private level: LogLevel;
    private format: 'json' | 'pretty';
    private context: LogContext = {};

    constructor() {
        this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
        this.format = process.env.NODE_ENV === 'production' ? 'json' : 'pretty';
    }

    /**
     * Set log level
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Set output format
     */
    setFormat(format: 'json' | 'pretty'): void {
        this.format = format;
    }

    /**
     * Set default context for all logs
     */
    setContext(context: LogContext): void {
        this.context = { ...this.context, ...context };
    }

    /**
     * Create a child logger with additional context
     */
    child(context: LogContext): Logger {
        const child = new Logger();
        child.level = this.level;
        child.format = this.format;
        child.context = { ...this.context, ...context };
        return child;
    }

    /**
     * Debug level log
     */
    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    /**
     * Info level log
     */
    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    /**
     * Warning level log
     */
    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    /**
     * Error level log
     */
    error(message: string, error?: Error | LogContext, context?: LogContext): void {
        let errorContext: LogContext = {};

        if (error instanceof Error) {
            errorContext = {
                errorName: error.name,
                errorMessage: error.message,
                stack: error.stack,
                ...context,
            };
        } else if (error) {
            errorContext = { ...error, ...context };
        }

        this.log('error', message, errorContext);
    }

    /**
     * Log with timing
     */
    time(label: string): () => void {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.debug(`${label} completed`, { duration: `${duration}ms` });
        };
    }

    /**
     * Core log method
     */
    private log(level: LogLevel, message: string, context?: LogContext): void {
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.level]) {
            return;
        }

        const timestamp = new Date().toISOString();
        const mergedContext = { ...this.context, ...context };

        if (this.format === 'json') {
            console[level](JSON.stringify({
                timestamp,
                level,
                message,
                ...mergedContext,
            }));
        } else {
            const color = LOG_COLORS[level];
            const reset = LOG_COLORS.reset;
            const levelStr = level.toUpperCase().padEnd(5);
            const contextStr = Object.keys(mergedContext).length > 0
                ? ` ${JSON.stringify(mergedContext)}`
                : '';

            console[level](`${color}[${timestamp}] ${levelStr}${reset} ${message}${contextStr}`);
        }
    }
}

// Singleton instance
export const logger = new Logger();

// Factory function
export function createLogger(context?: LogContext): Logger {
    const log = new Logger();
    if (context) {
        log.setContext(context);
    }
    return log;
}
