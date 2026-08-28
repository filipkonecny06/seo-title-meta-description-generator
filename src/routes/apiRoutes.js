const express = require("express");
const { requireApiAuth } = require("../middleware/auth");

const createApiRouter = (controller) => {
  const router = express.Router();
  // Generation and previews are public; persistence always requires a session.
  router.post("/generate", controller.generate);
  router.post("/preview", controller.preview);
  router.post("/save", requireApiAuth, controller.save);
  router.post("/favorites", requireApiAuth, controller.favorite);
  router.get("/templates", controller.templates);
  router.get("/history", requireApiAuth, controller.history);
  return router;
};

module.exports = { createApiRouter };
