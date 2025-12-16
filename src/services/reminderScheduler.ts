/**
 * Reminder Scheduler Service - DSL-Driven
 * 
 * Periodically checks for upcoming events and sends reminders based on
 * admin-configured notification rules (little language DSL).
 * 
 * INSTEAD OF:
 *   Hard-coded logic like "if (hoursUntil === 24) sendEmail()"
 * 
 * WE USE:
 *   Database rules like "SEND email WHEN hours_until = 24"
 *   Parsed by DSL interpreter → evaluated dynamically
 * 
 * SOFTWARE CONSTRUCTION BENEFITS:
 * - Admins change timing/channels without deployment
 * - Grammar defines business logic, not code
 * - Testable: mock rules, events, time
 * - Extensible: add new fields/operators without changing scheduler
 */

import * as eventRepository from '../repositories/eventRepository';
import * as notificationRuleRepository from '../repositories/notificationRuleRepository';
import * as registrationRepository from '../repositories/registrationRepository';
import * as userRepository from '../repositories/userRepository';
import { Event } from '../types';
import { parse } from '../query';
import { Interpreter } from '../query/interpreter';
import { sendEmail, formatEventReminderEmail } from './emailService';
import { getDatabase, reloadDatabase, saveDatabase } from '../database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper to format datetime for display
 */
