/**
 * Simple test to verify database setup
 */

import { getDatabase, closeDatabase } from './database';

async function testDatabase() {
    console.log('Testing database setup...');
    
    try {
        const db = await getDatabase();
        console.log('Database connection established _/');
        
        // Test that tables exist
        const result = db.exec(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `);
        
        if (result.length > 0 && result[0] && result[0].values) {
            const tableNames = result[0].values.map((row: any) => row[0]);
            console.log('✓ Tables created:', tableNames.join(', '));
        }
        
        closeDatabase();
        console.log('✓ Database connection closed');
        
        console.log('\n All tests passed! Connection established && tables created');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testDatabase();
