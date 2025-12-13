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
 * Creates a notification for a confirmed registration.
 * @param userId requires existing user id.
 * @param event requires event context for messaging.
 * @returns created notification; effects: inserts notification row.
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
 * Creates a notification indicating the user was waitlisted.
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
 * Creates a notification when a user is promoted from waitlist to confirmed.
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
 * Creates a notification when a user is unregistered from an event.
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
 * Notifies all registrants that an event was cancelled.
 * @param event requires the cancelled event.
 * @returns void; effects: inserts notifications for each registration.
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
 * Notifies all registrants about an event update.
 * @param event event being updated.
 * @param changes human-readable description of changes.
 * @returns void; effects: inserts notifications for each registration.
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
 * Sends reminders to confirmed registrants for an upcoming event.
 * @param event requires upcoming event.
 * @param hoursUntilEvent indicates approximate time until start for message text.
 * @returns void; effects: inserts reminder notifications for confirmed attendees.
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
 * Lists notifications for a user ordered by recency.
 * @returns notifications; effects: read-only.
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
    return notificationRepository.getUserNotifications(userId);
}

/**
 * Lists unread notifications for a user.
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
    return notificationRepository.getUnreadNotifications(userId);
}

/**
 * Counts unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.getUnreadCount(userId);
}

/**
 * Marks a single notification as read.
 * @param notificationId requires existing notification id.
 */
export async function markAsRead(notificationId: string): Promise<void> {
    return notificationRepository.markAsRead(notificationId);
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllAsRead(userId: string): Promise<void> {
    return notificationRepository.markAllAsRead(userId);
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    return notificationRepository.deleteNotification(notificationId);
}

/**
 * Deletes all notifications for a user.
 */
export async function deleteAllUserNotifications(userId: string): Promise<void> {
    return notificationRepository.deleteAllUserNotifications(userId);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats an ISO datetime for notification text.
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
 * Deletes notifications older than the specified age.
 * @param daysOld age threshold in days (default 30).
 */
export async function cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    return notificationRepository.deleteOldNotifications(daysOld);
}
