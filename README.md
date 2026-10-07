# GradConnect

A career platform for South African IT graduates: verified skills, a career readiness score, mentors and matched opportunities.

The stack follows **section 3.3 of the Project Plan and Design**:

| Layer | Technology (as specified) | Where |
| --- | --- | --- |
| Frontend | React + Vite + Tailwind CSS, shadcn/ui + Radix, TanStack Query, React Hook Form + Zod | `src/` |
| API | Node.js 20+ · Express · TypeScript | `backend/src/` |
| ORM | Prisma (schema-driven migrations, generated types) | `backend/prisma/` |
| Database | PostgreSQL 16 | `backend/prisma/schema.prisma` |
| Auth | JWT access tokens + rotating refresh tokens, Argon2id passwords, role-based access | `backend/src/services/tokens.ts`, `middleware/auth.ts` |
| Validation | Zod, **shared** by frontend and backend | `shared/schemas.ts` |

```
Browser (React SPA :5173) ──/api JSON──▶ Express API (:4000) ──Prisma──▶ PostgreSQL 16 (:5433)
```

## Run it

You need **Node.js 20.19 or newer** (`node -v`). PostgreSQL does **not** need to be installed: `npm run dev`
starts a real PostgreSQL 16 server for you (via the `embedded-postgres` package).

```bash
npm install      # first time only (installs frontend + backend)
npm run dev      # starts the database, the API and the website together
```

Open http://localhost:5173. The first start takes a little longer: it creates the database, runs the
Prisma migration and adds demo data.

Stop everything with **Ctrl+C**.

### Demo accounts

All use the password **password123**:

| Role | Email |
| --- | --- |
| Graduate | thandi.nkosi@example.co.za |
| Employer | lerato@technova.example |
| Mentor | sipho@example.co.za |
| Admin | admin@gradconnect.example |

Or create your own account on the Sign Up page.

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Database + API + website |
| `npm test` | Backend unit tests (Vitest) |
| `npm run typecheck` | TypeScript check of frontend and backend |
| `npm run db:reset` | Wipe the database, re-run migrations and demo data (while `npm run dev` is running) |
| `npm run db:studio -w backend` | Prisma Studio: browse the database in your browser |

**Using your own PostgreSQL or Docker instead?** Run `docker compose up -d` (or use any PostgreSQL 16),
then create `backend/.env` with `USE_EMBEDDED_DB=false` and your `DATABASE_URL`. See `backend/.env.example`.

## What works (MVP)

- **Sign up / log in / log out** with roles (graduate, employer, mentor). Passwords hashed with **Argon2id**.
  Terms and **POPIA consent** are required and their timestamps are stored.
- **Sessions:** a 15-minute **JWT access token** (kept in memory) and a 7-day **refresh token** in an httpOnly
  cookie. Every refresh **rotates** the token; if an old token is ever reused, the whole login is revoked
  (theft detection).
- **Onboarding** saves the profile and self-declared skills and calculates profile completeness.
- **Dashboard:** readiness score with breakdown, next actions, recent activity, verified skills, mentor
  sessions, recommended opportunities ranked by a personal match %.
- **Save** and **apply** for opportunities. Applying shows exactly what the employer receives and stores a
  frozen **profile snapshot (JSONB)** with an optional cover note (max 500 characters).
- **Skill verification** with project evidence, with explicit consent. Creates a **ProjectArtefact** and a
  tamper-evident **SkillsRecord** (SHA-256 evidence hash).
- **Profile** page with edit, skills, projects, verification history and portfolio links.
- **POPIA rights:** `GET /api/me/export` (download your data) and `DELETE /api/me` (delete your account).
- Notifications count on the bell icon.

**Not built yet** (they show the 404 page): Assessments, Learn, Mentors, Opportunities, Applications,
Notifications and Settings pages, and the employer, mentor and admin dashboards. The database tables for
assessments, learning modules and mentor sessions already exist with demo data.

