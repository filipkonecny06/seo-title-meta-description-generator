const express = require("express");

const createAuthRouter = (controller, authRateLimiter) => {
  const router = express.Router();
  router.post("/register", authRateLimiter, controller.register);
  router.post("/login", authRateLimiter, controller.login);
  router.post("/logout", controller.logout);
  return router;
};

module.exports = { createAuthRouter };
