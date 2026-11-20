import crypto from 'node:crypto';
import 'dotenv/config';

// In production JWT_SECRET is mandatory. Elsewhere a random one is used (everyone is logged out on every restart).
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in .env. Refusing to start in production.');
    process.exit(1);
}
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not set in .env - logins will not survive a server restart.');
}

export const config = {
    port: Number(process.env.API_PORT) || 3001,
    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'party_crm'
    },
    auth: {
        jwtSecret,
        tokenTtl: process.env.TOKEN_TTL || '7d',
        // The first admin account, created automatically when the users table is empty.
        adminName: process.env.ADMIN_NAME || 'Admin',
        adminEmail: (process.env.ADMIN_EMAIL || 'admin@mmw.local').toLowerCase(),
        adminPassword: process.env.ADMIN_PASSWORD || ''
    }
};
