import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getConnectionStatus,
  setConnectionStatus,
  sendWhatsAppMessage,
  setMockSocketClient,
} from '../src/lib/services/whatsapp.ts';

describe('WhatsApp Baileys Gateway & Session Manager', () => {
  beforeEach(() => {
    setConnectionStatus('disconnected', null);
    setMockSocketClient(null);
  });

  it('should start with disconnected state and null QR', () => {
    const status = getConnectionStatus();
    assert.equal(status.status, 'disconnected');
    assert.equal(status.qr, null);
  });

  it('should update state and store pairing QR string', () => {
    setConnectionStatus('connecting', '2@MOCK_QR_CODE_STRING');
    const status = getConnectionStatus();
    assert.equal(status.status, 'connecting');
    assert.equal(status.qr, '2@MOCK_QR_CODE_STRING');
  });

  it('should reject message dispatch if socket is not connected', async () => {
    const res = await sendWhatsAppMessage('1203630111@g.us', 'Hello World');
    assert.equal(res.success, false);
    assert.match(res.error || '', /not connected/i);
  });

  it('should dispatch message successfully when socket is connected', async () => {
    let sentPayload: { jid: string; text: string } | null = null;
    setMockSocketClient({
      sendMessage: async (jid: string, content: { text: string }) => {
        sentPayload = { jid, text: content.text };
        return { key: { id: 'msg-123' } };
      },
    });
    setConnectionStatus('connected', null);

    const res = await sendWhatsAppMessage('1203630111@g.us', 'Test Daily Broadcast');
    assert.equal(res.success, true);
    assert.equal(res.messageId, 'msg-123');
    assert.ok(sentPayload);
    assert.equal(sentPayload.jid, '1203630111@g.us');
    assert.equal(sentPayload.text, 'Test Daily Broadcast');
  });
});
