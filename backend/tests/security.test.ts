import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';
import { resetRateLimitMap } from '../src/middleware/security.js';

describe('Backend Security & Hardening Tests', () => {
  const app = createApp();

  it('enforces Cloudflare / OWASP security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBeDefined();
  });

  it('rejects oversized JSON request payloads (>100kb) with 413', async () => {
    // Generate a payload slightly over 100kb
    const largeString = 'a'.repeat(1024 * 105);
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: largeString });

    expect(res.status).toBe(413);
  });

  it('allows trusted frontend origins with CORS headers', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not send Access-Control-Allow-Origin for unauthorized origins in production', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodApp = createApp();
      const res = await request(prodApp)
        .get('/health')
        .set('Origin', 'http://malicious-site.example.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      process.env.NODE_ENV = origEnv;
      resetRateLimitMap();
    }
  });
});
