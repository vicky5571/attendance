import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET as getDailyRecap, POST as postDailyRecap } from '../src/app/api/reports/daily-recap/route.ts';
import { GET as getWhatsAppStatus } from '../src/app/api/whatsapp/status/route.ts';
import { POST as postWhatsAppConnect } from '../src/app/api/whatsapp/connect/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { setOfficeConfig, createIntern, recordCheckIn } from '../src/lib/db/repo.ts';
import { setConnectionStatus, setMockSocketClient } from '../src/lib/services/whatsapp.ts';
import type { OfficeConfig, InternProfile } from '../src/types/index.ts';

describe('Reports & WhatsApp REST API Endpoints', () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);

    const config: OfficeConfig = {
      targetLatitude: -6.180495,
      targetLongitude: 106.822769,
      maxRadiusMeters: 50,
      workStartTime: '08:30',
      workEndTime: '17:30',
      emailAtasan: 'supervisor@indosat.com',
      waGroupInternsJid: '1203630111@g.us',
      waGroupMentorsJid: '1203630222@g.us',
    };
    setOfficeConfig(db, config);

    const intern: InternProfile = {
      id: 'intern-zacky',
      namaLengkap: 'Zacky Kurniawan',
      divisi: 'Digital Experience',
      namaMentor: 'Vicky Lead',
      emailMentor: 'vicky@indosat.com',
      universitas: 'UI',
      jurusan: 'SI',
      periodeMagangSelesai: '2026-12-31',
      status: 'ACTIVE',
    };
    createIntern(db, intern);

    recordCheckIn(db, {
      id: 'att-1',
      internId: 'intern-zacky',
      date: '2026-10-08',
      checkInTime: '08:20:00',
      status: 'ON_TIME',
      remarks: 'Tepat Waktu',
    });
  });

  describe('GET & POST /api/reports/daily-recap', () => {
    it('GET should preview daily recap summary', async () => {
      const req = new Request('http://localhost:3000/api/reports/daily-recap?date=2026-10-08');
      const res = await getDailyRecap(req);

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.date, '2026-10-08');
      assert.equal(data.presentCount, 1);
      assert.equal(data.totalActive, 1);
    });

    it('POST should trigger recap and report execution result', async () => {
      // Mock WhatsApp socket
      const sentMsgs: string[] = [];
      setMockSocketClient({
        sendMessage: async (jid: string, content: { text: string }) => {
          sentMsgs.push(jid);
          return { key: { id: 'mock-id' } };
        },
      });
      setConnectionStatus('connected', null);

      const req = new Request('http://localhost:3000/api/reports/daily-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2026-10-08',
          sendWhatsApp: true,
          sendEmail: true,
        }),
      });

      const res = await postDailyRecap(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.date, '2026-10-08');
      assert.ok(data.whatsapp);
      assert.equal(data.whatsapp.sent, 2); // 1 for interns group + 1 for mentors group
      assert.ok(data.email);
      assert.ok(data.email.sent >= 1);
    });
  });

  describe('GET /api/whatsapp/status & POST /api/whatsapp/connect', () => {
    it('should return WhatsApp connection status', async () => {
      setConnectionStatus('connecting', 'MOCK_QR');
      const res = await getWhatsAppStatus();
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.status, 'connecting');
      assert.equal(data.qr, 'MOCK_QR');
    });

    it('should handle connect request', async () => {
      const res = await postWhatsAppConnect();
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.status);
    });
  });
});
