/** Translates validated API requests into generation and persistence operations. */
const { AppError } = require("../errors/AppError");
const {
  favoriteSchema,
  generationInputSchema,
  previewInputSchema,
  saveGenerationSchema,
} = require("../validation/schemas");

/** Normalizes JSON columns because Sequelize drivers may return parsed values or strings. */
const parseJsonColumn = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

/** HTTP adapter for snippet generation, previewing, and user-owned persistence. */
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

  /** Validates a brief and returns generated snippets without persisting them. */
  async generate(req, res) {
    const input = generationInputSchema.parse(req.body);
    const payload = await this.snippetGenerator.generate(input);
    return res.json({ data: payload });
  }

  /** Returns escaped preview markup and display measurements for supplied copy. */
  preview(req, res) {
    const input = previewInputSchema.parse(req.body);
    return res.json({ data: this.previewBuilder.build(input) });
  }

  /**
   * Regenerates from the validated configuration before saving. Client-supplied
   * result text and scores are never trusted as authoritative history data.
   */
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

  /** Saves one item only when it belongs to a history row owned by this session. */
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

    const identity = {
      userId: req.session.userId,
      generationHistoryId: history.id,
      kind: input.type,
      itemKey: item.id,
    };
    // The database unique index makes repeated or concurrent favorite requests idempotent.
    const [row, created] = await this.models.FavoriteSnippet.findOrCreate({
      where: identity,
      defaults: {
        ...identity,
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
      },
    });

    return res.status(created ? 201 : 200).json({
      message: created ? "Favorite saved." : "Favorite already saved.",
      favoriteId: row.id,
    });
  }

  /** Returns public catalog metadata, never the mutable repository internals. */
  templates(req, res) {
    return res.json({ data: this.catalogRepository.getSummary() });
  }

  /** Lists only history owned by the authenticated session user. */
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
