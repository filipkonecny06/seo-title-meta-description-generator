const { AppError } = require("../errors/AppError");
const {
  favoriteSchema,
  generationInputSchema,
  previewInputSchema,
  saveGenerationSchema,
} = require("../validation/schemas");

const parseJsonColumn = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

class ApiController {
  constructor({ models, snippetGenerator, previewBuilder, catalogRepository }) {
    this.models = models;
    this.snippetGenerator = snippetGenerator;
    this.previewBuilder = previewBuilder;
    this.catalogRepository = catalogRepository;
    this.generate = this.generate.bind(this);
    this.preview = this.preview.bind(this);
    this.save = this.save.bind(this);
    this.favorite = this.favorite.bind(this);
    this.templates = this.templates.bind(this);
    this.history = this.history.bind(this);
  }

  async generate(req, res) {
    const input = generationInputSchema.parse(req.body);
    const payload = await this.snippetGenerator.generate(input);
    return res.json({ data: payload });
  }

  preview(req, res) {
    const input = previewInputSchema.parse(req.body);
    return res.json({ data: this.previewBuilder.build(input) });
  }

  async save(req, res) {
    const input = saveGenerationSchema.parse(req.body);
    const generated = await this.snippetGenerator.generate(input.config);
    const selectedTitle = generated.titles.find(
      (item) => item.id === input.selectedTitleId,
    );
    const selectedMeta = generated.metas.find(
      (item) => item.id === input.selectedMetaId,
    );
    const row = await this.models.GenerationHistory.create({
      userId: req.session.userId,
      primaryKeyword: generated.config.primaryKeyword,
      config: generated.config,
      titles: generated.titles,
      metas: generated.metas,
      selectedTitle: selectedTitle?.text || null,
      selectedMeta: selectedMeta?.text || null,
    });

    return res.status(201).json({
      message: "Generation saved.",
      generationHistoryId: row.id,
    });
  }

  async favorite(req, res) {
    const input = favoriteSchema.parse(req.body);
    const history = await this.models.GenerationHistory.findOne({
      where: { id: input.generationHistoryId, userId: req.session.userId },
    });
    if (!history) {
      throw new AppError(
        404,
        "Saved generation not found.",
        "HISTORY_NOT_FOUND",
      );
    }

    const titles = parseJsonColumn(history.titles) || [];
    const metas = parseJsonColumn(history.metas) || [];
    const items = input.type === "title" ? titles : metas;
    const item = items.find((entry) => entry.id === input.itemId);
    if (!item) {
      throw new AppError(
        400,
        "Favorite item does not belong to that generation.",
        "INVALID_FAVORITE",
      );
    }

    const row = await this.models.FavoriteTitle.create({
      userId: req.session.userId,
      generationHistoryId: history.id,
      title:
        input.type === "title"
          ? item.text
          : history.selectedTitle || titles[0]?.text,
      meta:
        input.type === "meta"
          ? item.text
          : history.selectedMeta || metas[0]?.text || null,
      optimizationScore: item.optimizationScore,
      badge: item.badge,
    });

    return res
      .status(201)
      .json({ message: "Favorite saved.", favoriteId: row.id });
  }

  templates(req, res) {
    return res.json({ data: this.catalogRepository.getSummary() });
  }

  async history(req, res) {
    const rows = await this.models.GenerationHistory.findAll({
      where: { userId: req.session.userId },
      order: [["createdAt", "DESC"]],
      limit: 50,
      raw: true,
    });
    return res.json({ data: rows });
  }
}

module.exports = { ApiController, parseJsonColumn };
