const title = {
  id: "title-1",
  text: "SEO <Review> & Checklist",
  charCount: 24,
  pixelWidth: 210,
  optimizationScore: 78,
  badge: "Moderate alignment",
  badgeLevel: "medium",
  truncated: false,
  outsideCharacterTarget: false,
  scoreBreakdown: {
    baseline: 20,
    powerWords: 6,
    intentSignal: 10,
  },
  matchedPowerWords: ["clear", "<review>"],
};
const meta = {
  id: "meta-1",
  text: "Review =SUM(A1:A2) before publishing.",
  charCount: 37,
  pixelWidth: 430,
  optimizationScore: 66,
  badge: "Partial alignment",
  badgeLevel: "partial",
  truncated: true,
  outsideCharacterTarget: true,
  scoreBreakdown: { baseline: 20, optimalLength: 15 },
  matchedPowerWords: [],
};
const generatedData = {
  config: {
    primaryKeyword: "SEO review",
    secondaryKeywords: ["audit"],
  },
  titles: [title],
  metas: [meta],
  scoreBreakdownLabels: {
    baseline: "Baseline",
    powerWords: "Matched terms",
    intentSignal: "Intent signal",
    optimalLength: "Optimal scoring length",
  },
  summary: {
    titleCount: 1,
    metaCount: 1,
    avgTitleScore: 78,
    avgMetaScore: 66,
  },
  schemaHeadlineSuggestions: [title.text],
};

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
}

class FakeElement {
  constructor() {
    this.attributes = {};
    this.classList = new FakeClassList();
    this.dataset = {};
    this.disabled = false;
    this.innerHTML = "";
    this.listeners = new Map();
    this.textContent = "";
    this.value = "";
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  emit(type, event = {}) {
    return this.listeners.get(type)?.(event);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  querySelectorAll() {
    return this.favoriteButtons || [];
  }
}

const createViewDocument = () => {
  const ids = [
    "generator-form",
    "generate-btn",
    "download-btn",
    "export-btn",
    "save-generation-btn",
    "title-results",
    "meta-results",
    "summary-badges",
    "compare-panel",
    "results-panel",
    "generator-status",
    "preview-url",
    "preview-title",
    "preview-meta",
    "serp-card",
    "title-pixels",
    "meta-pixels",
    "title-progress",
    "meta-progress",
    "title-warning",
    "meta-warning",
    "schema-suggestions",
    "desktop-toggle",
    "mobile-toggle",
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  const form = elements["generator-form"];
  form.reportValidity = () => true;
  form.primaryKeyword = { value: " SEO review " };
  form.secondaryKeywords = { value: "audit, checklist" };
  form.audience = { value: "editors" };
  form.location = { value: "Prague" };
  form.includeYear = { checked: true };
  form.intent = { value: "informational" };
  form.tone = { value: "neutral" };
  form.titleStyle = { value: "list" };
  form.metaStyle = { value: "educational" };
  form.length = { value: "medium" };
  form.bulkMode = { checked: false };
  form.pageUrl = new FakeElement();
  form.pageUrl.value = " https://example.com/page ";
  return {
    elements,
    document: {
      getElementById: (id) => elements[id] || null,
    },
  };
};

module.exports = {
  FakeClassList,
  FakeElement,
  createViewDocument,
  generatedData,
  meta,
  title,
};
