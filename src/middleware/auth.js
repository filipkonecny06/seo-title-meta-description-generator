module.exports = {
  // Page and API guards intentionally use transport-appropriate responses.
  /** Redirects unauthenticated page requests while preserving user feedback. */
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

  /** Rejects unauthenticated API requests with a machine-readable status. */
  requireApiAuth: (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required." });
    }
    return next();
  },
};
