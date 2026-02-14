# SEO Title + Meta Description Generator (Deterministic SaaS)

Production-ready SEO snippet SaaS built with deterministic templates and scoring logic.

## Stack

- Backend: Node.js, Express.js, MySQL, Sequelize ORM
- Security: `helmet`, `express-rate-limit`, `csurf`, `express-session`, MySQL session store
- Auth: Email/password with `bcrypt`
- Frontend: EJS server rendering, Vanilla JS, Plain CSS
- Design: Cinematic dark UI inspired by Netflix/SpaceX aesthetics

## Core Features

- Landing page with cinematic hero, feature blocks, comparison, FAQ, and FAQ JSON-LD
- Generator workspace with 3-column layout:
  - Config panel (intent/tone/style/length/location/audience/bulk)
  - Generated results (10 or 20 titles, 5 metas, CTR badges, copy/save)
  - Live SERP preview (desktop/mobile, keyword highlighting, pixel progress)
- Deterministic generation engine (no AI APIs)
- Deterministic CTR scoring
- Character and pixel-width validation
- Save generation history and favorite snippets (authenticated users)
- Export `.txt` and CSV
- Compare 2 titles
- Schema-ready headline suggestions

## Deterministic CTR Score Rules

Score contributions:

- Contains number: +10
- Contains year: +8
- Contains power word: +5 each
- Length between 50–60 chars: +15
- Primary keyword at beginning: +10
- Intent signal match: +10

Badge mapping:

- `90+`: Elite
- `75-89`: Strong
- `60-74`: Good
- `<60`: Weak

## Project Structure

```text
.
├── migrations/
├── seeders/
├── src/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── public/
│   │   ├── css/
│   │   └── js/
│   ├── routes/
│   ├── services/
│   └── views/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Create MySQL database

```sql
CREATE DATABASE seo_snippet_saas;
```

3. Create environment file

```bash
cp .env.example .env
```

(Windows PowerShell)

```powershell
Copy-Item .env.example .env
```

4. Update `.env` values for local MySQL credentials.

5. Run migrations and seeders

```bash
npm run db:migrate
npm run db:seed
```

6. Start development server

```bash
npm run dev
```

App runs at: `http://localhost:3000`

## API Routes

All state-changing routes require CSRF token.

- `POST /api/generate`
- `POST /api/preview`
- `POST /api/save` (auth required)
- `POST /api/favorite/:id` (auth required)
- `GET /api/templates`
- `GET /api/history` (auth required)

## Auth Routes

- `POST /register`
- `POST /login`
- `POST /logout`

## Notes

- Anonymous users can generate snippets but cannot save/favorite.
- Session data is persisted in MySQL (`sessions` table).
- Seeders include:
  - 60 title templates
  - 30 meta templates
  - 104 power words

## Production Considerations

- Set strong `SESSION_SECRET` in `.env`
- Enable HTTPS and secure cookies in production
- Add database backup and monitoring
- Add automated tests in CI before deployment
