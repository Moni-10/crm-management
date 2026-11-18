# Run this project on a new computer

React (Vite) frontend + Express API + MySQL. Everything below is run from this folder (the one with `package.json`).

## 1. Needs
- **Node.js 20 or newer** (`node -v`)
- **MySQL 8 or MariaDB running** on port 3306 (WAMP, XAMPP, MySQL Server or Docker all work)
  - Default assumption: user `root`, empty password. If different, edit `.env` in step 3.

## 2. Install
```bash
npm install
```

## 3. Create the settings file
```bash
npm run setup
```
This creates `.env` (if missing) and prints the **login email and password** for the app. Note them down.
If MySQL needs a password, or runs on another port, edit `DB_PASSWORD` / `DB_PORT` in `.env`.

## 4. Load the data (so the app is not empty)
```bash
npm run db:import
```
This creates the `party_crm` database and fills it from `database/party_crm.sql` (parties, salespersons, machines,
quotations, events, company details). **It replaces whatever is in those tables**, so run it once on a fresh setup.
Skip this step to start with an empty database (the sample data can also be loaded later from Settings > Data).

## 5. Start the app
```bash
npm run dev
```
- Web app: http://localhost:5173
- API: http://localhost:3001 (started automatically by the same command)

Log in with the email and password printed in step 3 (also in `.env` as `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
Then change the password from the profile menu (top right) > Settings > Password.

## Troubleshooting
- **"Cannot reach the CRM server"**: MySQL is not running, or `.env` has the wrong `DB_*` values. Check the terminal where `npm run dev` runs; it prints the reason.
- **`ECONNREFUSED 127.0.0.1:3306`**: start MySQL.
- **`Access denied for user 'root'`**: set `DB_PASSWORD` in `.env`.
- **Port already in use**: stop the other program, or change `API_PORT` in `.env` (and the proxy target in `vite.config.js`).
- **Logged out after restarting the server**: `JWT_SECRET` is missing in `.env`; run `npm run setup` on a machine without `.env`, or add one.
- **Empty pages after login**: step 4 was skipped. Run `npm run db:import`.

## Useful commands
| Command | What it does |
|---|---|
| `npm run dev` | web app + API with live reload |
| `npm run seed` | demo data (only when the database is empty) |
| `npm run build` then `npm start` | production: one server on port 3001 serving the built app |
| `npm run db:import` | replace the CRM data with `database/party_crm.sql` |
