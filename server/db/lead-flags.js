// Helper columns on `leads` that make the "has phone" and "repeated numbers" filters fast.
// Derived from lead_phones only; the Excel text columns are never changed. Run after every import.
export async function refreshLeadFlags(conn) {
    await conn.query(`UPDATE leads l
        LEFT JOIN (SELECT lead_id, COUNT(*) AS c FROM lead_phones GROUP BY lead_id) x ON x.lead_id = l.id
        SET l.phone_count = COALESCE(x.c, 0)`);
    await conn.query('UPDATE leads SET has_repeat = 0 WHERE has_repeat <> 0');
    await conn.query(`UPDATE leads l
        JOIN (SELECT DISTINCT p.lead_id FROM lead_phones p
              JOIN (SELECT phone FROM lead_phones GROUP BY phone HAVING COUNT(*) > 1) d ON d.phone = p.phone) r
          ON r.lead_id = l.id
        SET l.has_repeat = 1`);
}
