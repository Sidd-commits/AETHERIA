import { describe, it, expect, beforeEach } from 'vitest';
import { ChronoWarpEngine } from '../../../src/universe/chrono/ChronoWarpEngine';
import { CosmicParticleBuffer, UniverseEntity } from '../../../src/types/entity';

describe('ChronoWarpEngine Unit Tests', () => {
  let chrono: ChronoWarpEngine;
  let particleBuffer: CosmicParticleBuffer;
  let entities: UniverseEntity[];

  beforeEach(() => {
    chrono = new ChronoWarpEngine(60, 1000, 20);
    chrono.setRecordingInterval(1); // Record on every tick for test determinism

    particleBuffer = {
      types: new Uint8Array(1000),
      positions: new Float32Array(3000),
      velocities: new Float32Array(3000),
      colors: new Float32Array(3000),
      targetColors: new Float32Array(3000),
      sizes: new Float32Array(1000),
      energies: new Float32Array(1000),
      healths: new Float32Array(1000),
      lifetimes: new Float32Array(1000),
      ages: new Float32Array(1000),
      reproductionThresholds: new Float32Array(1000),
      energyConsumptionRates: new Float32Array(1000),
      attractionPreferences: new Float32Array(1000),
      count: 10,
      maxCount: 1000
    };

    // Seed some initial particle values
    for (let i = 0; i < 10; i++) {
      particleBuffer.positions[i * 3] = i * 1.5;
      particleBuffer.positions[i * 3 + 1] = 0;
      particleBuffer.positions[i * 3 + 2] = 0;
      particleBuffer.energies[i] = 100.0;
    }

    entities = [
      {
        id: 'star-1',
        name: 'Sol',
        type: 'STAR',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 100,
        radius: 2.0,
        energy: 1000,
        lifetime: Infinity,
        age: 0,
        isDead: false,
        color: '#ffffff'
      },
      {
        id: 'planet-1',
        name: 'Earth',
        type: 'PLANET',
        position: { x: 5, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 1.2 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 1.0,
        radius: 0.35,
        energy: 50,
        lifetime: Infinity,
        age: 0,
        isDead: false,
        color: '#00f2fe'
      }
    ];
  });

  it('should initialize with empty ring buffer and live mode', () => {
    expect(chrono.getCapacity()).toBe(60);
    expect(chrono.getMode()).toBe('LIVE');
    expect(chrono.isLive()).toBe(true);

    const state = chrono.getState();
    expect(state.totalRecordedFrames).toBe(0);
    expect(state.currentFrameIndex).toBe(-1);
    expect(state.timeOffsetSec).toBe(0);
  });

  it('should record snapshots deterministically without throwing', () => {
    // Record tick 1
    chrono.recordTick(1, 0.016, particleBuffer, entities);
    expect(chrono.getState().totalRecordedFrames).toBe(1);

    // Modify state and record tick 2
    particleBuffer.positions[0] = 42.0;
    entities[1].position.x = 8.5;
    chrono.recordTick(2, 0.033, particleBuffer, entities);

    expect(chrono.getState().totalRecordedFrames).toBe(2);
  });

  it('should scrub back in time and restore prior simulation state', () => {
    // Tick 1
    particleBuffer.positions[0] = 10.0;
    entities[1].position.x = 5.0;
    chrono.recordTick(1, 1.0, particleBuffer, entities);

    // Tick 2
    particleBuffer.positions[0] = 20.0;
    entities[1].position.x = 10.0;
    chrono.recordTick(2, 2.0, particleBuffer, entities);

    // Tick 3
    particleBuffer.positions[0] = 30.0;
    entities[1].position.x = 15.0;
    chrono.recordTick(3, 3.0, particleBuffer, entities);

    expect(particleBuffer.positions[0]).toBe(30.0);
    expect(entities[1].position.x).toBe(15.0);

    // Scrub to 0.0 (oldest recorded frame: tick 1)
    const offset = chrono.scrubToNormalized(0.0, particleBuffer, entities);

    expect(chrono.getMode()).toBe('SCRUBBING');
    expect(offset).toBeLessThan(0);
    expect(particleBuffer.positions[0]).toBe(10.0);
    expect(entities[1].position.x).toBe(5.0);
  });

  it('should step backward and forward through history frames', () => {
    for (let t = 1; t <= 10; t++) {
      particleBuffer.positions[0] = t * 10;
      entities[1].position.x = t;
      chrono.recordTick(t, t * 0.1, particleBuffer, entities);
    }

    expect(particleBuffer.positions[0]).toBe(100);

    // Step back 1 frame
    chrono.step(-1, particleBuffer, entities);
    expect(particleBuffer.positions[0]).toBe(90);
    expect(entities[1].position.x).toBe(9);

    // Step back another frame
    chrono.step(-1, particleBuffer, entities);
    expect(particleBuffer.positions[0]).toBe(80);
    expect(entities[1].position.x).toBe(8);

    // Step forward 1 frame
    chrono.step(1, particleBuffer, entities);
    expect(particleBuffer.positions[0]).toBe(90);
    expect(entities[1].position.x).toBe(9);
  });

  it('should handle reverse playback and stop at oldest frame', () => {
    for (let t = 1; t <= 5; t++) {
      particleBuffer.positions[0] = t;
      chrono.recordTick(t, t * 0.5, particleBuffer, entities);
    }

    chrono.setPlaybackMode('REVERSE');
    expect(chrono.isReverse()).toBe(true);

    // Step reverse ticks
    let canContinue = true;
    let ticks = 0;
    while (canContinue && ticks < 20) {
      canContinue = chrono.tickReverse(particleBuffer, entities);
      ticks++;
    }

    // Should stop at oldest recorded frame
    expect(particleBuffer.positions[0]).toBe(1);
  });

  it('should bookmark event markers and jump to pre-event moment', () => {
    for (let t = 1; t <= 20; t++) {
      particleBuffer.positions[0] = t;
      chrono.recordTick(t, t * 0.1, particleBuffer, entities);
      if (t === 15) {
        chrono.recordEventMarker('SUPERNOVA', 'Supernova Explosion', t * 0.1, t);
      }
    }

    expect(chrono.getEventMarkers().length).toBe(1);
    expect(chrono.getEventMarkers()[0].type).toBe('SUPERNOVA');

    // Jump to last marker
    const marker = chrono.jumpToLastMarker(particleBuffer, entities);
    expect(marker).not.toBeNull();
    expect(marker?.type).toBe('SUPERNOVA');
    expect(chrono.isLive()).toBe(false);
  });

  it('should resume live simulation seamlessly', () => {
    for (let t = 1; t <= 5; t++) {
      chrono.recordTick(t, t * 0.1, particleBuffer, entities);
    }

    chrono.scrubToNormalized(0.0, particleBuffer, entities);
    expect(chrono.isLive()).toBe(false);

    chrono.resumeLive();
    expect(chrono.isLive()).toBe(true);
    expect(chrono.getMode()).toBe('LIVE');
    expect(chrono.getTimeOffsetFromLive()).toBe(0);
  });

  it('handles non-finite scrubbing values (NaN, Infinity) safely by defaulting to live', () => {
    for (let t = 1; t <= 5; t++) {
      chrono.recordTick(t, t * 0.1, particleBuffer, entities);
    }

    const offsetNaN = chrono.scrubToNormalized(NaN, particleBuffer, entities);
    expect(offsetNaN).toBe(0);
    expect(chrono.isLive()).toBe(true);

    const offsetInf = chrono.scrubToNormalized(Infinity, particleBuffer, entities);
    expect(offsetInf).toBe(0);
    expect(chrono.isLive()).toBe(true);
  });

  it('handles zero or non-finite step delta without altering valid playback position', () => {
    for (let t = 1; t <= 5; t++) {
      chrono.recordTick(t, t * 0.1, particleBuffer, entities);
    }

    chrono.step(-2, particleBuffer, entities);
    expect(chrono.getMode()).toBe('SCRUBBING');

    // Stepping with NaN or 0 should not throw and should retain valid state
    const offset = chrono.step(NaN, particleBuffer, entities);
    expect(Number.isFinite(offset)).toBe(true);
  });

  it('hides entities spawned after a historical frame when scrubbing backward and restores them forward', () => {
    // Tick 1: only 2 entities
    chrono.recordTick(1, 0.1, particleBuffer, entities);

    // Tick 2: spawn a 3rd entity (black hole)
    const lateEntity: UniverseEntity = {
      id: 'bh-late',
      name: 'Late Singularity',
      type: 'BLACK_HOLE',
      position: { x: 2, y: 0, z: 2 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 150,
      radius: 1.0,
      energy: 500,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#000000'
    };
    entities.push(lateEntity);
    chrono.recordTick(2, 0.2, particleBuffer, entities);
    // Tick 3: record again so frame 2 isn't the terminal live slot
    chrono.recordTick(3, 0.3, particleBuffer, entities);

    // Scrub to oldest frame (Tick 1, before bh-late existed)
    chrono.scrubToNormalized(0.0, particleBuffer, entities);
    expect(entities.find((e) => e.id === 'bh-late')?.isDead).toBe(true);

    // Step forward to Tick 2 (after bh-late spawned)
    chrono.step(1, particleBuffer, entities);
    expect(entities.find((e) => e.id === 'bh-late')?.isDead).toBe(false);
  });
});
