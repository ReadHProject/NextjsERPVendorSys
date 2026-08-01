class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class BadRequestError extends ApiError {
  constructor(message = "Bad request", details = null) {
    super(400, "BAD_REQUEST", message, details);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = "Insufficient permissions") {
    super(403, "FORBIDDEN", message);
  }
}

class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super(404, "NOT_FOUND", `${resource} not found`);
  }
}

class ConflictError extends ApiError {
  constructor(message = "Resource already exists") {
    super(409, "CONFLICT", message);
  }
}

class ValidationError extends ApiError {
  constructor(message = "Validation failed", details = null) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};
