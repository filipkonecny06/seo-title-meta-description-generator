const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CHAR_WIDTHS = {
  title: {
    default: 8.8,
    thin: 4.6,
    wide: 11.8,
    space: 4,
  },
  meta: {
    default: 7.2,
    thin: 4,
    wide: 10,
    space: 3.8,
  },
};

const THIN_CHARS = new Set(['i', 'l', 'I', '1', '|', ',', '.', '!', ':', ';', "'"]);
const WIDE_CHARS = new Set(['W', 'M', 'w', 'm', '@', '#', '%', '&']);

const PIXEL_LIMITS = {
  desktop: {
    title: 580,
    meta: 920,
  },
  mobile: {
    title: 430,
    meta: 680,
  },
};

const estimatePixelWidth = (text, type = 'title') => {
  const bucket = CHAR_WIDTHS[type] || CHAR_WIDTHS.title;
  const value = String(text || '');

  return [...value].reduce((total, char) => {
    if (char === ' ') {
      return total + bucket.space;
    }

    if (THIN_CHARS.has(char)) {
      return total + bucket.thin;
    }

    if (WIDE_CHARS.has(char)) {
      return total + bucket.wide;
    }

    return total + bucket.default;
  }, 0);
};

const getPixelLimits = (device = 'desktop') => PIXEL_LIMITS[device] || PIXEL_LIMITS.desktop;

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

const highlightKeywords = (text, keywords) => {
  let html = escapeHtml(text);
  const keywordList = Array.isArray(keywords)
    ? keywords
    : String(keywords || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

  keywordList
    .sort((a, b) => b.length - a.length)
    .forEach((keyword) => {
      const regex = new RegExp(`(${escapeRegExp(escapeHtml(keyword))})`, 'gi');
      html = html.replace(regex, '<strong>$1</strong>');
    });

  return html;
};

const buildPreview = ({ title, meta, url, primaryKeyword, secondaryKeywords, device }) => {
  const safeTitle = String(title || '').trim();
  const safeMeta = String(meta || '').trim();
  const safeUrl = String(url || 'https://www.yourdomain.com').trim();
  const mode = device === 'mobile' ? 'mobile' : 'desktop';

  const limits = getPixelLimits(mode);
  const titlePixels = Math.round(estimatePixelWidth(safeTitle, 'title'));
  const metaPixels = Math.round(estimatePixelWidth(safeMeta, 'meta'));

  const allKeywords = [primaryKeyword]
    .concat(
      Array.isArray(secondaryKeywords)
        ? secondaryKeywords
        : String(secondaryKeywords || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
    )
    .filter(Boolean);

  return {
    device: mode,
    url: escapeHtml(safeUrl),
    titleHtml: highlightKeywords(safeTitle, allKeywords),
    metaHtml: highlightKeywords(safeMeta, allKeywords),
    titlePixels,
    metaPixels,
    titleLimit: limits.title,
    metaLimit: limits.meta,
    titleProgress: Math.min(100, Math.round((titlePixels / limits.title) * 100)),
    metaProgress: Math.min(100, Math.round((metaPixels / limits.meta) * 100)),
    titleTruncated: titlePixels > limits.title,
    metaTruncated: metaPixels > limits.meta,
  };
};

module.exports = {
  estimatePixelWidth,
  getPixelLimits,
  buildPreview,
};
