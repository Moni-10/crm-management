import { pool } from './server/db/pool.js';
import crypto from 'crypto';
import 'dotenv/config';

async function makeAdmins() {
    try {
        // Create Muskan and Jaspal as admin users
        const admins = [
            { email: 'muskan@mmw.in', name: 'Muskan', password: 'Muskan@123' },
            { email: 'jaspal@mmw.in', name: 'Jaspal', password: 'Jaspal@123' }
        ];

        console.log('\n🔧 Creating admin users...\n');
        for (const admin of admins) {
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [admin.email]);

            if (existing.length > 0) {
                console.log(`⚠️  ${admin.name} already exists as user`);
                // Update role to admin
                await pool.query(
                    'UPDATE users SET role = ? WHERE email = ?',
                    ['admin', admin.email]
                );
                console.log(`✅ Updated ${admin.name} role to ADMIN`);
            } else {
                // Create new admin user
                const userId = `user_${crypto.randomBytes(8).toString('hex')}`;
                const passwordHash = crypto.createHash('sha256').update(admin.password).digest('hex');

                await pool.query(
                    'INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                    [userId, admin.name, admin.email, passwordHash, 'admin']
                );
                console.log(`✅ Created ${admin.name} as ADMIN`);
                console.log(`   Email: ${admin.email}`);
                console.log(`   Password: ${admin.password}\n`);
            }
        }

        console.log('✅ All admin users processed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

makeAdmins();
