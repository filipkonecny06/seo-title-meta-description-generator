# SEO Title & Meta Description Generator

[![CI](https://github.com/filipkonecny06/seo-title-meta-description-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/filipkonecny06/seo-title-meta-description-generator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-0f766e.svg)](LICENSE)

A deterministic drafting application for SEO titles and meta descriptions.
It combines a validated JSON formula catalog with explicit scoring and width
heuristics, then lets authenticated users save generation history and favorite
individual snippets.

## Capabilities

- Produces 10 or 20 unique titles and five meta descriptions from a structured
  brief.
- Supports four search intents, four tones, five title styles, three description
  styles, and three length profiles.
- Shows the inputs behind each optimization score; the score is a drafting aid,
  not a traffic or click-through prediction.
- Estimates desktop and mobile result widths and marks copy that may be
  truncated by a search interface.
- Saves server-derived history and idempotent favorites for authenticated users.
- Exports plain text and CSV while neutralizing spreadsheet formula prefixes.

The catalog contains 20 title formulas, 15 description formulas, and 40
weighted scoring terms. Every formula includes a concise intent action or topic
marker and a visible tone cue. Selection cycles through formula identities
before taking another variant from the same formula. Comparison titles and
decision-support descriptions visibly use supplied alternatives and balance
them across formula variants. Complete optional clauses provide additional
variations; the generator does not clip copy or add synthetic numeric suffixes
to force uniqueness.

## Architecture

```text
browser -> routes -> controllers -> services -> Sequelize/MySQL
                         |              |
                         |              +-> scoring and width estimates
                         +-> JSON catalog repository
```

`src/catalog/catalog.json` is the only runtime source for formulas and scoring
terms. `JsonTemplateCatalogRepository` validates and exposes that file.
Application data in MySQL is limited to users, sessions, generation history,
and favorite snippets.

The main responsibilities are separated by concern:

- `SnippetGenerator` renders and ranks complete candidate copy.
- `generatorRules` owns intent/tone vocabulary and documented length policies;
  `candidateSelection` owns formula and alternative balancing; `snippetText`
  owns token formatting.
- `OptimizationScorer` calculates the inspectable drafting score.
- `SerpPreviewBuilder` estimates display width and escapes preview markup.
- Controller classes validate request boundaries and coordinate persistence.

The browser uses the same boundary: `GeneratorApiClient` owns HTTP requests,
`GeneratorView` owns DOM rendering, `SnippetExporter` owns file creation, and
`GeneratorController` coordinates state and events. The entry script only wires
those components together.

## Requirements

- Node.js 22.13+ or 24.x
- npm 11
- MySQL 8.4 or a compatible managed MySQL service

## Local setup

Create the database first, then install and configure the application:

```bash
mysql -u root -p -e "CREATE DATABASE seo_snippets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm ci
cp .env.example .env
npm run db:setup
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` in place of `cp`.
Update the database settings and set a unique `SESSION_SECRET` containing at
least 32 characters before starting the server.

The default URL is `http://localhost:3000`. `GET /health/live` checks the
process, while `GET /health/ready` verifies database connectivity.

### Portfolio demo account

`npm run db:setup` idempotently creates or repairs a public account that uses
the same password verification and session flow as every registered user. It
has the ordinary `user` role and no administrative access:

```text
Email:    demo@example.com
Password: OrbitDemo2026!
```

The login page displays these credentials for portfolio reviewers. Treat its
saved generations and favorites as public, shared data; never store private
information in this account.

### Docker development environment

```bash
docker compose up --build
```

Compose starts MySQL, applies migrations, provisions the demo account, and
launches the development server. Its database credentials and session key are
local development defaults and must not be used for another environment.

## Catalog maintenance

1. Edit `src/catalog/catalog.json`.
2. Validate the complete catalog:

   ```bash
   npm run catalog:validate
   ```

3. Run the tests, review representative output, and restart the application.

The validator checks the schema, allowed placeholders, formula uniqueness,
required primary-keyword, intent, and tone placeholders, and exact scoring-term
category sizes. No database synchronization step is required.

## Database migrations

Apply all pending changes with:

```bash
npm run db:setup
```

This applies schema migrations and then converges the documented demo account
to its non-admin role and public password. Use `npm run db:migrate` when only
schema changes are intended, such as migration rollback verification in CI.

For container deployments, the dedicated migration image includes the CLI and
migration files while the production image contains runtime dependencies only:

```bash
docker build --target migration -t seo-snippets:migration .
docker run --rm --env-file .env seo-snippets:migration
docker build --target production -t seo-snippets:production .
```

Run one migration job before replacing application instances. Database rollback
commands are available for development, but production rollback should follow a
reviewed release plan and a verified backup.

## Quality checks

```bash
npm run catalog:validate
npm run check
npm run audit:production
```

`npm run check` verifies formatting, lint rules, the test suite, aggregate
coverage, and focused per-file coverage floors for authentication, middleware,
browser lifecycle, and preview rendering. Coverage is measured across server and
browser source files; only the executable server bootstrap and the CLI
configuration adapter are excluded. The generator tests exercise every title
style, description style, length profile, intent, and tone, including bulk
uniqueness and clock-independence when the year option is off.

## Operational and security notes

- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- State-changing requests require a synchronizer CSRF token.
- Successful registration and login rotate the session identifier.
- Dynamic responses are not cached; unhashed static assets use ETag
  revalidation so deployments do not leave browsers on stale scripts.
- Requests are schema-validated and rate limited at authentication and API
  boundaries.
- Saved generations are regenerated on the server, and ownership is checked
  before a favorite is created.
- The session store uses the same database TLS policy as Sequelize and is
  explicitly closed during graceful shutdown.
- Helmet applies a self-only content security policy with request-specific
  nonces.

Terminate TLS before the application, configure `TRUST_PROXY` only for known
proxy hops, use a managed secret source, monitor the readiness endpoint, and
maintain tested database backups.

## Limitations

- Scores compare drafts against explicit heuristics; they do not predict search
  ranking, traffic, or click-through rate.
- Width measurements approximate rendering and cannot guarantee how a search
  engine will display a result.
- Long user-supplied terms may make complete copy exceed a selected character
  band. Only overflow can use the marked fallback; an under-length selection is
  treated as a catalog calibration error. The tested normal range is a primary
  keyword up to 20 characters, audience and location up to 32 characters each,
  and each secondary keyword up to 40 characters. For comparison titles, the
  primary keyword plus the longest supplied alternative may total 28 characters
  for short copy, 35 for medium copy, or 36 for long copy. Every style, intent,
  tone, and length combination must stay inside its selected band throughout a
  short-to-boundary input corpus. Longer fields remain accepted, but a result
  that cannot fit complete prose is explicitly marked as overflow.
- Every result should receive an editorial and factual review before publishing.

## License

[MIT](LICENSE)
