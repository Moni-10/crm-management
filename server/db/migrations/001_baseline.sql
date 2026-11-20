CREATE TABLE IF NOT EXISTS salespersons (
    id VARCHAR(40) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    nickname VARCHAR(100) NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150) NULL,
    department VARCHAR(100) NULL,
    employee_id VARCHAR(50) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_sp_name (full_name),
    INDEX idx_sp_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parties (
    id VARCHAR(40) PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    party_name VARCHAR(150) NOT NULL,
    party_nickname VARCHAR(100) NULL,
    primary_mobile VARCHAR(20) NOT NULL,
    alternative_mobile VARCHAR(20) NULL,
    whatsapp_number VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    party_type VARCHAR(30) NOT NULL DEFAULT 'Customer',
    assigned_salesperson VARCHAR(40) NULL,
    party_status VARCHAR(30) NOT NULL DEFAULT 'Active',
    follow_up_date DATE NULL,
    full_address TEXT NULL,
    area VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    location_name VARCHAR(200) NULL,
    maps_url TEXT NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    client_requirements TEXT NULL,
    remarks TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_party_company (company_name),
    INDEX idx_party_mobile (primary_mobile),
    INDEX idx_party_city (city),
    CONSTRAINT fk_party_salesperson FOREIGN KEY (assigned_salesperson)
        REFERENCES salespersons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS machines (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    quantity INT NOT NULL DEFAULT 1,
    purchase_date DATE NULL,
    party_id VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_machine_party (party_id),
    CONSTRAINT fk_machine_party FOREIGN KEY (party_id)
        REFERENCES parties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotations (
    id VARCHAR(40) PRIMARY KEY,
    quotation_number VARCHAR(50) NOT NULL,
    quotation_date DATE NULL,
    party_id VARCHAR(40) NULL,
    company_name VARCHAR(200) NULL,
    party_name VARCHAR(150) NULL,
    salesperson_name VARCHAR(150) NULL,
    mobile VARCHAR(20) NULL,
    address TEXT NULL,
    gst_tax DECIMAL(6,2) NOT NULL DEFAULT 0,
    payment_terms TEXT NULL,
    delivery_terms TEXT NULL,
    notes TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_quotation_number (quotation_number),
    INDEX idx_quotation_party (party_id),
    CONSTRAINT fk_quotation_party FOREIGN KEY (party_id)
        REFERENCES parties(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id VARCHAR(40) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    machine_name VARCHAR(200) NULL,
    machine_model VARCHAR(100) NULL,
    specifications TEXT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
    amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_item_quotation FOREIGN KEY (quotation_id)
        REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(40) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    `date` DATE NOT NULL,
    event_type VARCHAR(30) NOT NULL DEFAULT 'meeting',
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    party_id VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_event_date (`date`),
    CONSTRAINT fk_event_party FOREIGN KEY (party_id)
        REFERENCES parties(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS activity (
    id VARCHAR(40) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS company (
    id TINYINT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(20) NOT NULL DEFAULT '',
    tagline TEXT NULL,
    address TEXT NULL,
    phones TEXT NULL,
    email VARCHAR(150) NULL,
    website VARCHAR(200) NULL,
    gstin VARCHAR(30) NULL,
    iec VARCHAR(30) NULL,
    logo MEDIUMTEXT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Calling Data: one row per phone call. Party is free text so Excel sheets import even when the party is not in the CRM yet.
CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(40) PRIMARY KEY,
    party_name VARCHAR(200) NOT NULL,
    nickname VARCHAR(150) NULL,
    contact_person VARCHAR(150) NULL,
    mobile VARCHAR(30) NULL,
    whatsapp VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    address TEXT NULL,
    call_date DATE NULL,
    call_time VARCHAR(8) NULL,
    duration INT NULL,
    machine_interest VARCHAR(200) NULL,
    machine_number VARCHAR(100) NULL,
    requirement TEXT NULL,
    call_type VARCHAR(30) NOT NULL DEFAULT 'Follow-up',
    handled_by VARCHAR(150) NULL,
    notes TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_call_date (call_date),
    INDEX idx_call_city (city),
    INDEX idx_call_party (party_name),
    INDEX idx_call_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
