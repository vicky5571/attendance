import { getConnectionStatus } from '../../../../lib/services/whatsapp.ts';

export async function GET() {
  const status = getConnectionStatus();
  return Response.json(status);
}
