/**
 * Database Connection Module
 * 
 * Handles SQLite database initialization and connection.
 */

import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { createTablesSQL } from './schema';

let db: Database | null = null;
const DB_PATH = path.join(process.cwd(), 'campus_connect.db');

/**
 * Initialize and return the database connection.
 * Creates tables if they don't exist.
 */
export async function getDatabase(): Promise<Database> {
    if (db) {
        return db;
    }

    const SQL = await initSqlJs();
    
    // Try to load existing database from file
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('Database loaded from file');
    } else {
        db = new SQL.Database();
        console.log('New database created');
    }

    // Create tables
    db.exec(createTablesSQL);
    
    // Save to file
    saveDatabase();

    console.log('Database initialized successfully');
    return db;
}

/**
 * Save the database to file.
 */
export function saveDatabase(): void {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
        console.log('Database connection closed');
    }
}
