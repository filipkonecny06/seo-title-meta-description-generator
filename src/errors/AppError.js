class AppError extends Error {
  constructor(status, message, code = "APPLICATION_ERROR") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

module.exports = { AppError };
