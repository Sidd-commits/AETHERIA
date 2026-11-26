import { describe, it, expect, vi, afterEach } from 'vitest';
import { BackendApiClient } from '../../../src/services/BackendApiClient';

describe('BackendApiClient Unit Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes trailing slash and reports online health status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: 'healthy', service: 'aetheria-backend', uptimeSeconds: 42 }),
        { status: 200 }
      )
    );

    const client = new BackendApiClient('http://localhost:5000/');
    expect(client.getBaseUrl()).toBe('http://localhost:5000');

    const health = await client.checkHealth();
    expect(health.online).toBe(true);
    expect(health.uptimeSeconds).toBe(42);
    expect(health.service).toBe('aetheria-backend');
  });

  it('falls back cleanly to offline when backend is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const client = new BackendApiClient('http://localhost:5000');
    const health = await client.checkHealth();
    expect(health.online).toBe(false);
  });

  it('fetches and validates backend presets into frontend UniverseConfiguration schema', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          count: 1,
          presets: [
            {
              id: 'binary-pulsar',
              name: 'Binary Pulsar Vortex',
              description: 'Two dense stars.',
              config: {
                theme: 'chaotic',
                colorPalette: 'fire',
                stars: 2,
                planets: 4,
                blackHoles: 0,
                gravity: 2.4,
                energyDensity: 0.9,
                formationRate: 0.8
              }
            }
          ]
        }),
        { status: 200 }
      )
    );

    const client = new BackendApiClient('http://localhost:5000');
    const presets = await client.fetchPresets();

    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('binary-pulsar');
    expect(presets[0].config.theme).toBe('chaotic');
    // 'fire' normalizes cleanly to frontend 'amber' palette key
    expect(presets[0].config.colorPalette).toBe('amber');
    expect(presets[0].config.stars).toBe(2);
  });
});
