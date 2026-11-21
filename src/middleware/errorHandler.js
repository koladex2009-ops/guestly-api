const AppError = require('../utils/AppError');

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

  const appError = error instanceof AppError
    ? error
    : new AppError(message, statusCode);

    const response = {
      success: false,
      message: appError.message,
    };

      if (appError.data) {
        response.errors = appError.data;
    }

    return res.status(appError.statusCode).json(response);
}
//   return res.status(appError.statusCode).json({
//     success: false,
//     message: appError.message,
//   });
// }

module.exports = errorHandler;

