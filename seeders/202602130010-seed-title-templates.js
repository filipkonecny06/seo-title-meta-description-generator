'use strict';

const intents = ['informational', 'commercial', 'transactional', 'navigational'];

const styleTemplates = {
  list: [
    '{PrimaryKeyword}: {Benefit} in {Year}',
    '{Number} Ways to Improve {PrimaryKeyword} for {Audience}',
    '{PrimaryKeyword} Checklist: {IntentHook} for {Location}',
  ],
  'how-to': [
    'How to {PrimaryKeyword} for {Audience} in {Year}',
    'How to Use {PrimaryKeyword} to Achieve {Benefit}',
    'How to Master {PrimaryKeyword}: {IntentHook}',
  ],
  question: [
    'What Is the Best Way to {PrimaryKeyword} in {Year}?',
    'Is {PrimaryKeyword} Right for {Audience}?',
    'Can {PrimaryKeyword} Improve {Benefit} for {Location}?',
  ],
  comparison: [
    '{PrimaryKeyword} vs {Competitor}: Which Is Better for {Audience}?',
    '{PrimaryKeyword} vs Alternatives: {IntentHook}',
    '{PrimaryKeyword} Comparison Guide for {Location} ({Year})',
  ],
  'best/top': [
    'Best {PrimaryKeyword} in {Location} ({Year})',
    'Top {Number} {PrimaryKeyword} Options for {Audience}',
    'Best {PrimaryKeyword} Strategies to Unlock {Benefit}',
  ],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [];

    intents.forEach((intent, intentIndex) => {
      Object.entries(styleTemplates).forEach(([style, formulas], styleIndex) => {
        formulas.forEach((formula, formulaIndex) => {
          rows.push({
            intent,
            style,
            formula,
            powerWordBoostScore: 12 + intentIndex * 3 + styleIndex * 2 + formulaIndex,
            createdAt: now,
            updatedAt: now,
          });
        });
      });
    });

    await queryInterface.bulkInsert('title_templates', rows, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('title_templates', null, {});
  },
};
