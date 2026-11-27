import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';

describe('Backend World Generation Endpoint', () => {
  const app = createApp();

  it('translates peaceful prompt into validated peaceful configuration', async () => {
    const res = await request(app)
      .post('/api/worldgen/generate')
      .send({ prompt: 'A peaceful blue universe with three suns and a giant black hole in the center.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.theme).toBe('peaceful');
    expect(res.body.config.colorPalette).toBe('blue');
    expect(res.body.config.stars).toBe(3);
    expect(res.body.config.blackHoles).toBeGreaterThanOrEqual(1);
  });

  it('translates chaotic prompt into chaotic configuration with high gravity', async () => {
    const res = await request(app)
      .post('/api/worldgen/generate')
      .send({ prompt: 'Create a chaotic universe with high gravity and rapidly forming stars.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.theme).toBe('chaotic');
    expect(res.body.config.gravity).toBeGreaterThanOrEqual(2.0);
    expect(res.body.config.formationRate).toBeGreaterThanOrEqual(0.7);
  });

  it('returns curated presets from GET /api/presets', async () => {
    const res = await request(app).get('/api/presets');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.presets)).toBe(true);
  });

  it('extracts arbitrary numeric star counts like "6 stars" accurately', async () => {
    const res = await request(app)
      .post('/api/worldgen/generate')
      .send({ prompt: 'A vibrant nebula with 6 stars and 12 planets' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.stars).toBe(6);
  });
});
