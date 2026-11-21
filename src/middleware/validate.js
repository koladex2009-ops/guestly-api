const AppError = require('../utils/AppError');

module.exports = (schema) => (req, res, next) => {
  if (!schema) {
    return next();
  }

  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return next(
      new AppError(
        'Request validation failed',
        400,
        result.error.flatten(),
      ),
    );
  }

  req.validated = result.data;
  return next();
};