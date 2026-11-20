// Leads: the Excel records, stored exactly as they appear in the sheets (no merging, no cleaning).
// *_raw / original columns hold the cell text unchanged; lead_phones is only a search index built from `contact`.
export async function up(conn) {
    await conn.query(`CREATE TABLE IF NOT EXISTS import_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_file VARCHAR(255) NOT NULL,
        source_sheet VARCHAR(100) NOT NULL,
        first_row INT NOT NULL,
        rows_read INT NOT NULL DEFAULT 0,
        rows_inserted INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        started_at DATETIME NOT NULL,
        finished_at DATETIME NULL,
        UNIQUE KEY uq_batch_file (source_file, source_sheet)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS leads (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NULL,
        source_sheet VARCHAR(100) NOT NULL,
        source_row INT NOT NULL,
        sno TEXT NULL,
        date_text TEXT NULL,
        lead_date DATE NULL,
        machine TEXT NULL,
        location TEXT NULL,
        coming TEXT NULL,
        contact TEXT NULL,
        email TEXT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uq_lead_source (source_sheet, source_row),
        KEY idx_lead_date (lead_date),
        KEY idx_lead_machine (machine(60)),
        KEY idx_lead_location (location(60)),
        KEY idx_lead_coming (coming(60)),
        FULLTEXT KEY ft_lead_text (machine, location, coming, email, date_text)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // One row per phone number found in a lead's contact cell (a cell can hold several numbers).
    await conn.query(`CREATE TABLE IF NOT EXISTS lead_phones (
        lead_id BIGINT UNSIGNED NOT NULL,
        phone VARCHAR(20) NOT NULL,
        PRIMARY KEY (lead_id, phone),
        KEY idx_phone (phone),
        CONSTRAINT fk_phone_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
