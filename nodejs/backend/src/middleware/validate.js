const { ValidationError } = require("../utils/errors");

function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(422).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details,
          },
        });
      }
      req[source] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { validate };
