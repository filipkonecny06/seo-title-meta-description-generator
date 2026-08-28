module.exports = {
  requirePageAuth: (req, res, next) => {
    if (!req.session.userId) {
      req.session.flash = {
        type: "warning",
        message: "Please log in to access that page.",
      };
      return res.redirect("/login");
    }
    return next();
  },

  requireApiAuth: (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required." });
    }
    return next();
  },
};
