const { ZodError } = require("zod");

const notFoundHandler = (req, res, next) => {
  const error = new Error("Route not found");
  error.status = 404;
  next(error);
};

const createErrorHandler =
  ({ logger = console } = {}) =>
  (error, req, res, next) => {
    if (res.headersSent) return next(error);

    const isValidationError = error instanceof ZodError;
    const status =
      error.code === "EBADCSRFTOKEN"
        ? 403
        : error.type === "entity.too.large"
          ? 413
          : isValidationError
            ? 400
            : error.status || error.statusCode || 500;

    if (status >= 500) {
      logger.error?.("Unhandled request error", {
        method: req.method,
        path: req.path,
        error: error.stack || error.message,
      });
    }

    const publicMessage =
      status >= 500
        ? "Internal server error."
        : error.code === "EBADCSRFTOKEN"
          ? "Invalid CSRF token. Refresh and try again."
          : isValidationError
            ? "Request validation failed."
            : error.message;

    if (
      req.path.startsWith("/api") ||
      req.accepts(["json", "html"]) === "json"
    ) {
      return res.status(status).json({
        error: publicMessage,
        ...(isValidationError
          ? {
              details: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            }
          : {}),
      });
    }

    return res.status(status).render("error", {
      title: status === 403 ? "Security Token Error" : "Something Went Wrong",
      status,
      message: publicMessage,
    });
  };

module.exports = { createErrorHandler, notFoundHandler };
