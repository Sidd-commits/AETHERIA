import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';

describe('Backend AI Command & Query Endpoints', () => {
  const app = createApp();

  it('translates gravity increase into validated SET_GRAVITY command', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'increase gravity' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('SET_GRAVITY');
    expect(res.body.command.payload.multiplier).toBe(2.0);
  });

  it('translates supernova command into TRIGGER_SUPERNOVA', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'trigger supernova explosion' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('TRIGGER_SUPERNOVA');
  });

  it('translates reset command into RESET_ECOSYSTEM', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'reset universe simulation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('RESET_ECOSYSTEM');
  });

  it('rejects empty command payloads with 400', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid Request');
  });

  it('answers simulation telemetry queries', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .send({ query: 'What is the current stability?', telemetry: { fps: 60, particleCount: 12000 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.answer).toContain('AETHER Guardian Advisor');
    expect(res.body.answer).toContain('60 FPS');
  });
});
