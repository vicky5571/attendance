import { getDatabase } from '../../../../lib/db/client.ts';
import { getOfficeConfig } from '../../../../lib/db/repo.ts';
import {
  aggregateDailyRecap,
  formatDailyInternsReport,
  formatMentorGroupRecap,
} from '../../../../lib/services/recap.ts';
import { sendWhatsAppMessage } from '../../../../lib/services/whatsapp.ts';
import { dispatchEmailRecap } from '../../../../lib/services/email.ts';

interface PostRecapBody {
  date?: string;
  sendWhatsApp?: boolean;
  sendEmail?: boolean;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');
  const targetDate = dateParam || new Date().toISOString().split('T')[0];

  const db = getDatabase();
  const summary = aggregateDailyRecap(db, targetDate);

  return Response.json(summary);
}

export async function POST(request: Request) {
  try {
    let body: PostRecapBody = {};
    try {
      body = (await request.json()) as PostRecapBody;
    } catch {
      // Empty body is acceptable; defaults to today
    }

    const targetDate = body.date || new Date().toISOString().split('T')[0];
    const db = getDatabase();
    const config = getOfficeConfig(db);
    const summary = aggregateDailyRecap(db, targetDate);

    const whatsappResult = { sent: 0, errors: [] as string[] };
    const emailResult = { sent: 0, errors: [] as string[] };

    // 1. WhatsApp Automated Broadcasts
    if (body.sendWhatsApp !== false && config) {
      if (config.waGroupInternsJid) {
        const internText = formatDailyInternsReport(summary);
        const wa1 = await sendWhatsAppMessage(config.waGroupInternsJid, internText);
        if (wa1.success) whatsappResult.sent++;
        else if (wa1.error) whatsappResult.errors.push(wa1.error);
      }

      if (config.waGroupMentorsJid) {
        const mentorText = formatMentorGroupRecap(summary);
        const wa2 = await sendWhatsAppMessage(config.waGroupMentorsJid, mentorText);
        if (wa2.success) whatsappResult.sent++;
        else if (wa2.error) whatsappResult.errors.push(wa2.error);
      }
    }

    // 2. Email Delivery Engine
    if (body.sendEmail !== false && config) {
      const emailRes = await dispatchEmailRecap(summary, {
        supervisorEmail: config.emailAtasan,
      });
      emailResult.sent = emailRes.sentCount;
      emailResult.errors = emailRes.errors;
    }

    return Response.json({
      success: true,
      date: targetDate,
      summary,
      whatsapp: whatsappResult,
      email: emailResult,
    });
  } catch (err: unknown) {
    return Response.json(
      { error: (err as Error).message || 'Failed to generate recap' },
      { status: 500 }
    );
  }
}
