const { Op } = require('sequelize');
const { calculateCTRScore } = require('./scoringService');
const { estimatePixelWidth, getPixelLimits } = require('./serpService');

const DEFAULT_BENEFITS = [
  'higher organic traffic',
  'better click-through rate',
  'faster ranking momentum',
  'stronger search visibility',
  'cleaner SERP messaging',
  'more qualified leads',
  'better conversion intent',
  'stronger brand authority',
];

const DEFAULT_URGENCY = [
  'before your competitors do',
  'while demand is rising',
  'before rankings shift again',
  'without wasting ad spend',
  'in less time',
];

const DEFAULT_COMPETITORS = [
  'top alternatives',
  'leading options',
  'other providers',
  'market leaders',
];

const DEFAULT_NUMBERS = [5, 7, 9, 10, 12, 15, 21];

const TONE_MODIFIERS = {
  neutral: ['practical', 'clear', 'reliable'],
  authoritative: ['expert-backed', 'data-driven', 'proven'],
  urgent: ['time-sensitive', 'high-impact', 'fast-acting'],
  friendly: ['easy', 'simple', 'approachable'],
};

const INTENT_HOOKS = {
  informational: ['complete guide', 'step-by-step framework', 'practical tutorial'],
  commercial: ['side-by-side comparison', 'in-depth review', 'feature breakdown'],
  transactional: ['best deal', 'pricing insights', 'ready-to-buy checklist'],
  navigational: ['official resource', 'direct access', 'trusted destination'],
};

const LENGTH_PROFILES = {
  short: {
    title: { min: 42, max: 52 },
    meta: { min: 110, max: 135 },
  },
  medium: {
    title: { min: 50, max: 60 },
    meta: { min: 135, max: 155 },
  },
  'max ctr': {
    title: { min: 54, max: 60 },
    meta: { min: 145, max: 160 },
  },
};

const safeString = (value) => String(value || '').trim();

const titleCase = (value) =>
  safeString(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const normalizeLengthPreference = (value) => {
  const normalized = safeString(value).toLowerCase();
  if (normalized === 'max ctr' || normalized === 'max-ctr') {
    return 'max ctr';
  }
  if (normalized === 'short') {
    return 'short';
  }
  return 'medium';
};

const hashString = (input) => {
  const value = safeString(input);
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickFrom = (list, seed) => {
  if (!Array.isArray(list) || !list.length) {
    return '';
  }
  return list[seed % list.length];
};

const splitKeywords = (value) =>
  safeString(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeWhitespace = (value) =>
  safeString(value)
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();

const applyTemplate = (formula, context) =>
  normalizeWhitespace(
    safeString(formula).replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(context, key)) {
        return safeString(context[key]);
      }
      return '';
    })
  );

const squeezeTextToLimit = (text, maxChars) => {
  if (text.length <= maxChars) {
    return text;
  }

  const words = text.split(' ');
  let candidate = words.join(' ');

  while (candidate.length > maxChars && words.length > 3) {
    words.pop();
    candidate = `${words.join(' ')}`;
  }

  return candidate.length > maxChars ? candidate.slice(0, maxChars).trim() : candidate;
};

const padTextToMinimum = (text, minChars, fallback) => {
  if (text.length >= minChars) {
    return text;
  }

  const suffix = safeString(fallback);
  if (!suffix) {
    return text;
  }

  const withSuffix = `${text} ${suffix}`.trim();
  return withSuffix;
};

const enforceLengthProfile = (text, lengthPreference, type, seed) => {
  const profile = LENGTH_PROFILES[normalizeLengthPreference(lengthPreference)][type];
  const fallbackSuffix =
    type === 'title'
      ? pickFrom(['Guide', 'Tips', 'Framework', 'Blueprint'], seed)
      : pickFrom(['Start improving results today.', 'Built for better CTR outcomes.', 'Designed for stronger rankings.'], seed);

  const padded = padTextToMinimum(text, profile.min, fallbackSuffix);
  return squeezeTextToLimit(padded, profile.max);
};

const ensureUnique = (text, seen, fallbackToken) => {
  let candidate = text;
  let iteration = 1;

  while (seen.has(candidate.toLowerCase()) && iteration < 5) {
    candidate = `${text} | ${fallbackToken} ${iteration}`;
    iteration += 1;
  }

  seen.add(candidate.toLowerCase());
  return candidate;
};

