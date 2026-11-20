# Deploy on Ubuntu + Apache

Apache serves HTTPS and forwards to the Node app (port 3001). The Node app serves the website and API and talks to MySQL.
Replace `crm.example.com` with your domain. Run commands as a sudo user.

## 1. Install the software (once)

```bash
sudo apt update
sudo apt install -y apache2 mysql-server git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Create the database (once)

```bash
sudo mysql
```
```sql
CREATE DATABASE party_crm CHARACTER SET utf8mb4;
CREATE USER 'crm_app'@'localhost' IDENTIFIED BY 'CHOOSE-A-STRONG-PASSWORD';
GRANT ALL PRIVILEGES ON party_crm.* TO 'crm_app'@'localhost';
EXIT;
```

## 3. Get the code and configure (once)

```bash
cd /var/www
sudo git clone https://github.com/Moni-10/crm-management.git
sudo chown -R $USER:$USER crm-management
cd crm-management
cp .env.example .env
nano .env
```

In `.env` set: `DB_USER=crm_app`, `DB_PASSWORD`, `NODE_ENV=production`, `TRUST_PROXY=1`,
`JWT_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`),
and `ADMIN_EMAIL` / `ADMIN_PASSWORD` (the first admin, created automatically on first start).

## 4. Build, migrate, start

```bash
npm ci
npm run build
npm run migrate
pm2 start server/index.js --name crm
pm2 save
pm2 startup        # run the command it prints, so the app restarts after a reboot
```

Check: `curl http://127.0.0.1:3001/api/health` shows `"status":"ok"`.

## 5. Load the Excel leads (once)

Copy the 18 `.xlsx` files from `output_small/` to the server (e.g. `scp -r output_small user@server:/home/user/`), then:

```bash
npm run import:leads -- /home/user/output_small
```

Every row is stored exactly as in Excel, repeats included (314,945 rows, about a minute). Re-running skips files already loaded.
Check: `sudo mysql -e "SELECT COUNT(*) FROM party_crm.leads;"` shows 314945.

## 6. Apache (HTTPS reverse proxy)

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo nano /etc/apache2/sites-available/crm.conf
```
```apache
<VirtualHost *:80>
    ServerName crm.example.com
    ProxyPreserveHost On
    LimitRequestBody 62914560
    RequestHeader set X-Forwarded-Proto "http"
    ProxyPass / http://127.0.0.1:3001/
    ProxyPassReverse / http://127.0.0.1:3001/
</VirtualHost>
```
```bash
sudo a2ensite crm.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d crm.example.com      # adds HTTPS and the redirect
sudo ufw allow 'Apache Full'                  # if the firewall is on
```

Open `https://crm.example.com` and sign in with the admin from `.env`, then change the password (profile menu > Settings).
Create more people under **Users** and set what they can do under **Roles & permissions** (default **User** role = view only).

## Every update after that

```bash
cd /var/www/crm-management
git pull
npm ci
npm run build
npm run migrate        # applies only new database changes; safe to run every time
pm2 restart crm
```

`npm start` refuses to run while migrations are pending. `npm run migrate:status` shows what is applied.

## Backups (the in-app JSON backup does NOT include leads)

```bash
npm run db:backup      # writes backups/party_crm-<timestamp>.sql.gz
```

Daily at 02:00 (`crontab -e`): `0 2 * * * cd /var/www/crm-management && npm run db:backup`. Copy the files off the server.

Restore into an empty database:

```bash
gunzip -c backups/<file>.sql.gz | mysql -u crm_app -p party_crm
```

## Handy

- Lost the admin login: `npm run user:create -- --email you@example.com --name "You" --role admin`
- Logs: `pm2 logs crm`. Status: `pm2 status`.
- Never run `npm run db:import` on a server with real data: it replaces the CRM tables.
- Rotate any password that has ever been committed to git or shared in chat.
