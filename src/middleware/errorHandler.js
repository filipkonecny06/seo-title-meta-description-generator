/** Maps internal request failures to safe HTML or JSON responses. */
const { ZodError } = require("zod");

/** Converts unmatched routes into the centralized error pipeline. */
const notFoundHandler = (req, res, next) => {
  const error = new Error("Route not found");
  error.status = 404;
  next(error);
};

/**
 * Creates the terminal Express error handler. Internal details are logged
 * server-side but never exposed in 5xx responses.
 */
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

    // API paths and explicit JSON clients receive a stable machine-readable shape.
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
