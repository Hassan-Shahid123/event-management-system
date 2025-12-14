/**
 * Database Helper Utilities
 * 
 * Shared utilities for database query result processing.
 */

/**
 * Checks if a database query result has any rows.
 * @param result sql.js query result.
 * @returns true if result contains at least one row.
 */
export function hasResults(result: any[]): boolean {
  return result.length > 0 && !!result[0] && !!result[0].values && result[0].values.length > 0;
}

/**
 * Gets first row from query result or null.
 * @param result sql.js query result.
 * @returns first row array or null if no results.
 */
export function getFirstRow(result: any[]): any[] | null {
  if (!hasResults(result)) {
    return null;
  }
  return result[0].values[0] || null;
}

/**
 * Gets all rows from query result.
 * @param result sql.js query result.
 * @returns array of row arrays, empty if no results.
 */
export function getAllRows(result: any[]): any[][] {
  if (!hasResults(result)) {
    return [];
  }
  return result[0].values;
}

/**
 * Gets count value from COUNT(*) query.
 * @param result sql.js query result from COUNT query.
 * @returns count as number, 0 if no results.
 */
export function getCountValue(result: any[]): number {
  const row = getFirstRow(result);
  if (!row) {
    return 0;
  }
  return row[0] as number;
}
