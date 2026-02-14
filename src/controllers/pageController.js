const { FavoriteTitle, GenerationHistory } = require('../models');

const landingFaq = [
  {
    question: 'How is this different from AI copy tools?',
    answer:
      'This platform uses deterministic SEO formulas and ranking heuristics. You get consistent output, repeatable strategy, and no token costs.',
  },
  {
    question: 'Do I need an API key?',
    answer: 'No. The generator is fully logic-based with template and scoring libraries stored in your own database.',
  },
  {
    question: 'What character length is best for titles?',
    answer:
      'Most high-performing SEO titles fall between 50 and 60 characters. This app scores and validates both character and pixel width.',
  },
  {
    question: 'How does CTR score work?',
    answer:
      'Score combines deterministic factors like number usage, year usage, power words, keyword placement, and intent signal match.',
  },
  {
    question: 'Can anonymous users generate snippets?',
    answer: 'Yes. Anyone can generate. Login is required only for saving favorites and generation history.',
  },
  {
    question: 'Does it support local SEO?',
    answer:
      'Yes. Include location input to inject city/region modifiers in formula templates and preview local SERP-focused variations.',
  },
  {
    question: 'Can I export generated snippets?',
    answer: 'Yes. You can instantly download .txt output and export CSV from the generator workspace.',
  },
  {
    question: 'Is schema output supported?',
    answer:
      'Yes. The generator returns headline-ready title suggestions you can map directly to structured data fields.',
  },
];

const renderLanding = (req, res) => {
  res.render('landing', {
    title: 'SEO Title & Meta Description Generator',
    faqItems: landingFaq,
  });
};

const renderGenerator = (req, res) => {
  res.render('generator', {
    title: 'Generator Workspace',
  });
};

const renderLogin = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/generator');
  }

  return res.render('login', {
    title: 'Login',
  });
};

const renderRegister = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/generator');
  }

  return res.render('register', {
    title: 'Create Account',
  });
};

const renderHistory = async (req, res, next) => {
  try {
    const [historyRows, favoriteRows] = await Promise.all([
      GenerationHistory.findAll({
        where: { userId: req.session.userId },
        order: [['createdAt', 'DESC']],
        limit: 30,
      }),
      FavoriteTitle.findAll({
        where: { userId: req.session.userId },
        order: [['createdAt', 'DESC']],
        limit: 30,
      }),
    ]);

    return res.render('history', {
      title: 'Saved History',
      historyRows,
      favoriteRows,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  renderLanding,
  renderGenerator,
  renderLogin,
  renderRegister,
  renderHistory,
};
