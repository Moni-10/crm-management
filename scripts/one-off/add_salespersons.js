import { pool } from '../../server/db/pool.js';
import 'dotenv/config';

const salespersons = [
    { id: 'team_sales_212', fullName: 'Pooja', nickname: 'Pooja', mobile: '9810011031', email: 'pooja@mmw.in', employeeId: 'EMP212' },
    { id: 'team_sales_213', fullName: 'Aman', nickname: 'Aman', mobile: '9810011032', email: 'aman@mmw.in', employeeId: 'EMP213' },
    { id: 'team_sales_214', fullName: 'Neha Khan', nickname: 'Neha', mobile: '9810011033', email: 'neha.khan@mmw.in', employeeId: 'EMP214' },
    { id: 'team_sales_215', fullName: 'Rajni', nickname: 'Rajni', mobile: '9810011034', email: 'rajni@mmw.in', employeeId: 'EMP215' }
];

async function addSalespersons() {
    try {
        for (const sp of salespersons) {
            // Check if exists
            const [existing] = await pool.query(
                'SELECT id FROM salespersons WHERE full_name = ?',
                [sp.fullName]
            );

            if (existing.length > 0) {
                console.log(`⚠️  ${sp.fullName} already exists, skipping...`);
                continue;
            }

            await pool.query(
                'INSERT INTO salespersons (id, full_name, nickname, mobile, email, department, employee_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [sp.id, sp.fullName, sp.nickname, sp.mobile, sp.email, 'Sales', sp.employeeId]
            );
            console.log(`✅ Added: ${sp.fullName}`);
        }
        console.log('\n✅ All salespersons added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addSalespersons();
