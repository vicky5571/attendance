import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { generateRecapHtmlTable } from './recap.ts';
import type { DailyRecapSummary } from '../../types/index.ts';

export interface EmailDispatchOptions {
  supervisorEmail?: string;
  transporter?: Transporter;
}

export interface EmailDispatchResult {
  sentCount: number;
  errors: string[];
}

interface MockSentMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Creates an in-memory mock transporter capturing sent emails for unit testing.
 */
export function createMockTransporter(): {
  transporter: Transporter;
  sentMessages: MockSentMessage[];
} {
  const sentMessages: MockSentMessage[] = [];
  const transporter = nodemailer.createTransport({
    name: 'mock',
    version: '1.0.0',
    send: (mail, callback) => {
      const data = mail.data;
      sentMessages.push({
        to: Array.isArray(data.to) ? data.to.join(',') : (data.to as string) || '',
        subject: data.subject || '',
        html: (data.html as string) || '',
      });
      callback(null, { messageId: `mock-${Date.now()}` });
    },
  } as unknown as nodemailer.TransportOptions);

  return { transporter, sentMessages };
}

/**
 * Factory for creating runtime Nodemailer transporter with Gmail SMTP.
 */
export function createDefaultTransporter(): Transporter {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback to JSON transport if SMTP credentials not provided
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

/**
 * Dispatches attendance recap emails to supervisor and all distinct mentors.
 */
export async function dispatchEmailRecap(
  summary: DailyRecapSummary,
  options?: EmailDispatchOptions
): Promise<EmailDispatchResult> {
  const transporter = options?.transporter || createDefaultTransporter();
  const supervisorEmail = options?.supervisorEmail || process.env.EMAIL_ATASAN;
  const sender = process.env.SMTP_USER || 'no-reply@indosat.com';

  let sentCount = 0;
  const errors: string[] = [];

  // 1. Dispatch global recap to supervisor
  if (supervisorEmail) {
    try {
      const globalHtml = generateRecapHtmlTable(summary);
      await transporter.sendMail({
        from: `"Indosat Attendance PWA" <${sender}>`,
        to: supervisorEmail,
        subject: `[Rekap Presensi Magang] ${summary.date} - Seluruh Divisi`,
        html: globalHtml,
      });
      sentCount++;
    } catch (err: unknown) {
      errors.push(`Supervisor email failed: ${(err as Error).message}`);
    }
  }

  // 2. Identify unique mentor emails and dispatch filtered digests
  const mentorEmails = new Set<string>();
  for (const item of summary.items) {
    if (item.emailMentor && item.emailMentor.trim() !== '') {
      mentorEmails.add(item.emailMentor.trim().toLowerCase());
    }
  }

  for (const mentorEmail of mentorEmails) {
    // Avoid double sending if mentor is also the supervisor
    if (supervisorEmail && mentorEmail === supervisorEmail.toLowerCase()) {
      continue;
    }

    try {
      const mentorHtml = generateRecapHtmlTable(summary, mentorEmail);
      await transporter.sendMail({
        from: `"Indosat Attendance PWA" <${sender}>`,
        to: mentorEmail,
        subject: `[Rekap Presensi Magang] ${summary.date} - Mentees Anda`,
        html: mentorHtml,
      });
      sentCount++;
    } catch (err: unknown) {
      errors.push(`Mentor (${mentorEmail}) email failed: ${(err as Error).message}`);
    }
  }

  return { sentCount, errors };
}
