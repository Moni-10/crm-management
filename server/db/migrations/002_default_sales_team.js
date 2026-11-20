// Keep the default salesperson records aligned with the Sales Department team.
// Existing IDs are preserved so parties already assigned to the sample records stay assigned.
export async function up(conn) {
    const renames = [
        ['Rahul Sharma', 'Jaspal', 'Jaspal', 'jaspal@mmw.in'],
        ['Amit Verma', 'Pooja', 'Pooja', 'pooja@mmw.in'],
        ['Priya Singh', 'Aman', 'Aman', 'aman@mmw.in'],
        ['Karan Malhotra', 'Neha Khan', 'Neha', 'neha.khan@mmw.in'],
        ['Sunita Rao', 'Neha Mishra', 'Neha', 'neha.mishra@mmw.in'],
        ['Vikram Chauhan', 'Muskan', 'Muskan', 'muskan@mmw.in']
    ];
    for (const [oldName, fullName, nickname, email] of renames) {
        await conn.query(
            'UPDATE salespersons SET full_name = ?, nickname = ?, email = ?, department = ?, updated_at = NOW() WHERE full_name = ?',
            [fullName, nickname, email, 'Sales', oldName]
        );
    }

    const additional = [
        ['team_sales_207', 'Rajwant', '9810011026', 'rajwant@mmw.in', 'EMP207'],
        ['team_sales_208', 'Renu', '9810011027', 'renu@mmw.in', 'EMP208'],
        ['team_sales_209', 'Satish', '9810011028', 'satish@mmw.in', 'EMP209'],
        ['team_sales_210', 'Swati', '9810011029', 'swati@mmw.in', 'EMP210'],
        ['team_sales_211', 'Uma', '9810011030', 'uma@mmw.in', 'EMP211']
    ];
    for (const [id, name, mobile, email, employeeId] of additional) {
        await conn.query(
            `INSERT INTO salespersons (id, full_name, nickname, mobile, email, department, employee_id, created_at, updated_at)
             SELECT ?, ?, ?, ?, ?, 'Sales', ?, NOW(), NOW()
             WHERE NOT EXISTS (SELECT 1 FROM salespersons WHERE full_name = ?)`,
            [id, name, name, mobile, email, employeeId, name]
        );
    }
}

