/**
 * Notification Service
 * 
 * Handles notification creation and delivery logic.
 * Currently stores notifications in-app. Can be extended to support
 * email/SMS by adding providers (e.g., Nodemailer, Twilio).
 */

import * as notificationRepository from '../repositories/notificationRepository';
import * as registrationRepository from '../repositories/registrationRepository';
import { Notification, Event } from '../types';

// ============================================================================
// REGISTRATION NOTIFICATIONS
// ============================================================================

/**
 * Notify user of registration confirmation
 */
export async function notifyRegistrationConfirmed(
    userId: string,
    event: Event
): Promise<Notification> {
    return notificationRepository.createNotification(
        userId,
        'REGISTRATION_CONFIRMED',
        'Registration Confirmed',
        `You have successfully registered for "${event.title}" scheduled on ${formatDateTime(event.start_datetime)}.`,
        event.id
    );
}

/**
 * Notify user they've been added to waitlist
 */
export async function notifyWaitlisted(
    userId: string,
    event: Event
): Promise<Notification> {
    return notificationRepository.createNotification(
        userId,
        'REGISTRATION_WAITLISTED',
        'Added to Waitlist',
        `The event "${event.title}" is currently full. You've been added to the waitlist and will be notified if a spot opens up.`,
        event.id
    );
}

/**
 * Notify user they've been promoted from waitlist
 */
export async function notifyPromotedFromWaitlist(
    userId: string,
    event: Event
): Promise<Notification> {
    return notificationRepository.createNotification(
        userId,
        'PROMOTED_FROM_WAITLIST',
        'Spot Available - You\'re Confirmed!',
        `Great news! A spot opened up for "${event.title}". You've been moved from the waitlist and are now confirmed to attend.`,
        event.id
    );
}

/**
 * Notify user they've been unregistered
 */
export async function notifyUnregistered(
    userId: string,
    event: Event
): Promise<Notification> {
    return notificationRepository.createNotification(
        userId,
        'UNREGISTERED',
        'Registration Cancelled',
        `You have been unregistered from "${event.title}".`,
        event.id
    );
}

// ============================================================================
// EVENT NOTIFICATIONS
// ============================================================================

/**
 * Notify all registered users of event cancellation
 */
export async function notifyEventCancelled(event: Event): Promise<void> {
    const registrations = await registrationRepository.getEventRegistrations(event.id);

    for (const reg of registrations) {
        await notificationRepository.createNotification(
            reg.user_id,
            'EVENT_CANCELLED',
            'Event Cancelled',
            `Unfortunately, the event "${event.title}" scheduled for ${formatDateTime(event.start_datetime)} has been cancelled.`,
            event.id
        );
    }
}

/**
 * Notify all registered users of event update
 */
export async function notifyEventUpdated(
    event: Event,
    changes: string
): Promise<void> {
    const registrations = await registrationRepository.getEventRegistrations(event.id);

    for (const reg of registrations) {
        await notificationRepository.createNotification(
            reg.user_id,
            'EVENT_UPDATED',
            'Event Updated',
            `The event "${event.title}" has been updated: ${changes}`,
            event.id
        );
    }
}

/**
 * Send reminder for an upcoming event
 */
export async function sendEventReminder(
    event: Event,
    hoursUntilEvent: number
): Promise<void> {
    const registrations = await registrationRepository.getConfirmedRegistrations(event.id);

    let timeText: string;
    if (hoursUntilEvent <= 1) {
        timeText = 'starting soon';
    } else if (hoursUntilEvent <= 24) {
        timeText = `in ${Math.round(hoursUntilEvent)} hours`;
    } else {
        const days = Math.round(hoursUntilEvent / 24);
        timeText = days === 1 ? 'tomorrow' : `in ${days} days`;
    }

    for (const reg of registrations) {
        await notificationRepository.createNotification(
            reg.user_id,
            'EVENT_REMINDER',
            'Event Reminder',
            `Reminder: "${event.title}" is ${timeText}. Don't forget to attend!`,
            event.id
        );
    }
}

// ============================================================================
// USER NOTIFICATION MANAGEMENT
// ============================================================================

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
    return notificationRepository.getUserNotifications(userId);
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
    return notificationRepository.getUnreadNotifications(userId);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.getUnreadCount(userId);
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
    return notificationRepository.markAsRead(notificationId);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
    return notificationRepository.markAllAsRead(userId);
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    return notificationRepository.deleteNotification(notificationId);
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllUserNotifications(userId: string): Promise<void> {
    return notificationRepository.deleteAllUserNotifications(userId);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format datetime for display in notifications
 */
function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Clean up old notifications (maintenance task)
 */
export async function cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    return notificationRepository.deleteOldNotifications(daysOld);
}
