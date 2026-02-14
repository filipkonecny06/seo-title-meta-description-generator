const { fn, col } = require('sequelize');
const {
  TitleTemplate,
  MetaTemplate,
  PowerWord,
  GenerationHistory,
  FavoriteTitle,
} = require('../models');
const { generateSnippets } = require('../services/generatorService');
const { buildPreview } = require('../services/serpService');

const generate = async (req, res, next) => {
  try {
    const primaryKeyword = String(req.body.primaryKeyword || '').trim();
    if (!primaryKeyword) {
      return res.status(400).json({ error: 'Primary keyword is required.' });
    }

    const payload = await generateSnippets(req.body, {
      TitleTemplate,
      MetaTemplate,
      PowerWord,
    });

    return res.json({
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};

const preview = async (req, res, next) => {
  try {
    const previewData = buildPreview({
      title: req.body.title,
      meta: req.body.meta,
      url: req.body.url,
      primaryKeyword: req.body.primaryKeyword,
      secondaryKeywords: req.body.secondaryKeywords,
      device: req.body.device,
    });

    return res.json({ data: previewData });
  } catch (error) {
    return next(error);
  }
};

const save = async (req, res, next) => {
  try {
    const primaryKeyword = String(req.body.primaryKeyword || '').trim();
    const config = req.body.config;
    const titles = req.body.titles;
    const metas = req.body.metas;

    if (!primaryKeyword || !config || !Array.isArray(titles) || !Array.isArray(metas)) {
      return res.status(400).json({ error: 'Invalid payload for save.' });
    }

    const row = await GenerationHistory.create({
      userId: req.session.userId,
      primaryKeyword,
      config,
      titles,
      metas,
      selectedTitle: req.body.selectedTitle || null,
      selectedMeta: req.body.selectedMeta || null,
    });

    return res.status(201).json({
      message: 'Generation saved.',
      generationHistoryId: row.id,
    });
  } catch (error) {
    return next(error);
  }
};

const favorite = async (req, res, next) => {
  try {
    const generationHistoryId = Number(req.params.id || 0);
    const title = String(req.body.title || '').trim();
    const meta = String(req.body.meta || '').trim();
    const ctrScore = Number(req.body.ctrScore || 0);
    const badge = String(req.body.badge || 'Weak').trim();

    if (!title) {
      return res.status(400).json({ error: 'Title is required for favorite.' });
    }

    const row = await FavoriteTitle.create({
      userId: req.session.userId,
      generationHistoryId: generationHistoryId > 0 ? generationHistoryId : null,
      title,
      meta,
      ctrScore,
      badge,
    });

    return res.status(201).json({
      message: 'Favorite saved.',
      favoriteId: row.id,
    });
  } catch (error) {
    return next(error);
  }
};

const templates = async (req, res, next) => {
  try {
    const [titleCount, metaCount, powerCount, titleIntentSummary] = await Promise.all([
      TitleTemplate.count(),
      MetaTemplate.count(),
      PowerWord.count(),
      TitleTemplate.findAll({
        attributes: ['intent', [fn('COUNT', col('id')), 'count']],
        group: ['intent'],
        raw: true,
      }),
    ]);

    return res.json({
      data: {
        titleCount,
        metaCount,
        powerCount,
        titleIntentSummary,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const history = async (req, res, next) => {
  try {
    const rows = await GenerationHistory.findAll({
      where: { userId: req.session.userId },
      order: [['createdAt', 'DESC']],
      limit: 50,
      raw: true,
    });

    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generate,
  preview,
  save,
  favorite,
  templates,
  history,
};
