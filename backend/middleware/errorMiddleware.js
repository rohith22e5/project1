import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
    // Log the error using the new logger.
    // Winston will handle the stack trace and formatting (JSON in prod, text in dev).
    logger.error(err.stack);

    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Handle Zod validation errors
    if (err.name === 'ZodError') {
        statusCode = 400;
        // Format Zod errors into a readable message
        const formattedErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        message = formattedErrors.join(', ');
    }

    // Handle rate limiting errors
    if (err.message.includes('Too many requests')) {
        statusCode = 429;
    }

    res.status(statusCode);
    res.json({
        message: message,
        // This logic remains, to control what is sent in the API response body.
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

export { errorHandler }; 