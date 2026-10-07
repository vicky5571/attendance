import { getConnectionStatus, initializeWhatsApp } from '../../../../lib/services/whatsapp.ts';

export async function POST() {
  const current = getConnectionStatus();
  if (current.status === 'disconnected') {
    // Initiate non-blocking connection attempt
    initializeWhatsApp().catch(() => {});
  }

  return Response.json({
    initiated: true,
    ...getConnectionStatus(),
  });
}
