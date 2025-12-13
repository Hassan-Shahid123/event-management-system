/**
 * Notification Repository
 * 
 * Handles all database operations for notifications table.
 */

import { getDatabase, saveDatabase } from '../database';
import { Notification, NotificationType } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new notification
 */
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    eventId?: string
): Promise<Notification> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = new Date().toISOString();

    db.run(
        `INSERT INTO notifications (id, user_id, event_id, type, title, message, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, userId, eventId || null, type, title, message, created_at]
    );

    saveDatabase();

    return {
        id,
        user_id: userId,
        event_id: eventId,
        type,
        title,
        message,
        is_read: false,
        created_at
    };
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
    const db = await getDatabase();

    const result = db.exec(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        user_id: row[1] as string,
        event_id: row[2] as string | undefined,
        type: row[3] as NotificationType,
        title: row[4] as string,
        message: row[5] as string,
        is_read: Boolean(row[6]),
        created_at: row[7] as string
    }));
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
    const db = await getDatabase();

    const result = db.exec(
        `SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC`,
        [userId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        user_id: row[1] as string,
        event_id: row[2] as string | undefined,
        type: row[3] as NotificationType,
        title: row[4] as string,
        message: row[5] as string,
        is_read: false,
        created_at: row[7] as string
    }));
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
    const db = await getDatabase();

    const result = db.exec(
        `SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0`,
        [userId]
    );

    if (!result[0] || !result[0].values || result[0].values.length === 0) {
        return 0;
    }

    const row = result[0].values[0];
    if (!row || row[0] === undefined) {
        return 0;
    }

    return row[0] as number;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
    const db = await getDatabase();

    db.run(
        `UPDATE notifications SET is_read = 1 WHERE id = ?`,
        [notificationId]
    );

    saveDatabase();
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
    const db = await getDatabase();

    db.run(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
        [userId]
    );

    saveDatabase();
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    const db = await getDatabase();

    db.run(
        `DELETE FROM notifications WHERE id = ?`,
        [notificationId]
    );

    saveDatabase();
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllUserNotifications(userId: string): Promise<void> {
    const db = await getDatabase();

    db.run(
        `DELETE FROM notifications WHERE user_id = ?`,
        [userId]
    );

    saveDatabase();
}

/**
 * Delete old notifications (older than specified days)
 */
export async function deleteOldNotifications(daysOld: number = 30): Promise<void> {
    const db = await getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    db.run(
        `DELETE FROM notifications WHERE created_at < ?`,
        [cutoffDate.toISOString()]
    );

    saveDatabase();
}

/**
 * Get notifications for a specific event
 */
export async function getEventNotifications(eventId: string): Promise<Notification[]> {
    const db = await getDatabase();

    const result = db.exec(
        `SELECT * FROM notifications WHERE event_id = ? ORDER BY created_at DESC`,
        [eventId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        user_id: row[1] as string,
        event_id: row[2] as string | undefined,
        type: row[3] as NotificationType,
        title: row[4] as string,
        message: row[5] as string,
        is_read: Boolean(row[6]),
        created_at: row[7] as string
    }));
}
