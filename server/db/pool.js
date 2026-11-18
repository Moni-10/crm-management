import mysql from 'mysql2/promise';
import { config } from '../config.js';

// Dates come back as plain strings; timestamps are stored in UTC.
export const pool = mysql.createPool({
    ...config.db,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    timezone: 'Z'
});
