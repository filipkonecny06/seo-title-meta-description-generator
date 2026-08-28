# SEO Title & Meta Description Generator

A deterministic SEO-snippet workshop built with Node.js, Express, MySQL, and
EJS. It turns an explicit brief into inspectable title and description options
with transparent optimization heuristics.

## Why this project is portfolio-ready

- Clear boundaries: controllers coordinate requests; named services generate,
  score, and build SERP previews; repositories own catalog access.
- A versioned JSON catalog makes templates and power words easy to review and
  edit without changing application logic.
- Authentication, CSRF protection, session rotation, rate limits, strict CSP,
  input validation, and ownership checks are implemented and tested.
- CI runs catalog validation, formatting, linting, coverage-gated tests, and a
  production dependency audit on every pull request.

## Features

- Generate titles and descriptions for an intent, audience, location, and
  style; score the options with an explainable heuristic.
- Render desktop/mobile SERP previews and compare two candidate titles.
- Save generation history and favorites for authenticated users.
- Export outputs as text or CSV (with spreadsheet-formula neutralization).
- Manage the 80 title templates, 15 meta templates, and 40 power words through
  `src/catalog/catalog.json`.

## Architecture

```text
browser -> routes -> controllers -> services/repositories -> Sequelize/MySQL
                                    |
                                    +-> versioned JSON template catalog
```

`SnippetGenerator`, `OptimizationScorer`, and `SerpPreviewBuilder` are small,
independently tested services. `JsonTemplateCatalogRepository` isolates the
editable catalog from the generation workflow.

## Run locally

Requires Node.js 22+ and MySQL 8+.

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run catalog:sync
npm run dev
```

On Windows PowerShell, replace the `cp` command with
`Copy-Item .env.example .env`. Set a unique `SESSION_SECRET` of at least 32
characters and provide your local database settings before starting the app.

The app listens on `http://localhost:3000` by default. `GET /health/live` is a
liveness probe and `GET /health/ready` verifies database connectivity.

### Docker development environment

```bash
docker compose up --build
```

Docker Compose starts MySQL, runs migrations, synchronizes the catalog, and
launches the development server. The Compose credentials are intentionally
local-only defaults; never reuse them in production.

## Manual catalog workflow

Edit `src/catalog/catalog.json`, then use the checks below:

```bash
npm run catalog:validate
npm run catalog:sync:dry-run
npm run catalog:sync
```

The first command validates the catalog. The dry run is read-only. The final
command upserts catalog rows in one database transaction.

## Quality checks

```bash
npm run check
npm audit --omit=dev --audit-level=high
```

`npm run check` applies no changes: it checks Prettier formatting, ESLint, and
Node’s test runner with coverage thresholds for core configuration, catalog,
application, and generation services (80% lines/functions, 70% branches). Use
`npm run format` only when you intentionally want formatting changes.

## Security notes

- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- State-changing requests require a synchronizer CSRF token.
- Successful registration and login rotate the session identifier.
- Input is schema-validated; API payloads and response bodies are bounded.
- Auth endpoints and API requests are rate limited; saved resources enforce
  user ownership server-side.
- Helmet sets a self-only CSP with per-request nonces; no third-party runtime
  scripts or fonts are required.

For deployment, terminate TLS before the app, configure `TRUST_PROXY` only for
your known proxy topology, use managed database backups, and run migrations as
a release step before starting new application instances.

## License

[MIT](LICENSE).
