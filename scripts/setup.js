// First-time setup on a new computer:  npm run setup
// Creates .env (with a fresh random JWT_SECRET and admin password) if it does not exist yet.
import crypto from 'node:crypto';
import fs from 'node:fs';

const envFile = new URL('../.env', import.meta.url);

if (fs.existsSync(envFile)) {
    console.log('.env already exists, leaving it as it is.');
    process.exit(0);
}

const adminPassword = crypto.randomBytes(9).toString('base64url');
const content = `# Created by npm run setup
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=party_crm
API_PORT=3001

# Login
JWT_SECRET=${crypto.randomBytes(48).toString('hex')}
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@mmw.local
ADMIN_PASSWORD=${adminPassword}
`;

fs.writeFileSync(envFile, content);
console.log('Created .env');
console.log('  Database: root with an empty password on 127.0.0.1:3306 (edit .env if yours is different)');
console.log('  Login email:    admin@mmw.local');
console.log(`  Login password: ${adminPassword}`);