From the design that is planned for later phases (section 3.2–3.3): Redis cache/queue, S3/MinIO file storage
(only the artefact's file name is stored today), background workers, Docker deployment to AWS/Azure.

## How the scores are calculated (`backend/src/services/scoring.ts`)

**Career readiness (0–100)**
- Profile completeness → up to 40 points
- 9 points per verified skill → up to 35 points
- Average progress across all learning modules → up to 25 points

**Match % for an opportunity**
- Each skill the opportunity asks for: verified = 1, self-declared = 0.5, missing = 0
- `match = 40 + 60 × points ÷ number of skills`

**Profile completeness:** 40% to start, +12% for each onboarding section filled in.

## Security (section 3.5)

| Requirement | How |
| --- | --- |
| Input validation on every request through Zod | `validateBody(schema)` middleware, same schemas as the forms |
| Parameterised queries via Prisma | All database access goes through Prisma |
| Rate limiting on authentication | `express-rate-limit`: 30 login/sign-up attempts per 15 minutes |
| CSRF protection | Refresh cookie is `SameSite=Strict` + required `X-Requested-With` header |
| Argon2id passwords | `@node-rs/argon2` |
| Short-lived access tokens, rotated revocable refresh tokens | `services/tokens.ts`, `RefreshToken` table |
| Role-based access control at middleware level | `requireRole("graduate")` in `routes/graduate.routes.ts` |
| Security headers | `helmet` |

## API endpoints

| Method | URL | What it does |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account (returns access token, sets refresh cookie) |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/refresh` | New access token, rotates the refresh cookie |
| POST | `/api/auth/logout` | Revoke the refresh token |
| GET | `/api/auth/me` | The logged-in user |
| GET | `/api/profile` | Profile, skills, projects, readiness |
| PUT | `/api/profile` | Edit headline, location, career interest, bio |
| POST | `/api/profile/onboarding` | Save the onboarding wizard |
| GET | `/api/profile/snapshot` | What an employer would receive if you applied now |
| GET | `/api/skills` | Skills catalogue (public) |
| GET | `/api/skills/mine` | My verified and self-declared skills |
| POST | `/api/skills/:id/verify` | Verify a skill with project evidence |
| GET | `/api/opportunities` | Opportunities with my match %, best first |
| GET | `/api/opportunities/:id` | One opportunity |
| POST | `/api/opportunities/:id/save` | Save / un-save |
| POST | `/api/opportunities/:id/apply` | Apply (stores a profile snapshot) |
| GET | `/api/applications` | My applications |
| GET | `/api/dashboard` | Everything the dashboard shows |
| GET | `/api/notifications` · `/unread-count` | Notifications |
| POST | `/api/notifications/read-all` | Mark all as read |
| GET | `/api/me/export` | POPIA: download all my data |
| DELETE | `/api/me` | POPIA: delete my account (password required) |
| GET | `/api/health` | Server check |

Errors are JSON, e.g. `401 {"error": "Incorrect email or password."}`.

## Data model (section 3.4)

`User` · `Profile` · `Skill` · `ProfileSkill` (self-declared) · `SkillsRecord` (verified, with evidence) ·
`ProjectArtefact` · `Assessment` · `AssessmentAttempt` · `LearningModule` · `ModuleEnrolment` · `Mentor` ·
`MentorSession` · `Employer` · `Opportunity` · `SavedOpportunity` · `Application` (with `profileSnapshot` JSONB) ·
`Activity` · `Notification` · `RefreshToken`.

See `backend/prisma/schema.prisma` (every model is commented) and the SQL in `backend/prisma/migrations/`.

## Project structure

```
shared/schemas.ts            Zod validation used by BOTH frontend and backend
backend/
  prisma/schema.prisma       data model
  prisma/migrations/         SQL migrations (applied with prisma migrate deploy)
  prisma/seed.ts             demo data
  scripts/embedded-db.ts     starts PostgreSQL 16 without installing it
  src/server.ts              starts the API
  src/app.ts                 Express app: security middleware + routes
  src/routes/                URL -> handler (auth, graduate, common)
  src/services/              business logic (auth, tokens, scoring, profile, skills, opportunities ...)
  src/middleware/            auth (JWT + roles), Zod validation, rate limits, CSRF, errors
  tests/                     Vitest unit tests
src/                         React frontend
  lib/api.ts                 API calls + access/refresh token handling
  lib/queries.ts             TanStack Query hooks
  lib/store.tsx              who is logged in
  components/ui/             shadcn/ui components (Radix)
  pages/                     one file per page
.github/workflows/ci.yml     CI: type-check, tests, build on every push
docker-compose.yml           optional PostgreSQL 16 in Docker
```

_Demo data — all companies, people and opportunities are fictional examples._
