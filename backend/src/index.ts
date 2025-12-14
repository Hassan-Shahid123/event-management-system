/**
 * CampusConnect Event Management System
 * 
 * Main entry point - re-exports all public modules.
 * Provides access to types, database utilities, repositories, and services.
 * Effects: logs initialization message on module load.
 */

// Export types
export * from './types';

// Export database
export * from './database';

// Export repositories
export * from './repositories';

// Export services
export * from './services';

console.log('CampusConnect Event Management System - Ready!');