const fetchTitleTemplates = async (TitleTemplate, intent, style) => {
  const strict = await TitleTemplate.findAll({
    where: { intent, style },
    order: [['powerWordBoostScore', 'DESC'], ['id', 'ASC']],
  });

  if (strict.length >= 10) {
    return strict;
  }

  const relaxedStyle = await TitleTemplate.findAll({
    where: {
      intent,
      style: {
        [Op.in]: ['list', 'how-to', 'question', 'comparison', 'best/top'],
      },
    },
    order: [['powerWordBoostScore', 'DESC'], ['id', 'ASC']],
  });

  if (relaxedStyle.length >= 10) {
    return relaxedStyle;
  }

  return TitleTemplate.findAll({
    where: { intent },
    order: [['powerWordBoostScore', 'DESC'], ['id', 'ASC']],
  });
};

const fetchMetaTemplates = async (MetaTemplate, style) => {
  const strict = await MetaTemplate.findAll({
    where: { style },
    order: [['benefitWeight', 'DESC'], ['urgencyWeight', 'DESC'], ['id', 'ASC']],
  });

  if (strict.length >= 5) {
    return strict;
  }

  return MetaTemplate.findAll({
    order: [['benefitWeight', 'DESC'], ['urgencyWeight', 'DESC'], ['id', 'ASC']],
  });
};

const normalizeInput = (input = {}) => {
  const includeYear =
    input.includeYear === true ||
    input.includeYear === 'true' ||
    input.includeYear === 'on' ||
    input.includeYear === 1 ||
    input.includeYear === '1';

  const bulkMode = input.bulkMode === true || input.bulkMode === 'true' || input.bulkMode === 'on';

  return {
    primaryKeyword: safeString(input.primaryKeyword),
    secondaryKeywords: splitKeywords(input.secondaryKeywords),
    audience: safeString(input.audience),
    location: safeString(input.location),
    includeYear,
    intent: safeString(input.intent).toLowerCase() || 'informational',
    tone: safeString(input.tone).toLowerCase() || 'neutral',
    titleStyle: safeString(input.titleStyle).toLowerCase() || 'list',
    metaStyle: safeString(input.metaStyle).toLowerCase() || 'educational',
    length: normalizeLengthPreference(input.length),
    bulkMode,
  };
};

