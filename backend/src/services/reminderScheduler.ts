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
 * Scans upcoming events and sends due reminders.
 * @returns count of events checked and reminders sent; effects: reads events, writes notifications, updates in-memory sentReminders.
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
 * Starts periodic reminder checks.
 * @param intervalMs optional interval in milliseconds (default 15 minutes).
 * @returns void; effects: schedules recurring timer, triggers immediate check once.
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
 * Stops the periodic reminder checks.
 */
export function stopScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Scheduler] Reminder scheduler stopped');
    }
}

/**
 * Indicates whether the scheduler is currently running.
 */
export function isSchedulerRunning(): boolean {
    return schedulerInterval !== null;
}

/**
 * Clears the sent-reminders cache (useful for tests or resets).
 */
export function clearReminderCache(): void {
    sentReminders.clear();
    console.log('[Scheduler] Reminder cache cleared');
}

/**
 * Returns the count of reminder keys tracked in memory.
 */
export function getSentRemindersCount(): number {
    return sentReminders.size;
}

/**
 * Runs a one-off reminder check without altering the interval.
 */
export async function triggerManualCheck(): Promise<{
    checked: number;
    remindersSent: number;
}> {
    console.log('[Scheduler] Manual check triggered');
    return checkAndSendReminders();
}
