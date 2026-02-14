'use strict';

const templatesByStyle = {
  educational: [
    'Learn how to {PrimaryKeyword} with this {IntentHook}. Includes {Benefit1}, {Benefit2}, and practical next steps.',
    'Discover {Number} practical ways to improve {PrimaryKeyword} for {Audience}. Build momentum with {Benefit}.',
    'Use this guide to master {PrimaryKeyword} in {Year}. Ideal for {Audience} aiming for {Benefit}.',
    'Explore {PrimaryKeyword} best practices with examples, strategy notes, and {Benefit} outcomes.',
    'Understand {PrimaryKeyword} fundamentals and avoid common mistakes while driving {Benefit}.',
    'Get a step-by-step {PrimaryKeyword} framework built for {Audience} and focused on {Benefit}.',
    'Need clarity on {PrimaryKeyword}? This educational walkthrough covers {Benefit1} and {Benefit2}.',
    'Learn what makes {PrimaryKeyword} effective in {Location}, and how to turn insights into action.',
    'From basics to advanced tactics, this {PrimaryKeyword} resource is built to improve {Benefit}.',
    'Get the full {PrimaryKeyword} breakdown with clear examples and expert-backed recommendations.',
  ],
  'sales-focused': [
    'Looking for the best {PrimaryKeyword}? Compare options, pricing insights, and key benefits before you decide.',
    'Find the right {PrimaryKeyword} for {Audience}. See features, pros, and deal-ready guidance {Urgency}.',
    'Choose smarter with this {PrimaryKeyword} buyer guide. Compare value, speed, and results in one view.',
    'Ready to move forward? Evaluate top {PrimaryKeyword} choices and pick the best fit for {Location}.',
    'Use this conversion-focused {PrimaryKeyword} guide to shortlist the strongest options in minutes.',
    'Discover top-performing {PrimaryKeyword} solutions and act with confidence using clear side-by-side insights.',
    'Need to buy {PrimaryKeyword} soon? Review critical features and avoid costly selection mistakes.',
    'Compare {PrimaryKeyword} packages and identify the highest-impact choice for your goals.',
    'See how leading {PrimaryKeyword} options stack up so you can commit faster and safer.',
    'Pick your ideal {PrimaryKeyword} with a direct comparison built for decision-stage buyers.',
  ],
  'benefit-driven': [
    'Unlock {Benefit} with a smarter {PrimaryKeyword} strategy tailored to {Audience}.',
    'Improve results faster with {PrimaryKeyword} tactics that increase {Benefit1} and {Benefit2}.',
    'Turn {PrimaryKeyword} into measurable wins with methods built for {Location} growth.',
    'Get stronger outcomes from {PrimaryKeyword} using a proven process focused on {Benefit}.',
    'Accelerate your progress in {PrimaryKeyword} and gain a competitive edge {Urgency}.',
    'Drive better performance with {PrimaryKeyword} insights engineered for high-impact results.',
    'Raise your conversion potential through {PrimaryKeyword} improvements that prioritize {Benefit}.',
    'Use {PrimaryKeyword} the right way and capture more value with less wasted effort.',
    'Build momentum with {PrimaryKeyword} tactics that deliver long-term {Benefit} gains.',
    'Get outcome-first {PrimaryKeyword} guidance for teams targeting faster and stronger growth.',
  ],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [];

    Object.entries(templatesByStyle).forEach(([style, formulas], styleIndex) => {
      formulas.forEach((formula, formulaIndex) => {
        rows.push({
          style,
          formula,
          benefitWeight: 6 + ((styleIndex + formulaIndex) % 5),
          urgencyWeight: 4 + ((formulaIndex + styleIndex * 2) % 5),
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    await queryInterface.bulkInsert('meta_templates', rows, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('meta_templates', null, {});
  },
};
