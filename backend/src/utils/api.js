class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function ok(data, options = {}) {
  const response = { success: true, data };
  return new Response(JSON.stringify(response), {
    status: options.status || 200,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}

function fail(error) {
  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_ERROR";
  const message = error.message || "Internal server error";
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status: statusCode, headers: { "Content-Type": "application/json" } }
  );
}

module.exports = { ApiError, ok, fail };
