/**
 * Notification Rules Repository
 * 
 * Data access layer for notification rules stored in database.
 * Admin-configured DSL rules that determine when to send notifications.
 */

import { getDatabase, saveDatabase } from '../database/connection';
import { getAllRows, getFirstRow } from '../utils/dbHelpers';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationRule {
    id: string;
    name: string;
    description?: string;
    rule_text: string;
    enabled: number; // SQLite uses INTEGER for boolean (1 = true, 0 = false)
    created_by: string;
    created_at: string;
    updated_at: string;
}

/**
 * Maps database row to NotificationRule object
 */
function mapRowToRule(row: any[]): NotificationRule {
    return {
        id: row[0] as string,
        name: row[1] as string,
        description: row[2] as string | undefined,
        rule_text: row[3] as string,
        enabled: row[4] as number,
        created_by: row[5] as string,
        created_at: row[6] as string,
        updated_at: row[7] as string
    };
}

/**
 * Gets all enabled notification rules
 * 
 * @returns Array of enabled rules
 * 
 * Used by scheduler to determine which rules to evaluate
 */
export async function getEnabledRules(): Promise<NotificationRule[]> {
    const db = await getDatabase();
    const result = db.exec('SELECT * FROM notification_rules WHERE enabled = 1 ORDER BY created_at DESC');
    const rows = getAllRows(result);
    return rows.map(mapRowToRule);
}

/**
 * Gets all notification rules (admin view)
 * 
 * @returns Array of all rules
 */
export async function getAllRules(): Promise<NotificationRule[]> {
    const db = await getDatabase();
    const result = db.exec('SELECT * FROM notification_rules ORDER BY created_at DESC');
    const rows = getAllRows(result);
    return rows.map(mapRowToRule);
}

/**
 * Gets a single notification rule by ID
 * 
 * @param id - Rule ID
 * @returns Rule or null if not found
 */
export async function getRuleById(id: string): Promise<NotificationRule | null> {
    const db = await getDatabase();
    const result = db.exec('SELECT * FROM notification_rules WHERE id = ?', [id]);
    const row = getFirstRow(result);
    return row ? mapRowToRule(row) : null;
}

/**
 * Creates a new notification rule
 * 
 * @param data - Rule data
 * @returns Created rule
 * 
 * Precondition: rule_text is valid DSL syntax
 * Precondition: name is unique
 */
export async function createRule(data: {
    name: string;
    description?: string;
    rule_text: string;
    created_by: string;
    enabled?: boolean;
}): Promise<NotificationRule> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    const enabled = data.enabled !== false ? 1 : 0;

    db.run(
        `INSERT INTO notification_rules (id, name, description, rule_text, enabled, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.name, data.description || null, data.rule_text, enabled, data.created_by, now, now]
    );
    
    saveDatabase();

    return {
        id,
        name: data.name,
        description: data.description,
        rule_text: data.rule_text,
        enabled,
        created_by: data.created_by,
        created_at: now,
        updated_at: now
    };
}

/**
 * Updates an existing notification rule
 * 
 * @param id - Rule ID
 * @param data - Updated fields
 * @returns Updated rule
 */
export async function updateRule(
    id: string,
    data: {
        name?: string;
        description?: string;
        rule_text?: string;
        enabled?: boolean;
    }
): Promise<NotificationRule> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
        fields.push('name = ?');
        values.push(data.name);
    }
    if (data.description !== undefined) {
        fields.push('description = ?');
        values.push(data.description);
    }
    if (data.rule_text !== undefined) {
        fields.push('rule_text = ?');
        values.push(data.rule_text);
    }
    if (data.enabled !== undefined) {
        fields.push('enabled = ?');
        values.push(data.enabled ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);

    const db = await getDatabase();
    db.run(
        `UPDATE notification_rules SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    
    saveDatabase();
    
    const updated = await getRuleById(id);
    if (!updated) {
        throw new Error(`Rule ${id} not found after update`);
    }
    
    return updated;
}

/**
 * Deletes a notification rule
 * 
 * @param id - Rule ID
 */
export async function deleteRule(id: string): Promise<void> {
    const db = await getDatabase();
    db.run('DELETE FROM notification_rules WHERE id = ?', [id]);
    saveDatabase();
}

/**
 * Enables or disables a notification rule
 * 
 * @param id - Rule ID
 * @param enabled - True to enable, false to disable
 */
export async function setRuleEnabled(id: string, enabled: boolean): Promise<void> {
    const db = await getDatabase();
    db.run(
        'UPDATE notification_rules SET enabled = ?, updated_at = ? WHERE id = ?',
        [enabled ? 1 : 0, new Date().toISOString(), id]
    );
    saveDatabase();
}