function formatDateTime(isoString: string): string {
    return new Date(isoString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

/**
 * Get all users who already received this reminder (optimized - single query)
 */
async function getSentReminderUsers(eventId: string, ruleId: string): Promise<Set<string>> {
    const db = await getDatabase();
    const result = db.exec(
        `SELECT user_id FROM sent_reminders WHERE event_id = ? AND rule_id = ?`,
        [eventId, ruleId]
    );
    
    const userIds = new Set<string>();
    if (result.length > 0 && result[0].values.length > 0) {
        for (const row of result[0].values) {
            userIds.add(row[0] as string);
        }
    }
    return userIds;
}

/**
 * Batch mark multiple reminders as sent (optimized)
 */
async function batchMarkRemindersSent(eventId: string, ruleId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    
    const db = await getDatabase();
    for (const userId of userIds) {
        db.run(
            `INSERT OR IGNORE INTO sent_reminders (id, event_id, rule_id, user_id) VALUES (?, ?, ?, ?)`,
            [uuidv4(), eventId, ruleId, userId]
        );
    }
    // Save to disk once after all inserts
    saveDatabase();
}

// Track when we last ran cleanup
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Once per day

/**
 * Clean up sent_reminders for completed/cancelled events
 * Runs once per day to prevent database bloat
 */
async function cleanupCompletedEventReminders(): Promise<number> {
    const now = Date.now();
    if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
        return 0; // Skip if we ran cleanup recently
    }
    
    lastCleanupTime = now;
    
    const db = await getDatabase();
    const result = db.exec(`
        DELETE FROM sent_reminders 
        WHERE event_id IN (
            SELECT id FROM events 
            WHERE status IN ('COMPLETED', 'CANCELLED')
        )
    `);
    
    // Get count of deleted rows
    const deletedCount = db.exec(`SELECT changes() as deleted`);
    const count = deletedCount[0]?.values[0]?.[0] as number || 0;
    
    if (count > 0) {
        // Save to disk after cleanup
        saveDatabase();
        console.log(`[Scheduler] Cleaned up ${count} reminder records for completed/cancelled events`);
    }
    
    return count;
}

// Scheduler interval reference
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

// Scheduler configuration
const SCHEDULER_INTERVAL_MS = 60 * 1000; // 60 seconds for testing

/**
 * Scans upcoming events and evaluates DSL rules to send reminders.
 * 
 * NEW APPROACH:
 * 1. Load enabled rules from database
 * 2. For each event, evaluate each rule
 * 3. If rule matches, send notification on specified channels
 * 
 * @returns count of events checked and reminders sent
 * 
 * Demonstrates: Interpreter pattern - rules are data, not code
 */
export async function checkAndSendReminders(): Promise<{
    checked: number;
    remindersSent: number;
    rulesEvaluated: number;
}> {
    // Reload database to get latest data from disk
    await reloadDatabase();
    
    // Clean up reminders for completed events (runs daily)
    await cleanupCompletedEventReminders();
    
    const upcomingEvents = await eventRepository.getUpcomingEvents();
    const rules = await notificationRuleRepository.getEnabledRules();
    const now = new Date();
    
    let remindersSent = 0;
    let rulesEvaluated = 0;

    console.log(`[Scheduler] Checking ${upcomingEvents.length} events against ${rules.length} rules`);

    for (const event of upcomingEvents) {
        const eventStart = new Date(event.start_datetime);
        const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Skip if event has already started
        if (hoursUntilEvent <= 0) {
            continue;
        }

        // Evaluate each rule against this event
        for (const rule of rules) {
            rulesEvaluated++;
            
            try {
                // Parse DSL rule into AST
                const ast = parse(rule.rule_text);
                
                console.log(`[Scheduler] Evaluating rule "${rule.name}" against event "${event.title}":`);
                console.log(`[Scheduler]   - Event start: ${event.start_datetime}`);
                console.log(`[Scheduler]   - Hours until: ${Math.floor(hoursUntilEvent)}`);
                console.log(`[Scheduler]   - Rule text: ${rule.rule_text}`);
                
                // Evaluate rule condition against event
                const result = Interpreter.evaluateRule(ast, event, now);
                
                console.log(`[Scheduler]   - Should send: ${result.shouldSend}, Reason: ${result.reason}`);
                
                // If rule matched, send to users who haven't received this reminder yet
                if (result.shouldSend) {
                    // Get all confirmed registrations for this event
                    const registrations = await registrationRepository.getConfirmedRegistrations(event.id);
                    
                    if (registrations.length === 0) {
                        console.log(
                            `[Scheduler] ⊘ Rule "${rule.name}" matched for "${event.title}" ` +
                            `but no users are registered yet (waiting for registrations)`
                        );
                        continue;
                    }
                    
                    // Optimized: Get all sent reminders in one query instead of 100 separate queries
                    const alreadySentUsers = await getSentReminderUsers(event.id, rule.id);
                    
                    // Prepare batch of emails to send
                    const emailTasks: Array<{
                        user: any;
                        userId: string;
                        email: string;
                        promise: Promise<void>;
                    }> = [];
                    
                    let skippedCount = 0;
                    
                    for (const reg of registrations) {
                        // Check if already sent (from Set - O(1) lookup)
                        if (alreadySentUsers.has(reg.user_id)) {
                            skippedCount++;
                            continue;
                        }
                        
                        const user = await userRepository.getUserById(reg.user_id);
                        if (user && user.email) {
                            const emailHtml = formatEventReminderEmail(
                                event.title,
                                formatDateTime(event.start_datetime),
                                hoursUntilEvent <= 24 
                                    ? `in ${Math.round(hoursUntilEvent)} hours`
                                    : `in ${Math.round(hoursUntilEvent / 24)} days`
                            );
                            
                            // Create email promise but don't await yet (parallel sending)
                            const emailPromise = sendEmail(
                                user.email,
                                `Reminder: ${event.title}`,
                                emailHtml
                            );
                            
                            emailTasks.push({
                                user,
                                userId: reg.user_id,
                                email: user.email,
                                promise: emailPromise
                            });
                        }
                    }
                    
                    if (emailTasks.length > 0) {
                        console.log(
                            `[Scheduler] 📧 Sending ${emailTasks.length} emails in parallel for "${event.title}"...`
                        );
                        
                        // Send all emails in parallel with error handling
                        const results = await Promise.allSettled(
                            emailTasks.map(task => task.promise)
                        );
                        
                        // Process results and collect successful sends
                        const successfulUserIds: string[] = [];
                        let successCount = 0;
                        let failCount = 0;
                        
                        for (let i = 0; i < results.length; i++) {
                            const result = results[i];
                            const task = emailTasks[i];
                            
                            if (result.status === 'fulfilled') {
                                // Email sent successfully
                                successfulUserIds.push(task.userId);
                                successCount++;
                                remindersSent++;
                            } else {
                                // Email failed - log error but continue
                                console.error(
                                    `[Scheduler] ✗ Failed to send email to ${task.email}:`,
                                    result.reason
                                );
                                failCount++;
                            }
                        }
                        
                        // Batch mark all successful sends in database (single disk write)
                        if (successfulUserIds.length > 0) {
                            await batchMarkRemindersSent(event.id, rule.id, successfulUserIds);
                        }
                        
                        console.log(
                            `[Scheduler] ✓ Rule "${rule.name}" matched for "${event.title}" ` +
                            `(${Math.floor(hoursUntilEvent)}h until) → ` +
                            `Sent ${successCount} emails` +
                            (failCount > 0 ? `, ${failCount} failed` : '') +
                            (skippedCount > 0 ? `, ${skippedCount} skipped (already sent)` : '')
                        );
                    } else if (skippedCount > 0) {
                        console.log(
                            `[Scheduler] ⊘ Rule "${rule.name}" matched for "${event.title}" ` +
                            `but all ${skippedCount} registered users already received this reminder`
                        );
                    }
                }
            } catch (error) {
                console.error(
                    `[Scheduler] ✗ Failed to evaluate rule "${rule.name}" for event "${event.title}":`,
                    error
                );
            }
        }
    }

    return {
        checked: upcomingEvents.length,
        remindersSent,
        rulesEvaluated
    };
}

/**
 * Starts periodic DSL-driven reminder checks.
 * 
 * @param intervalMs optional interval in milliseconds (default 60 seconds).
 * 
 * Loads rules from database on each check, so admins can add/modify rules
 * without restarting the server.
 */
export function startScheduler(intervalMs: number = SCHEDULER_INTERVAL_MS): void {
    if (schedulerInterval) {
        console.log('[Scheduler] Reminder scheduler is already running');
        return;
    }

    console.log(`[Scheduler] Starting reminder scheduler (interval: ${intervalMs}ms)`);

    // Run initial check immediately
    checkAndSendReminders()
        .then(result => {
            console.log(
                `[Scheduler] Initial check: ${result.checked} events, ` +
                `${result.rulesEvaluated} rule evaluations, ${result.remindersSent} sent`
            );
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
 * Runs a one-off reminder check without altering the interval.
 */
export async function triggerManualCheck(): Promise<{
    checked: number;
    remindersSent: number;
    rulesEvaluated: number;
}> {
    console.log('[Scheduler] Manual check triggered');
    return checkAndSendReminders();
}
