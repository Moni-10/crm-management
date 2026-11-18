# Party CRM (MMW Sales CRM)

React + Vite frontend, Express API, MySQL database. Everything is saved in MySQL, so every login and device sees the same data.

## Run

1. Start MySQL (WAMP).
2. Copy `.env.example` to `.env` and fill it in (database login, `JWT_SECRET`, first admin account).
3. `npm install`
4. `npm run dev` — starts the web app (http://localhost:5173) and the API (http://localhost:3001).
5. Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`, then change the password from the profile menu (top right) > Settings > Password.

The database and tables are created automatically on first start, and new columns are added to existing databases automatically (`server/db/migrate.js`).
Open `party_crm` in phpMyAdmin to browse or manage the data.

Optional demo data: `npm run seed` (or Settings > Data when logged in as admin).

## Features

- **Login**, profile menu, change password, log out. Light and dark theme (toggle in the header).
- **Dashboard**: stats, quotation pipeline, calendar, live weather, office map, recent parties and quotations, activity feed, today's reminders.
- **Parties**: search, filters, sortable table, full form with machines and "use my current location"; party page with call, WhatsApp, maps, directions, share (4 message types) and print/PDF.
- **Salespersons, Machines** (directory by machine type, plus all records), **Quotations** (discount, GST, validity, warranty, filters), **Calendar**, **Follow-ups**, **Reports** (4 reports with Excel export and print).
- **Quotation printing** on your pre-printed paper (data only) or as a full PDF.
- **Bulk upload** (CSV / Excel) and **Excel export** on Parties, Salespersons, Machines, Quotations.
- Global search (Ctrl/Cmd + K) across parties, people, machines, quotations and events.
- **Backup and restore** of the whole database as JSON.

## Layout

```
server/
  index.js            Express app + startup
  config.js           Reads .env
  auth/               password hashing, login tokens, auth middleware, first admin
  db/                 pool, schema.sql, auto-migration, sample-data seed
  lib/                generic CRUD, field mapping, activity log
  resources/          one file per table (fields, joins, child rows)
  routes/             /api/<resource> CRUD, /api/auth, /api/search, /api/backup, /api/activity, /api/admin
src/
  app/                App shell, routes, login guard
  api/                fetch client (adds the login token) + one API object per resource
  context/            AuthContext, ThemeContext
  components/         layout/ (sidebar, header, search, profile), ui/ (modal, toast, fields), bulk/, events/, quotation/
  pages/<Page>/       one folder per screen
  styles/             tokens.css (colours, light + dark), base.css (components), layout.css, pages.css
  utils/  hooks/  config/
```

## Adding a field

1. Add the column to `server/db/migrate.js` (`COLUMN_UPGRADES`) or `schema.sql` for a new table.
2. Add it to the field list in `server/resources/<table>.js`.
3. Use it in the page form — no other plumbing is needed.

## Design

Colours and fonts live in `src/styles/tokens.css`; change a token and light and dark both follow.
Direction: ink-navy chrome, the red from the MMW letterhead as the single accent, and the CMYK process colours as data hues.

## Moving old data

Earlier versions stored data only in the browser (IndexedDB). In that same browser open
**Backup and restore > Import from this browser** to copy it into MySQL.
