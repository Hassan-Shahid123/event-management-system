/**
 * Reminder Scheduler Service
 * 
 * Periodically checks for upcoming events and sends reminders.
 * Runs as a background task using setInterval.
 * 
 * Reminder Schedule:
 * - 24 hours before event
 * - 1 hour before event
 */

import * as eventRepository from '../repositories/eventRepository';
import * as notificationService from './notificationService';
import { Event } from '../types';

// Track which reminders have been sent to avoid duplicates
// Key format: "eventId-reminderType" (e.g., "abc123-24h")
const sentReminders: Set<string> = new Set();

// Scheduler interval reference
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

// Scheduler configuration
const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check and send reminders for upcoming events
 */
export async function checkAndSendReminders(): Promise<{
    checked: number;
    remindersSent: number;
}> {
    const upcomingEvents = await eventRepository.getUpcomingEvents();
    const now = new Date();
    let remindersSent = 0;

    for (const event of upcomingEvents) {
        const eventStart = new Date(event.start_datetime);
        const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Skip if event has already started
        if (hoursUntilEvent <= 0) {
            continue;
        }

        // Send 24-hour reminder (between 24 and 23 hours before)
        const reminder24Key = `${event.id}-24h`;
        if (hoursUntilEvent <= 24 && hoursUntilEvent > 23 && !sentReminders.has(reminder24Key)) {
            try {
                await notificationService.sendEventReminder(event, 24);
                sentReminders.add(reminder24Key);
                remindersSent++;
                console.log(`[Scheduler] Sent 24h reminder for event: ${event.title}`);
            } catch (error) {
                console.error(`[Scheduler] Failed to send 24h reminder for ${event.title}:`, error);
            }
        }

        // Send 1-hour reminder (between 1 and 0 hours before)
        const reminder1Key = `${event.id}-1h`;
        if (hoursUntilEvent <= 1 && hoursUntilEvent > 0 && !sentReminders.has(reminder1Key)) {
            try {
                await notificationService.sendEventReminder(event, 1);
                sentReminders.add(reminder1Key);
                remindersSent++;
                console.log(`[Scheduler] Sent 1h reminder for event: ${event.title}`);
            } catch (error) {
                console.error(`[Scheduler] Failed to send 1h reminder for ${event.title}:`, error);
            }
        }
    }

    return {
        checked: upcomingEvents.length,
        remindersSent
    };
}

/**
 * Start the reminder scheduler
 * Runs every 15 minutes by default
 */
export function startScheduler(intervalMs: number = SCHEDULER_INTERVAL_MS): void {
    if (schedulerInterval) {
        console.log('[Scheduler] Already running');
        return;
    }

    console.log(`[Scheduler] Starting reminder scheduler (interval: ${intervalMs / 60000} minutes)...`);

    // Run immediately on start
    checkAndSendReminders()
        .then(result => {
            console.log(`[Scheduler] Initial check complete. Checked ${result.checked} events, sent ${result.remindersSent} reminders.`);
        })
        .catch(error => {
            console.error('[Scheduler] Initial check failed:', error);
        });

    // Then run at regular intervals
    schedulerInterval = setInterval(() => {
        checkAndSendReminders()
            .then(result => {
                if (result.remindersSent > 0) {
                    console.log(`[Scheduler] Sent ${result.remindersSent} reminders`);
                }
            })
            .catch(error => {
                console.error('[Scheduler] Check failed:', error);
            });
    }, intervalMs);
}

/**
 * Stop the reminder scheduler
 */
export function stopScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Scheduler] Reminder scheduler stopped');
    }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
    return schedulerInterval !== null;
}

/**
 * Clear sent reminders cache
 * Useful for testing or daily reset
 */
export function clearReminderCache(): void {
    sentReminders.clear();
    console.log('[Scheduler] Reminder cache cleared');
}

/**
 * Get sent reminders count (for monitoring)
 */
export function getSentRemindersCount(): number {
    return sentReminders.size;
}

/**
 * Manually trigger a reminder check (for testing)
 */
export async function triggerManualCheck(): Promise<{
    checked: number;
    remindersSent: number;
}> {
    console.log('[Scheduler] Manual check triggered');
    return checkAndSendReminders();
}
