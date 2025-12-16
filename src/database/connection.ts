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
 * Initializes and returns the database connection.
 * @returns database instance; effects: loads from file or creates new, executes schema DDL, saves to disk.
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
 * Persists the in-memory database to disk.
 * @returns void; effects: exports and writes DB_PATH.
 */
export function saveDatabase(): void {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

/**
 * Reloads the database from disk (useful for schedulers to get latest data)
 * @returns void; effects: reloads database from file.
 */
export async function reloadDatabase(): Promise<void> {
    if (db && fs.existsSync(DB_PATH)) {
        const SQL = await initSqlJs();
        const buffer = fs.readFileSync(DB_PATH);
        const oldDb = db;
        db = new SQL.Database(buffer);
        oldDb.close();
    }
}

/**
 * Closes the database connection after saving.
 * @returns void; effects: saves DB, closes connection, sets global db to null.
 */
export function closeDatabase(): void {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
        console.log('Database connection closed');
    }
}
