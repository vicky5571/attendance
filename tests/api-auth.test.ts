import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST as loginRoute } from '../src/app/api/auth/login/route.ts';
import { GET as meRoute } from '../src/app/api/auth/me/route.ts';
import { POST as logoutRoute } from '../src/app/api/auth/logout/route.ts';
import { createDatabase, setDatabase } from '../src/lib/db/client.ts';
import { initSchema } from '../src/lib/db/schema.ts';
import { seedDatabase } from '../src/lib/db/seed.ts';

describe('Auth REST APIs (/api/auth)', () => {
  beforeEach(() => {
    const db = createDatabase(':memory:');
    setDatabase(db);
    initSchema(db);
    seedDatabase(db);
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate intern with valid PIN and return Set-Cookie', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'INTERN', internId: 'intern-sarah', pin: '123456' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.id, 'intern-sarah');
      assert.equal(data.user.role, 'INTERN');
      assert.equal(data.user.name, 'Sarah Nurhaliza');

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie, 'Must return Set-Cookie header');
      assert.ok(setCookie.includes('ioh_session='));
      assert.ok(setCookie.includes('HttpOnly'));
    });

    it('should reject intern login with invalid PIN with 401', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'INTERN', internId: 'intern-sarah', pin: '000000' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /PIN/i);
    });

    it('should return 404 if intern ID does not exist', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'INTERN', internId: 'intern-unknown', pin: '123456' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 404);
    });

    it('should authenticate admin with valid password and return session cookie', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN', email: 'admin@ioh.co.id', password: 'AdminIOH2026!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.role, 'ADMIN');
      assert.equal(data.user.email, 'admin@ioh.co.id');
      assert.ok(res.headers.get('set-cookie')?.includes('ioh_session='));
    });

    it('should reject admin login with invalid password with 401', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADMIN', email: 'admin@ioh.co.id', password: 'WrongPassword' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 401);
    });

    it('should reject request missing required fields with 400', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 400);
    });

    it('should authenticate intern with valid email and password via unified login', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sarah@ioh.co.id', password: 'InternIOH2026!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.role, 'INTERN');
      assert.equal(data.user.id, 'intern-sarah');
      assert.equal(data.user.email, 'sarah@ioh.co.id');
      assert.equal(data.user.name, 'Sarah Nurhaliza');
      assert.equal(data.user.divisi, 'Network Operations');
      assert.ok(res.headers.get('set-cookie')?.includes('ioh_session='));
    });

    it('should authenticate admin with valid email and password without role specified', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ioh.co.id', password: 'AdminIOH2026!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.role, 'ADMIN');
      assert.equal(data.user.email, 'admin@ioh.co.id');
      assert.ok(res.headers.get('set-cookie')?.includes('ioh_session='));
    });

    it('should reject unified login with incorrect password with 401', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sarah@ioh.co.id', password: 'WrongPassword!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /Email atau password/i);
    });

    it('should reject unified login when email does not exist with 401', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unknown@ioh.co.id', password: 'SomePassword!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /Email/i);
    });

    it('should authenticate admin with username instead of email', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'AdminIOH2026!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.role, 'ADMIN');
      assert.equal(data.user.email, 'admin@ioh.co.id');
      assert.ok(res.headers.get('set-cookie')?.includes('ioh_session='));
    });

    it('should authenticate admin when username is provided in email field', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin', password: 'AdminIOH2026!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.role, 'ADMIN');
      assert.equal(data.user.email, 'admin@ioh.co.id');
    });

    it('should authenticate intern with ID/username in identifier field', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'intern-sarah', password: 'InternIOH2026!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.role, 'INTERN');
      assert.equal(data.user.id, 'intern-sarah');
    });

    it('should authenticate intern when ID is provided in email field', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'intern-zacky', password: 'InternIOH2026!' }),
      });
      const res = await loginRoute(req);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.user.role, 'INTERN');
      assert.equal(data.user.id, 'intern-zacky');
    });
  });

  describe('GET /api/auth/me & POST /api/auth/logout', () => {
    it('should resolve session profile and revoke upon logout', async () => {
      // 1. Login as intern
      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'INTERN', internId: 'intern-sarah', pin: '123456' }),
      });
      const loginRes = await loginRoute(loginReq);
      assert.equal(loginRes.status, 200);
      const setCookie = loginRes.headers.get('set-cookie')!;
      const cookieValue = setCookie.split(';')[0]; // ioh_session=...

      // 2. Query /api/auth/me
      const meReq = new Request('http://localhost:3000/api/auth/me', {
        headers: { cookie: cookieValue },
      });
      const meRes = await meRoute(meReq);
      assert.equal(meRes.status, 200);
      const meData = await meRes.json();
      assert.equal(meData.user.id, 'intern-sarah');
      assert.equal(meData.user.role, 'INTERN');

      // 3. Logout
      const logoutReq = new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { cookie: cookieValue },
      });
      const logoutRes = await logoutRoute(logoutReq);
      assert.equal(logoutRes.status, 200);
      assert.ok(logoutRes.headers.get('set-cookie')?.includes('Max-Age=0'));

      // 4. Query /api/auth/me again -> 401
      const meAgainRes = await meRoute(meReq);
      assert.equal(meAgainRes.status, 401);
    });

    it('should return 401 for unauthenticated request without cookie', async () => {
      const meReq = new Request('http://localhost:3000/api/auth/me');
      const meRes = await meRoute(meReq);
      assert.equal(meRes.status, 401);
    });
  });
});
