const express = require("express");
const { requirePageAuth } = require("../middleware/auth");

const createPageRouter = (controller) => {
  const router = express.Router();
  router.get("/", controller.renderLanding);
  router.get("/generator", controller.renderGenerator);
  router.get("/login", controller.renderLogin);
  router.get("/register", controller.renderRegister);
  router.get("/history", requirePageAuth, controller.renderHistory);
  return router;
};

module.exports = { createPageRouter };
