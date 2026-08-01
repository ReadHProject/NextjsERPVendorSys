function errorHandler(err, req, res, _next) {
  if (!err) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: { code: "FILE_TOO_LARGE", message: "File size exceeds limit" },
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Invalid JSON in request body" },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  console.error(`[ERROR] ${statusCode} ${code}:`, err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

module.exports = { errorHandler };
