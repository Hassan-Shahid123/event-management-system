/**
 * Notification Repository
 * 
 * Handles all database operations for notifications table.
 */

import { getDatabase, saveDatabase } from '../database';
import { Notification, NotificationType } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Inserts a notification row.
 * @param userId recipient user id.
 * @param type notification type.
 * @param title notification title.
 * @param message notification body.
 * @param eventId optional event reference.
 * @returns created notification; effects: writes to notifications table.
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
 * Returns all notifications for a user ordered by recency.
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
 * Returns unread notifications for a user.
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
 * Counts unread notifications for a user.
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
 * Marks a notification as read.
 * @param notificationId notification id.
 * @returns void; effects: updates is_read in notifications table.
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
 * Marks all notifications for a user as read.
 * @returns void; effects: updates is_read for matching rows.
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
 * Deletes a notification.
 * @returns void; effects: removes notification row.
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
 * Deletes all notifications for a user.
 * @returns void; effects: removes matching notification rows.
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
 * Deletes notifications older than the specified age.
 * @param daysOld threshold in days (default 30).
 * @returns void; effects: removes old notification rows.
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
 * Returns notifications related to an event.
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
