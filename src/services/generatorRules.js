const DEFAULT_COMPETITORS = ["Option B", "Option C", "Option D", "Other"];
const DEFAULT_NUMBERS = [3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 21, 25];
const TOPIC_ANGLES = [
  "planning basics",
  "implementation steps",
  "selection criteria",
  "common questions",
  "practical examples",
  "a review checklist",
  "workflow design",
  "key considerations",
  "a feature review",
  "pricing details",
  "editorial structure",
  "publishing checks",
];
const TONE_CUES = {
  neutral: "clear",
  authoritative: "formal",
  urgent: "quick",
  friendly: "simple",
};
const INTENT_CONTEXT = {
  informational: {
    action: "learn",
    actionGerund: "learning",
    topic: "key facts",
  },
  commercial: {
    action: "compare",
    actionGerund: "comparing",
    topic: "options",
  },
  transactional: {
    action: "choose",
    actionGerund: "choosing",
    topic: "next steps",
  },
  navigational: { action: "find", actionGerund: "finding", topic: "key pages" },
};
const INTENT_HOOKS = {
  informational: [
    "a topic overview",
    "a step-by-step outline",
    "a practical tutorial",
    "key definitions",
    "worked examples",
  ],
  commercial: [
    "a side-by-side comparison",
    "a feature review",
    "selection criteria",
    "pricing notes",
    "implementation trade-offs",
  ],
  transactional: [
    "a purchase checklist",
    "pricing questions",
    "setup requirements",
    "a decision framework",
    "next-step planning",
  ],
  navigational: [
    "page structure",
    "navigation details",
    "key destinations",
    "access instructions",
    "common page paths",
  ],
};
const TITLE_EXTENSIONS = [
  "— Details",
  "— Explained",
  "— What to Know",
  "— How It Works",
  "— What Matters",
  "— Where to Start",
  "— What to Review",
  "— Questions to Ask",
  "— A Practical Review",
  "— A Review Checklist",
  "— Key Questions Answered",
  "— Planning Steps Explained",
  "— Criteria and Examples",
  "— Options and Trade-Offs",
  "— What to Consider",
  "— A Structured Overview",
  "— Decision Criteria and Questions",
  "— Page Planning Criteria and Questions",
  "— A Step-by-Step Review",
  "— A Practical Planning Guide",
];
const META_CONTINUATIONS = [
  "Review the examples.",
  "Note the main trade-offs.",
  "Record any open questions.",
  "Note what applies before review.",
  "Check the details before publishing.",
  "Use the checklist to record questions and next steps.",
  "Compare the criteria and document what applies to your page.",
  "Compare the criteria, note the trade-offs, and record all relevant next steps.",
  "Document open questions, confirm ownership, and record the next actions for review.",
  "Review each example, note the trade-offs, and record the next steps for your draft.",
];
const META_CONCEPTS = [
  "example",
  "trade-off",
  "question",
  "detail",
  "checklist",
  "criteria",
  "next step",
];
const LENGTH_PROFILES = {
  short: { title: { min: 41, max: 53 }, meta: { min: 110, max: 135 } },
  medium: { title: { min: 50, max: 60 }, meta: { min: 135, max: 155 } },
  long: { title: { min: 53, max: 61 }, meta: { min: 145, max: 160 } },
};
const NORMAL_INPUT_LIMITS = Object.freeze({
  primaryKeyword: 20,
  audience: 32,
  location: 32,
  secondaryKeyword: 40,
  comparisonTitleCombined: Object.freeze({
    short: 28,
    medium: 35,
    long: 36,
  }),
});

module.exports = {
  DEFAULT_COMPETITORS,
  DEFAULT_NUMBERS,
  INTENT_CONTEXT,
  INTENT_HOOKS,
  LENGTH_PROFILES,
  META_CONCEPTS,
  META_CONTINUATIONS,
  NORMAL_INPUT_LIMITS,
  TITLE_EXTENSIONS,
  TONE_CUES,
  TOPIC_ANGLES,
};
