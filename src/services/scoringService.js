const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const INTENT_SIGNAL_MAP = {
  informational: ['how', 'guide', 'tips', 'learn', 'tutorial'],
  commercial: ['best', 'top', 'review', 'compare', 'vs'],
  transactional: ['buy', 'pricing', 'deal', 'book', 'order'],
  navigational: ['official', 'login', 'near me', 'website', 'dashboard'],
};

const hasNumber = (text) => /\b\d+\b/.test(text);
const hasYear = (text) => /\b(19|20)\d{2}\b/.test(text);

const countPowerWords = (text, powerWords) => {
  if (!Array.isArray(powerWords) || !powerWords.length) {
    return [];
  }

  const lowered = text.toLowerCase();
  return powerWords.filter((powerWord) => {
    const word = String(powerWord.word || powerWord).toLowerCase().trim();
    if (!word) {
      return false;
    }
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    return regex.test(lowered);
  });
};

const hasIntentSignal = (text, intent) => {
  const signals = INTENT_SIGNAL_MAP[intent] || [];
  const lowered = text.toLowerCase();
  return signals.some((signal) => lowered.includes(signal));
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const resolveBadge = (score) => {
  if (score >= 90) {
    return 'Elite';
  }
  if (score >= 75) {
    return 'Strong';
  }
  if (score >= 60) {
    return 'Good';
  }
  return 'Weak';
};

const calculateCTRScore = (text, options = {}) => {
  const safeText = String(text || '');
  const normalizedText = safeText.trim();
  const primaryKeyword = String(options.primaryKeyword || '').toLowerCase().trim();
  const intent = String(options.intent || '').toLowerCase().trim();

  let score = 20;

  if (hasNumber(normalizedText)) {
    score += 10;
  }

  if (hasYear(normalizedText)) {
    score += 8;
  }

  const matchedPowerWords = countPowerWords(normalizedText, options.powerWords || []);
  score += matchedPowerWords.length * 5;

  if (normalizedText.length >= 50 && normalizedText.length <= 60) {
    score += 15;
  }

  if (primaryKeyword && normalizedText.toLowerCase().startsWith(primaryKeyword)) {
    score += 10;
  }

  if (intent && hasIntentSignal(normalizedText, intent)) {
    score += 10;
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    badge: resolveBadge(finalScore),
    matchedPowerWords: matchedPowerWords.map((entry) => entry.word || entry),
  };
};

module.exports = {
  calculateCTRScore,
  resolveBadge,
};
