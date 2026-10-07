import cron from 'node-cron';
import { getDatabase } from '../db/client.ts';
import { getOfficeConfig } from '../db/repo.ts';
import {
  aggregateDailyRecap,
  formatDailyInternsReport,
  formatMentorGroupRecap,
} from '../services/recap.ts';
import { sendWhatsAppMessage } from '../services/whatsapp.ts';
import { dispatchEmailRecap } from '../services/email.ts';

export const DEFAULT_CRON_SCHEDULE = '0 18 * * *'; // 18:00 WIB daily

export interface ICronTask {
  start: () => void;
  stop: () => void;
  triggerNow: () => Promise<void>;
}

/**
 * Standard daily recap execution job.
 */
export async function executeDailyRecapTask(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const db = getDatabase();
  const config = getOfficeConfig(db);
  const summary = aggregateDailyRecap(db, today);

  if (config) {
    // 1. WhatsApp broadcasts
    if (config.waGroupInternsJid) {
      const internText = formatDailyInternsReport(summary);
      await sendWhatsAppMessage(config.waGroupInternsJid, internText);
    }
    if (config.waGroupMentorsJid) {
      const mentorText = formatMentorGroupRecap(summary);
      await sendWhatsAppMessage(config.waGroupMentorsJid, mentorText);
    }

    // 2. Email delivery
    await dispatchEmailRecap(summary, {
      supervisorEmail: config.emailAtasan,
    });
  }
}

/**
 * Initializes the automated 18:00 WIB cron runner.
 */
export function initCronScheduler(
  customHandler?: () => Promise<void>,
  schedule = DEFAULT_CRON_SCHEDULE
): ICronTask {
  const handler = customHandler || executeDailyRecapTask;

  const job = cron.schedule(
    schedule,
    async () => {
      try {
        await handler();
      } catch (err) {
        console.error('Scheduled recap error:', err);
      }
    },
    {
      timezone: 'Asia/Jakarta',
    }
  );

  return {
    start: () => job.start(),
    stop: () => job.stop(),
    triggerNow: async () => {
      await handler();
    },
  };
}
