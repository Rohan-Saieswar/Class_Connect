# Section-Connect

A workspace-based class portal for SRM University–AP. Workspace branding is generated from each workspace's section, and class pages require an authenticated, approved membership.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set a long random `AUTH_SECRET`.
3. Create a Google OAuth 2.0 Web application client and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI for local development; use your deployed HTTPS callback URL in production.
4. Enable the Google Classroom API in that same Google Cloud project. Add `GOOGLE_CLASSROOM_REDIRECT_URI` to `.env` and register its exact value (locally, `http://localhost:3000/api/classroom/callback`) as another authorized redirect URI on the same OAuth client. Classroom scopes are requested only from the optional **My Google Classroom** connection flow.
5. Set a dedicated random `CLASSROOM_TOKEN_ENCRYPTION_KEY` in production. Development falls back to `AUTH_SECRET`. To enable scheduled sync, configure `CRON_SECRET`, `APP_BASE_URL`, and `CLASSROOM_SYNC_INTERVAL_SECONDS`, then run `npm run classroom:sync-worker` as a separate server process. The worker calls `/api/internal/google-classroom-sync` with `Authorization: Bearer <CRON_SECRET>`; it never runs in the browser.
6. Push the Prisma schema with `npm run db:push`.
7. Seed demo data with `npm run db:seed`. This is idempotent, preserves existing data, and reads `INITIAL_CR_EMAIL_1` and `INITIAL_CR_EMAIL_2` from `.env`.
8. Start the app with `npm run dev`.

The legacy full demo reset is `npm run db:seed:reset`; it deletes existing records and must only be used with a disposable database. CRs can approve students and faculty from the **Manage members** view in their workspace.

Google Classroom connections, caches, submissions, grades, and notifications are scoped by authenticated user and workspace. OAuth tokens are encrypted server-side; only the connected user can read their cache. Google Drive permissions remain enforced by Google when opening original resources.
Sign-in uses Google OAuth and accepts verified `@srmap.edu.in` accounts. A successful Google sign-in does not grant class access by itself; the account also needs an approved workspace membership. New SRM identities are created on first sign-in, but remain outside class workspaces until approved.

## Verification

- `npm run build` creates the production build.
- `npm test` runs the workspace isolation suite.