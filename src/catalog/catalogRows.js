const expandCatalogRows = (catalog, now = new Date()) => {
  const titleTemplates = catalog.intents.flatMap((intent) =>
    Object.entries(catalog.titleTemplates).flatMap(([style, templates]) =>
      templates.map((template) => ({
        intent,
        style,
        ...template,
        createdAt: now,
        updatedAt: now,
      })),
    ),
  );
  const metaTemplates = Object.entries(catalog.metaTemplates).flatMap(
    ([style, templates]) =>
      templates.map((template) => ({
        style,
        ...template,
        createdAt: now,
        updatedAt: now,
      })),
  );
  const powerWords = Object.entries(catalog.powerWords).flatMap(
    ([category, words]) =>
      words.map((entry) => ({
        category,
        ...entry,
        createdAt: now,
        updatedAt: now,
      })),
  );
  return { titleTemplates, metaTemplates, powerWords };
};

module.exports = { expandCatalogRows };
