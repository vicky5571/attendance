export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface WhatsAppStatusResult {
  status: ConnectionState;
  qr: string | null;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISocketClient {
  sendMessage: (jid: string, content: { text: string }) => Promise<{ key?: { id?: string } }>;
}

let currentStatus: ConnectionState = 'disconnected';
let currentQr: string | null = null;
let activeSocket: ISocketClient | null = null;

/**
 * Returns current connection status and QR code string.
 */
export function getConnectionStatus(): WhatsAppStatusResult {
  return {
    status: currentStatus,
    qr: currentQr,
  };
}

/**
 * Sets connection status and QR string (used internally and for test mocks).
 */
export function setConnectionStatus(status: ConnectionState, qr: string | null): void {
  currentStatus = status;
  currentQr = qr;
}

/**
 * Sets an active socket client instance (used for unit testing with mocks).
 */
export function setMockSocketClient(client: ISocketClient | null): void {
  activeSocket = client;
}

/**
 * Sends a WhatsApp text message to a specific JID (phone number or group).
 */
export async function sendWhatsAppMessage(jid: string, text: string): Promise<WhatsAppSendResult> {
  if (currentStatus !== 'connected' || !activeSocket) {
    return {
      success: false,
      error: `WhatsApp socket is not connected. Current status: ${currentStatus}`,
    };
  }

  try {
    const res = await activeSocket.sendMessage(jid, { text });
    return {
      success: true,
      messageId: res.key?.id,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Initializes the Baileys WhatsApp Web socket connection.
 * Dynamic import allows running without crash in test or non-browser environments.
 */
export async function initializeWhatsApp(sessionDir = './baileys_auth_info'): Promise<void> {
  try {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import(
      '@whiskeysockets/baileys'
    );

    setConnectionStatus('connecting', null);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        setConnectionStatus('connecting', qr);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        setConnectionStatus('disconnected', null);
        activeSocket = null;

        if (shouldReconnect) {
          initializeWhatsApp(sessionDir).catch(() => {});
        }
      } else if (connection === 'open') {
        setConnectionStatus('connected', null);
        activeSocket = sock as unknown as ISocketClient;
      }
    });
  } catch (err) {
    setConnectionStatus('disconnected', null);
    throw err;
  }
}
