# Deploying to a server

One Node process serves the web app and the API (port 3001) and talks to MySQL. Everything below is run in the project folder.

## 1. One-time server setup

**Needs:** Node.js 20+, MySQL 8 (or MariaDB 10.6+), git. Optional: pm2 (keeps the app running) and nginx/Caddy (HTTPS).

Create the database user (do not run the app as MySQL `root`):

```sql
CREATE DATABASE party_crm CHARACTER SET utf8mb4;
CREATE USER 'crm_app'@'localhost' IDENTIFIED BY '<strong password>';
GRANT ALL PRIVILEGES ON party_crm.* TO 'crm_app'@'localhost';
```

Get the code and configure:

```bash
git clone https://github.com/Moni-10/crm-management.git && cd crm-management
cp .env.example .env        # then edit it
```

In `.env` set at least: `DB_USER`, `DB_PASSWORD`, `NODE_ENV=production`, `JWT_SECRET` (long random string; the app refuses to start in production without it), `ADMIN_EMAIL` and `ADMIN_PASSWORD` (the first admin, created automatically on the first start when there are no users), and `TRUST_PROXY=1` if you use nginx/Caddy.

## 2. First deploy (and every update)

```bash
git pull
npm ci
npm run build
npm run migrate      # creates / updates all tables; safe to run every time
pm2 start server/index.js --name crm      # first time
pm2 restart crm                            # later updates
```

`npm start` refuses to run while migrations are pending, so a forgotten `npm run migrate` is reported instead of silently breaking.
`npm run migrate:status` lists what is applied.

## 3. Load the Excel leads (once)

Copy the 18 `.xlsx` files from `output_small/` to the server, then:

```bash
npm run import:leads -- "/path/to/output_small"
```

Every row is stored exactly as in Excel (repeats included): 314,945 rows in about a minute. Re-running skips files that are already loaded. Check: `SELECT COUNT(*) FROM leads;` = 314945.

## 4. Users and roles

- Sign in with the first admin, change the password (profile menu > Settings), then open **Users** and **Roles & permissions** from the menu.
- Built-in roles: **Admin** (everything) and **User** (view-only). Create custom roles and tick what they may do.
- Create an account from the command line if you are locked out:
  `npm run user:create -- --email jane@example.com --name "Jane" --role admin`

## 5. nginx (HTTPS reverse proxy), minimal example

```nginx
server {
    server_name crm.example.com;
    client_max_body_size 60m;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # add TLS with certbot: certbot --nginx -d crm.example.com
}
```

## 6. Backups (important: the in-app JSON backup does NOT include leads)

```bash
npm run db:backup        # writes backups/party_crm-<timestamp>.sql.gz using mysqldump
```

Schedule it (cron example, daily 02:00) and copy the files off the server:
`0 2 * * * cd /path/to/crm-management && npm run db:backup`

Restore into an empty database:

```bash
gunzip -c backups/<file>.sql.gz | mysql -u crm_app -p party_crm
```

## 7. Things to know

- `npm run db:import` loads `database/party_crm.sql` and **replaces** the CRM tables. Use it only on a brand-new database, never on a server with real data.
- Logging in is throttled (8 failed attempts per 10 minutes per address and email).
- Disabling a user or changing their password signs them out immediately.
- Rotate any password that has ever been committed to git or shared in chat.
