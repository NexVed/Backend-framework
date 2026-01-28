/**
 * Utils Module
 */

/**
 * Send success response
 */
function success(res, data, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
    });
}

/**
 * Send success response with message
 */
function successWithMessage(res, data, message, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
    });
}

/**
 * Send created response (201)
 */
function created(res, data) {
    return success(res, data, 201);
}

/**
 * Send no content response (204)
 */
function noContent(res) {
    return res.status(204).send();
}

/**
 * Send paginated response
 */
function paginated(res, data, pagination) {
    return res.status(200).json({
        success: true,
        data,
        meta: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: pagination.totalPages,
        },
    });
}

/**
 * Calculate pagination metadata
 */
function calculatePagination(total, page, limit) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}

/**
 * Send error response
 */
function error(res, message, statusCode = 400, code, details) {
    return res.status(statusCode).json({
        success: false,
        error: getErrorName(statusCode),
        message,
        code,
        ...(details && { details }),
    });
}

function badRequest(res, message, details) {
    return error(res, message, 400, 'BAD_REQUEST', details);
}

function unauthorized(res, message = 'Unauthorized') {
    return error(res, message, 401, 'UNAUTHORIZED');
}

function forbidden(res, message = 'Forbidden') {
    return error(res, message, 403, 'FORBIDDEN');
}

function notFound(res, resource = 'Resource') {
    return error(res, `${resource} not found`, 404, 'NOT_FOUND');
}

function conflict(res, message) {
    return error(res, message, 409, 'CONFLICT');
}

function validationError(res, details) {
    return error(res, 'Validation failed', 422, 'VALIDATION_ERROR', details);
}

function serverError(res, message = 'Internal server error') {
    return error(res, message, 500, 'INTERNAL_ERROR');
}

function getErrorName(statusCode) {
    const names = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
    };
    return names[statusCode] || 'Error';
}

/**
 * Logger
 */
const LOG_COLORS = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m',
};

class Logger {
    constructor() {
        this.level = process.env.LOG_LEVEL || 'info';
        this.format = process.env.NODE_ENV === 'production' ? 'json' : 'pretty';
        this.context = {};
    }

    setLevel(level) {
        this.level = level;
    }

    setFormat(format) {
        this.format = format;
    }

    setContext(context) {
        this.context = { ...this.context, ...context };
    }

    child(context) {
        const child = new Logger();
        child.level = this.level;
        child.format = this.format;
        child.context = { ...this.context, ...context };
        return child;
    }

    debug(message, context) {
        this.log('debug', message, context);
    }

    info(message, context) {
        this.log('info', message, context);
    }

    warn(message, context) {
        this.log('warn', message, context);
    }

    error(message, errorOrContext, context) {
        let errorContext = {};

        if (errorOrContext instanceof Error) {
            errorContext = {
                errorName: errorOrContext.name,
                errorMessage: errorOrContext.message,
                stack: errorOrContext.stack,
                ...context,
            };
        } else if (errorOrContext) {
            errorContext = { ...errorOrContext, ...context };
        }

        this.log('error', message, errorContext);
    }

    time(label) {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.debug(`${label} completed`, { duration: `${duration}ms` });
        };
    }

    log(level, message, context) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        if (levels[level] < levels[this.level]) return;

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

const logger = new Logger();

function createLogger(context) {
    const log = new Logger();
    if (context) {
        log.setContext(context);
    }
    return log;
}

module.exports = {
    success,
    successWithMessage,
    created,
    noContent,
    paginated,
    calculatePagination,
    error,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    validationError,
    serverError,
    logger,
    createLogger,
    Logger,
};
