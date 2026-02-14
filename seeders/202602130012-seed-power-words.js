'use strict';

const dictionary = {
  emotion: [
    'amazing', 'effortless', 'fearless', 'unstoppable', 'breakthrough', 'winning', 'bold', 'brilliant', 'exciting',
    'powerful', 'exceptional', 'game-changing', 'uplifting', 'transformative', 'inspiring', 'compelling',
    'remarkable', 'captivating', 'magnetic', 'vibrant', 'energizing', 'elevated', 'dynamic', 'aspirational',
    'confident', 'impactful',
  ],
  urgency: [
    'now', 'today', 'instant', 'fast', 'quick', 'immediate', 'limited', 'urgent', 'last-chance', 'deadline',
    'hurry', 'act', 'priority', 'critical', 'time-sensitive', 'rapid', 'prompt', 'without-delay', 'accelerated',
    'soon', 'before-it-is-gone', 'zero-wait', 'same-day', 'expedite', 'right-away', 'momentum',
  ],
  authority: [
    'expert', 'proven', 'verified', 'data-backed', 'certified', 'official', 'industry-leading', 'strategic',
    'advanced', 'masterclass', 'framework', 'benchmark', 'optimized', 'precision', 'professional', 'elite',
    'dominant', 'best-practice', 'high-performance', 'scientific', 'research-based', 'validated', 'enterprise',
    'premium', 'trusted-by-leaders', 'flagship',
  ],
  trust: [
    'trusted', 'reliable', 'safe', 'secure', 'honest', 'transparent', 'guaranteed', 'credible', 'dependable',
    'consistent', 'authentic', 'ethical', 'reputable', 'stable', 'protection', 'warranty', 'backed', 'risk-free',
    'confidence', 'customer-first', 'supportive', 'proven-safe', 'compliant', 'accountable', 'responsible', 'integrity',
  ],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [];

    Object.entries(dictionary).forEach(([category, words]) => {
      words.forEach((word, index) => {
        rows.push({
          word,
          category,
          weight: 1 + (index % 5),
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    await queryInterface.bulkInsert('power_words', rows, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('power_words', null, {});
  },
};
