const CHAR_WIDTHS = {
  title: { default: 8.8, thin: 4.6, wide: 11.8, space: 4 },
  meta: { default: 7.2, thin: 4, wide: 10, space: 3.8 },
};

const THIN_CHARS = new Set([
  "i",
  "l",
  "I",
  "1",
  "|",
  ",",
  ".",
  "!",
  ":",
  ";",
  "'",
]);
const WIDE_CHARS = new Set(["W", "M", "w", "m", "@", "#", "%", "&"]);
const PIXEL_LIMITS = {
  desktop: { title: 580, meta: 920 },
  mobile: { title: 430, meta: 680 },
};

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const highlightKeywords = (text, keywords) => {
  const source = String(text || "");
  const keywordList = Array.isArray(keywords)
    ? keywords
    : String(keywords || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

  const patterns = [
    ...new Set(
      keywordList.map((keyword) => String(keyword).trim()).filter(Boolean),
    ),
  ]
    .sort((first, second) => second.length - first.length)
    .map(escapeRegExp);
  if (!patterns.length) return escapeHtml(source);

  const matcher = new RegExp(patterns.join("|"), "gi");
  const fragments = [];
  let cursor = 0;
  for (const match of source.matchAll(matcher)) {
    fragments.push(escapeHtml(source.slice(cursor, match.index)));
    fragments.push(`<strong>${escapeHtml(match[0])}</strong>`);
    cursor = match.index + match[0].length;
  }
  fragments.push(escapeHtml(source.slice(cursor)));
  return fragments.join("");
};

class SerpPreviewBuilder {
  estimatePixelWidth(text, type = "title") {
    const bucket = CHAR_WIDTHS[type] || CHAR_WIDTHS.title;
    return [...String(text || "")].reduce((total, character) => {
      if (character === " ") return total + bucket.space;
      if (THIN_CHARS.has(character)) return total + bucket.thin;
      if (WIDE_CHARS.has(character)) return total + bucket.wide;
      return total + bucket.default;
    }, 0);
  }

  getPixelLimits(device = "desktop") {
    return PIXEL_LIMITS[device] || PIXEL_LIMITS.desktop;
  }

  build({ title, meta, url, primaryKeyword, secondaryKeywords, device }) {
    const safeTitle = String(title || "").trim();
    const safeMeta = String(meta || "").trim();
    const safeUrl = String(url || "https://www.example.com").trim();
    const mode = device === "mobile" ? "mobile" : "desktop";
    const limits = this.getPixelLimits(mode);
    const titlePixels = Math.round(this.estimatePixelWidth(safeTitle, "title"));
    const metaPixels = Math.round(this.estimatePixelWidth(safeMeta, "meta"));
    const allKeywords = [primaryKeyword]
      .concat(
        Array.isArray(secondaryKeywords)
          ? secondaryKeywords
          : String(secondaryKeywords || "")
              .split(",")
              .map((entry) => entry.trim()),
      )
      .filter(Boolean);

    return {
      device: mode,
      url: safeUrl,
      titleHtml: highlightKeywords(safeTitle, allKeywords),
      metaHtml: highlightKeywords(safeMeta, allKeywords),
      titlePixels,
      metaPixels,
      titleLimit: limits.title,
      metaLimit: limits.meta,
      titleProgress: Math.min(
        100,
        Math.round((titlePixels / limits.title) * 100),
      ),
      metaProgress: Math.min(100, Math.round((metaPixels / limits.meta) * 100)),
      titleTruncated: titlePixels > limits.title,
      metaTruncated: metaPixels > limits.meta,
    };
  }
}

const defaultBuilder = new SerpPreviewBuilder();

module.exports = {
  SerpPreviewBuilder,
  buildPreview: (input) => defaultBuilder.build(input),
  estimatePixelWidth: (text, type) =>
    defaultBuilder.estimatePixelWidth(text, type),
  getPixelLimits: (device) => defaultBuilder.getPixelLimits(device),
};
