const landingFaq = [
  {
    question: "How is this different from AI copy tools?",
    answer:
      "It uses version-controlled templates and transparent heuristics, so output is repeatable and has no model or token dependency.",
  },
  {
    question: "Does the score predict click-through rate?",
    answer:
      "No. It is an explainable optimization heuristic for comparing drafts, not an empirical CTR forecast.",
  },
  {
    question: "Are SERP widths exact?",
    answer:
      "No preview can guarantee Google rendering. Orbit estimates width consistently and flags likely truncation for review.",
  },
  {
    question: "Can I edit the writing rules?",
    answer:
      "Yes. Templates and weighted words live in one validated JSON catalog that can be reviewed and synchronized manually.",
  },
  {
    question: "Can anonymous users generate snippets?",
    answer:
      "Yes. Login is needed only to save generation history or favorites.",
  },
  {
    question: "Does it support local SEO?",
    answer:
      "Yes. Add a location to generate locally focused variants and preview the result.",
  },
];

class PageController {
  constructor({ models }) {
    this.models = models;
    this.renderLanding = this.renderLanding.bind(this);
    this.renderGenerator = this.renderGenerator.bind(this);
    this.renderLogin = this.renderLogin.bind(this);
    this.renderRegister = this.renderRegister.bind(this);
    this.renderHistory = this.renderHistory.bind(this);
  }

  renderLanding(req, res) {
    return res.render("landing", {
      title: "SEO Title & Meta Description Generator",
      faqItems: landingFaq,
    });
  }

  renderGenerator(req, res) {
    return res.render("generator", { title: "Generator Workspace" });
  }

  renderLogin(req, res) {
    if (req.session.userId) return res.redirect("/generator");
    return res.render("login", { title: "Login" });
  }

  renderRegister(req, res) {
    if (req.session.userId) return res.redirect("/generator");
    return res.render("register", { title: "Create Account" });
  }

  async renderHistory(req, res) {
    const [historyRows, favoriteRows] = await Promise.all([
      this.models.GenerationHistory.findAll({
        where: { userId: req.session.userId },
        order: [["createdAt", "DESC"]],
        limit: 30,
      }),
      this.models.FavoriteTitle.findAll({
        where: { userId: req.session.userId },
        order: [["createdAt", "DESC"]],
        limit: 30,
      }),
    ]);
    return res.render("history", {
      title: "Saved History",
      historyRows,
      favoriteRows,
    });
  }
}

module.exports = { PageController, landingFaq };
