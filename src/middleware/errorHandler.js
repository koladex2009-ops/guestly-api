const AppError = require('../utils/AppError');
const env = require('../config/env');
const logger = require('../config/logger');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal server error';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists';
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = error.name === 'TokenExpiredError' ? 'Authentication token expired' : 'Invalid authentication token';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  const isAppError = error instanceof AppError;

  // Save the real error in the logs
  if (statusCode >= 500) {
    logger.error(error.message, { stack: error.stack, path: req.originalUrl, method: req.method });
  }

  // On a live server, hide internal error text from users
  if (statusCode >= 500 && !isAppError && env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  const appError = isAppError ? error : new AppError(message, statusCode);

  return res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
  });
}

module.exports = errorHandler;