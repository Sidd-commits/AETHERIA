import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';

describe('Backend Health Endpoints', () => {
  const app = createApp();

  it('GET /health returns healthy status and memory telemetry', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('aetheria-backend');
    expect(res.body.memory).toBeDefined();
    expect(res.body.memory.heapUsedMb).toBeGreaterThan(0);
  });

  it('GET /api/health also returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('returns 404 for unknown endpoints', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Endpoint Not Found');
  });
});
