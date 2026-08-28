const createRequestLogger =
  (logger = console) =>
  (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info?.(
        JSON.stringify({
          type: "http_request",
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(1)),
        }),
      );
    });
    next();
  };

module.exports = { createRequestLogger };
