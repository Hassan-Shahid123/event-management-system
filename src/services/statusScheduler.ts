/**
 * Event Status Scheduler
 *
 * Periodically synchronizes event `status` field with the current time:
 * - UPCOMING -> INPROGRESS when start_datetime <= now < end_datetime
 * - INPROGRESS -> COMPLETED when end_datetime <= now
 *
 * This runs as a background task and uses repository-level updates so
 * it does not require a requesting user.
 */

import * as eventRepository from '../repositories/eventRepository';
import { Event } from '../types';

let intervalRef: ReturnType<typeof setInterval> | null = null;
const DEFAULT_INTERVAL_MS = 60 * 1000; // 1 minute

async function syncStatuses(): Promise<{ checked: number; updated: number }> {
  const now = new Date();
  const all = await eventRepository.getAllEvents();
  let updated = 0;

  for (const ev of all) {
    // don't change cancelled events
    if (ev.status === 'CANCELLED' || ev.status === 'COMPLETED') continue;

    const start = new Date(ev.start_datetime);
    const end = new Date(ev.end_datetime);

    if (now >= end) {
      try {
        await eventRepository.changeEventStatus(ev.id, 'COMPLETED');
        updated++;
        console.log(`[StatusScheduler] Marked completed: ${ev.title}`);
      } catch (err) {
        console.error('[StatusScheduler] Failed to mark completed for', ev.id, err);
      }
    } else if (now >= start && now < end && ev.status !== 'INPROGRESS') {
      try {
        await eventRepository.changeEventStatus(ev.id, 'INPROGRESS');
        updated++;
        console.log(`[StatusScheduler] Marked in-progress: ${ev.title}`);
      } catch (err) {
        console.error('[StatusScheduler] Failed to mark in-progress for', ev.id, err);
      }
    } else if (now < start && ev.status !== 'UPCOMING') {
      // allow correcting a status back to UPCOMING only if it is not cancelled/completed
      try {
        await eventRepository.changeEventStatus(ev.id, 'UPCOMING');
        updated++;
        console.log(`[StatusScheduler] Reverted to upcoming: ${ev.title}`);
      } catch (err) {
        // ignore failures
      }
    }
  }

  return { checked: all.length, updated };
}

export function startStatusScheduler(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (intervalRef) return;
  console.log('[StatusScheduler] Starting (interval:', intervalMs, 'ms)');

  // Run once immediately
  syncStatuses().then(r => {
    console.log(`[StatusScheduler] Initial run: checked=${r.checked} updated=${r.updated}`);
  }).catch(err => console.error('[StatusScheduler] Initial run failed', err));

  intervalRef = setInterval(() => {
    syncStatuses().then(r => {
      if (r.updated > 0) {
        console.log(`[StatusScheduler] Updated ${r.updated} events`);
      }
    }).catch(err => console.error('[StatusScheduler] Run failed', err));
  }, intervalMs);
}

export function stopStatusScheduler(): void {
  if (!intervalRef) return;
  clearInterval(intervalRef);
  intervalRef = null;
  console.log('[StatusScheduler] Stopped');
}
