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

  it('translates spacetime command into TOGGLE_SPACETIME_GRID', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'show spacetime curvature grid' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('TOGGLE_SPACETIME_GRID');
  });

  it('translates orbit line command into TOGGLE_ORBITAL_TRAJECTORIES', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'show orbital trajectory lines' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('TOGGLE_ORBITAL_TRAJECTORIES');
  });

  it('translates verlet physics command into SET_INTEGRATOR_MODE', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'enable verlet precision physics' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('SET_INTEGRATOR_MODE');
    expect(res.body.command.payload.mode).toBe('VERLET');
  });

  it('translates rewind command into REWIND_TIMELINE', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'rewind the simulation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('REWIND_TIMELINE');
    expect(res.body.command.payload.mode).toBe('REVERSE');
  });

  it('translates replay supernova command into REPLAY_LAST_EVENT', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'replay supernova event' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('REPLAY_LAST_EVENT');
  });

  it('translates step backward command into STEP_TIMELINE', async () => {
    const res = await request(app)
      .post('/api/ai/command')
      .send({ text: 'step backward in time' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.command.type).toBe('STEP_TIMELINE');
    expect(res.body.command.payload.delta).toBe(-1);
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
