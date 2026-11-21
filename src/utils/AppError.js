
class AppError extends Error {
    constructor(message, statusCode = 500, data) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;

        if (data !== undefined) {
            this.data = data;
        }

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
