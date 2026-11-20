module.exports = (schema) => (req, res, next) => {
  if (!schema) {
    return next();
  }

  const result = schema.safeParse(req.body);

  if (!result.success) {

     console.log("VALIDATION ERRORS:", result.error.flatten());

    return next(new (require('../utils/AppError'))(
      'Request validation failed',
      400,
      result.error.flatten(),
    ));
  }

  req.validated = result.data;
  return next();
};

