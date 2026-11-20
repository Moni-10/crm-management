# CRM Plan: DB, Migrations, Roles/Permissions, Excel Import

## Current state (audited 2026-11-20)

| Area | Status |
|---|---|
| Stack | React 19 + Vite, Express 5, `mysql2` |
| MySQL connected? | **Yes in code** (`server/db/pool.js`, `.env` -> `DB_*`). Not running here: WAMP services (MySQL/MariaDB) are Stopped, and there is no `.env` yet. |
| Schema | `server/db/schema.sql` (`CREATE TABLE IF NOT EXISTS`) + hand-written `COLUMN_UPGRADES` list in `migrate.js`, run **automatically on every server start**. No versioned migrations, no rollback, no history. |
| Login | Done: JWT, bcrypt-style hashing, login throttle, first admin from `.env`. |
| Roles | **Only `users.role` string**; only `admin` is checked (`requireAdmin` on `/api/admin`, `PUT /api/company`). Every other logged-in user can read AND write everything. No permissions, no user-management UI. |
| Calls table | Exists (`calls`): paged server-side search (`/api/calls/query`), chunked bulk insert (`/api/calls/import`, 5000/req), page `CallingDetails.jsx`. Good base for the Excel data. |
| Excel data | `output/ALL_REAL_DATA_part001-010.xlsx` (100k rows each, 311,020 rows total), `JS_CALLING` (3,729), `NEW_WHAT_S_APP_CALLING_PRINTOUT` (196). Columns: sno, date, machine, LOCATION, COMING, CONTACT, EMAIL ID. Messy: contacts like `8208728112, 9922623237`, numbers vs text, `\xa0`, blank dates, junk in the date column. The original split had 2 cells mismatch in `output/`; `output_small/` verified MATCH, so use **`output_small`** (15 parts). |

Note: the data is raw lead/call data (phone, machine, location), not "Parties". It maps best to a new **`leads`** table (not `calls`/`parties`), see Phase 4.

## Phases

### Phase 0: Environment (small)
1. Start WAMP MySQL/MariaDB. `npm install`, `npm run setup` (creates `.env`).
2. Confirm the app boots and `/api/health` returns ok.
3. Decide: keep `database/party_crm.sql` dump import or drop it in favor of migrations.

### Phase 1: Real migrations (deploy = one command)
- Add a `schema_migrations` table and numbered files in `server/db/migrations/` (`001_baseline.sql`, `002_rbac.sql`, `003_leads.sql`, ...).
- New `npm run migrate` (applies pending, in order, in a transaction where possible, records each) and `npm run migrate:status`.
- Baseline = current schema + the `COLUMN_UPGRADES`, written idempotently so existing DBs adopt it safely.
- Remove auto-migrate from server startup (server just checks "migrations up to date").
- Server deploy: `git pull && npm ci && npm run build && npm run migrate && npm start`.

### Phase 2: Roles and permissions
- Tables: `roles`, `permissions` (code like `parties.view`, `parties.edit`), `role_permissions`, plus per-user optional overrides (`user_permissions`).
- Seed two roles: **admin** (all permissions) and **user** (view only, every `*.view`), `users.role_id` FK. Admin is locked and cannot be edited or deleted.
- Backend: `requirePermission('leads.view')` middleware on every route (GET -> view, POST/PUT/DELETE -> create/edit/delete/import/export). Permissions returned with `/auth/me`.
- Frontend: `can('x.edit')` helper; hide menu items, buttons and routes the user lacks.
- Admin UI: **Users** page (create/disable/reset password, assign role) and **Roles & Permissions** page (matrix of modules x view/create/edit/delete/import/export; create custom roles).
- Safety: cannot remove the last admin; permission checks are enforced server-side, not only hidden in the UI.

### Phase 3: Profile the Excel data (before loading)
- Script profiles all three sheets: row counts, blank/dup phone numbers, formats, date garbage, distinct machine and location values.
- Decide the cleaning rules (below) and show you a summary and sample for approval.

### Phase 4: Data model for 315k rows
- New table `leads`: `id` BIGINT AUTO_INCREMENT, `source_sheet`, `source_row` (sno), `lead_date`, `machine`, `location_raw`, `city`, `state` (best-effort normalized), `coming_note`, `mobile_primary`, `mobile_all` (JSON or child table `lead_contacts`), `email`, `import_batch_id`, timestamps.
- Indexes: `mobile_primary`, `machine`, `city`, `state`, `lead_date`; **FULLTEXT** on machine/location/email for fast search. Child `lead_contacts(lead_id, mobile)` so multi-number cells are all searchable by phone.
- Table `import_batches` (file, rows read/inserted/skipped, who, when) so an import can be audited or rolled back.

### Phase 5: Importer (CLI, not the browser)
- `npm run import:leads -- <folder>`: streams each xlsx (no full load into memory), cleans/normalizes, batch-inserts 5k rows per `INSERT`, per-file transaction, resumable and idempotent via `(source_sheet, source_row)` unique key so re-runs never duplicate.
- Phone cleaning: strip spaces and `\xa0`, split multiple numbers, keep digits, validate length, flag bad ones.
- Output report: inserted / skipped / invalid, and a rejects CSV for review. Verify afterwards: DB count == 311,020 + 3,729 + 196 (minus documented skips).

### Phase 6: Leads screen (smooth with big data)
- Server-side pagination (50/page), never loads all rows; debounced search (phone, email, machine, location, text), filters: machine, state/city, date range, has-email, has-multiple-numbers, source sheet; sort; filter counts; Excel/CSV export of the **filtered** result (streamed, permission `leads.export`).
- Row detail drawer; optional "convert to Party" action.
- Gated by the Phase 2 permissions.

### Phase 7: Hardening and deploy
- Performance check with the full dataset (EXPLAIN on search queries, indexes tuned), `.env.example` restored, deploy doc (Node + MySQL + pm2/nginx), backup note (`backup` JSON is not suitable for 300k+ rows: switch to `mysqldump`).
- Replace stray root scripts (`make_admins.js`, etc.) with seed migrations.

## Open decisions (I'll default to these unless you say otherwise)
1. Excel -> new **`leads`** table, separate from Parties/Calls. 
2. Import runs as a **CLI command** on the server (browser upload kept only for small files).
3. Custom roles allowed beyond admin/user (permission matrix).
4. Use `output_small/` as the source files (verified identical to the original workbook).

## Suggested order
Phase 0 -> 1 -> 2 (foundation, independently valuable) -> 3 -> 4 -> 5 -> 6 -> 7.
