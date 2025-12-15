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
import * as notificationService from './notificationService';
import { Event } from '../types';
import { parse } from '../query';
import { Interpreter } from '../query/interpreter';
import { RuleNode } from '../query/ast';

// Track which reminders have been sent to avoid duplicates
// Key format: "eventId-ruleId" (e.g., "abc123-rule456")
const sentReminders: Set<string> = new Set();

// Scheduler interval reference
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

// Scheduler configuration
const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

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
                const ast = parse(rule.rule_text) as RuleNode;
                
                // Evaluate rule condition against event
                const result = Interpreter.evaluateRule(ast, event, now);
                
                // If rule matched and we haven't sent this reminder yet
                const reminderKey = `${event.id}-${rule.id}`;
                if (result.shouldSend && !sentReminders.has(reminderKey)) {
                    // Send notification on all specified channels
                    await notificationService.sendEventReminderWithChannels(
                        event,
                        result.channels,
                        hoursUntilEvent
                    );
                    
                    sentReminders.add(reminderKey);
                    remindersSent++;
                    
                    console.log(
                        `[Scheduler] ✓ Rule "${rule.name}" matched for "${event.title}" ` +
                        `(${Math.floor(hoursUntilEvent)}h until) → Sent via ${result.channels.join(', ')}`
                    );
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
 * @param intervalMs optional interval in milliseconds (default 15 minutes).
 * 
 * Loads rules from database on each check, so admins can add/modify rules
 * without restarting the server.
 */
export function startScheduler(intervalMs: number = SCHEDULER_INTERVAL_MS): void {
    if (schedulerInterval) {
        console.log('[Scheduler] Already running');
        return;
    }

    console.log(`[Scheduler] Starting DSL-driven reminder scheduler (interval: ${intervalMs / 60000} minutes)...`);

    // Run immediately on start
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
    rulesEvaluated: number;
}> {
    console.log('[Scheduler] Manual check triggered');
    return checkAndSendReminders();
}