const generateSnippets = async (input, repositories) => {
  const { TitleTemplate, MetaTemplate, PowerWord } = repositories;
  const config = normalizeInput(input);

  if (!config.primaryKeyword) {
    throw new Error('Primary keyword is required.');
  }

  const [titleTemplates, metaTemplates, powerWords] = await Promise.all([
    fetchTitleTemplates(TitleTemplate, config.intent, config.titleStyle),
    fetchMetaTemplates(MetaTemplate, config.metaStyle),
    PowerWord.findAll({ order: [['weight', 'DESC'], ['word', 'ASC']] }),
  ]);

  if (!titleTemplates.length || !metaTemplates.length) {
    throw new Error('Template library is not seeded. Run database seeders first.');
  }

  const currentYear = String(new Date().getFullYear());
  const baseSeed = hashString(`${config.primaryKeyword}:${config.intent}:${config.titleStyle}`);
  const titleLimit = getPixelLimits('desktop').title;
  const metaLimit = getPixelLimits('desktop').meta;
  const seenTitles = new Set();
  const seenMetas = new Set();

  const titleCount = config.bulkMode ? 20 : 10;
  const metaCount = 5;

  const titles = [];
  for (let index = 0; index < titleCount; index += 1) {
    const seed = baseSeed + index * 13;
    const template = titleTemplates[index % titleTemplates.length];
    const benefit = pickFrom(DEFAULT_BENEFITS, seed);
    const urgency = pickFrom(DEFAULT_URGENCY, seed + 2);
    const competitor =
      config.secondaryKeywords[0] || pickFrom(DEFAULT_COMPETITORS, seed + 5);

    const context = {
      PrimaryKeyword: titleCase(config.primaryKeyword),
      Benefit: benefit,
      Benefit1: pickFrom(DEFAULT_BENEFITS, seed + 1),
      Benefit2: pickFrom(DEFAULT_BENEFITS, seed + 3),
      Year: config.includeYear ? currentYear : '',
      Audience: config.audience || 'marketers',
      Location: config.location || 'your market',
      Number: String(pickFrom(DEFAULT_NUMBERS, seed + 4)),
      Competitor: competitor,
      SecondaryKeywords: config.secondaryKeywords.join(', '),
      IntentHook: pickFrom(INTENT_HOOKS[config.intent] || INTENT_HOOKS.informational, seed),
      Urgency: urgency,
      ToneModifier: pickFrom(TONE_MODIFIERS[config.tone] || TONE_MODIFIERS.neutral, seed + 7),
    };

    let text = applyTemplate(template.formula, context);
    text = enforceLengthProfile(text, config.length, 'title', seed);
    text = ensureUnique(text, seenTitles, context.Number);

    const score = calculateCTRScore(text, {
      primaryKeyword: titleCase(config.primaryKeyword),
      intent: config.intent,
      powerWords,
    });

    const pixelWidth = Math.round(estimatePixelWidth(text, 'title'));

    titles.push({
      id: `title-${index + 1}`,
      text,
      charCount: text.length,
      pixelWidth,
      ctrScore: score.score,
      badge: score.badge,
      matchedPowerWords: score.matchedPowerWords,
      schemaHeadline: squeezeTextToLimit(text, 110),
      truncated: pixelWidth > titleLimit,
    });
  }

  const metas = [];
  for (let index = 0; index < metaCount; index += 1) {
    const seed = baseSeed + index * 17;
    const template = metaTemplates[index % metaTemplates.length];

    const context = {
      PrimaryKeyword: titleCase(config.primaryKeyword),
      Benefit: pickFrom(DEFAULT_BENEFITS, seed + 1),
      Benefit1: pickFrom(DEFAULT_BENEFITS, seed + 2),
      Benefit2: pickFrom(DEFAULT_BENEFITS, seed + 4),
      Year: config.includeYear ? currentYear : '',
      Audience: config.audience || 'your audience',
      Location: config.location || 'your region',
      Number: String(pickFrom(DEFAULT_NUMBERS, seed + 3)),
      Competitor: config.secondaryKeywords[0] || pickFrom(DEFAULT_COMPETITORS, seed + 6),
      SecondaryKeywords: config.secondaryKeywords.join(', '),
      IntentHook: pickFrom(INTENT_HOOKS[config.intent] || INTENT_HOOKS.informational, seed + 8),
      Urgency: pickFrom(DEFAULT_URGENCY, seed + 9),
      ToneModifier: pickFrom(TONE_MODIFIERS[config.tone] || TONE_MODIFIERS.neutral, seed + 10),
    };

    let text = applyTemplate(template.formula, context);
    text = enforceLengthProfile(text, config.length, 'meta', seed);
    text = ensureUnique(text, seenMetas, context.Number);

    const score = calculateCTRScore(text, {
      primaryKeyword: titleCase(config.primaryKeyword),
      intent: config.intent,
      powerWords,
    });

    const pixelWidth = Math.round(estimatePixelWidth(text, 'meta'));

    metas.push({
      id: `meta-${index + 1}`,
      text,
      charCount: text.length,
      pixelWidth,
      ctrScore: score.score,
      badge: score.badge,
      matchedPowerWords: score.matchedPowerWords,
      truncated: pixelWidth > metaLimit,
    });
  }

  const bestTitle = [...titles].sort((a, b) => b.ctrScore - a.ctrScore)[0] || null;

  return {
    config,
    titles,
    metas,
    schemaHeadlineSuggestions: titles.slice(0, 3).map((item) => item.schemaHeadline),
    summary: {
      titleCount: titles.length,
      metaCount: metas.length,
      avgTitleScore: Math.round(titles.reduce((total, item) => total + item.ctrScore, 0) / titles.length),
      avgMetaScore: Math.round(metas.reduce((total, item) => total + item.ctrScore, 0) / metas.length),
      bestTitle,
    },
  };
};

module.exports = {
  generateSnippets,
  normalizeInput,
};
