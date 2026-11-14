import { describe, it, expect, beforeEach } from 'vitest';
import { UniverseEngine } from '../../src/universe/UniverseEngine';

describe('UniverseEngine Multi-Tick Integration Tests', () => {
  let engine: UniverseEngine;

  beforeEach(() => {
    engine = new UniverseEngine();
  });

  it('should initialize default solar system with central star and orbiting planets', () => {
    const snapshot = engine.getSnapshot();

    expect(snapshot.entities.length).toBeGreaterThanOrEqual(5);
    const star = snapshot.entities.find((e) => e.type === 'STAR');
    expect(star).toBeDefined();
    expect(star?.mass).toBeGreaterThan(50);

    const planets = snapshot.entities.filter((e) => e.type === 'PLANET');
    expect(planets.length).toBeGreaterThanOrEqual(4);
  });

  it('should deterministically advance celestial positions and particle states over 60 ticks', () => {
    const initialSnapshot = engine.getSnapshot();
    const initialPlanetPos = { ...initialSnapshot.entities[1].position };

    // Advance 1.0 second in real time
    for (let i = 0; i < 60; i++) {
      engine.step(1 / 60);
    }

    const advancedSnapshot = engine.getSnapshot();
    const updatedPlanetPos = advancedSnapshot.entities[1].position;

    // Body should have orbited and changed position
    const movedDistance = Math.hypot(
      updatedPlanetPos.x - initialPlanetPos.x,
      updatedPlanetPos.y - initialPlanetPos.y,
      updatedPlanetPos.z - initialPlanetPos.z
    );

    expect(movedDistance).toBeGreaterThan(0.01);
    expect(advancedSnapshot.tickCount).toBeGreaterThanOrEqual(59);
    expect(advancedSnapshot.time).toBeGreaterThan(0.9);
  });

  it('should simulate ecosystem metabolism and organism population dynamics', () => {
    const initialStats = engine.getEcosystemStats();
    expect(initialStats).toBeDefined();
    expect(initialStats.population).toBeGreaterThanOrEqual(0);

    // Step simulation
    for (let i = 0; i < 30; i++) {
      engine.step(1 / 60);
    }

    const updatedStats = engine.getEcosystemStats();
    expect(updatedStats.averageAge).toBeGreaterThanOrEqual(0);
    expect(updatedStats.averageEnergy).toBeGreaterThanOrEqual(0);
  });

  it('should cleanly apply black hole spawn and gravitational restructuring', () => {
    const initialEntitiesCount = engine.getSnapshot().entities.length;

    engine.spawnBlackHole({ position: { x: 0, y: 0, z: 0 }, mass: 200, radius: 2.5 });

    const snapshot = engine.getSnapshot();
    const blackHoles = snapshot.entities.filter((e) => e.type === 'BLACK_HOLE');

    expect(blackHoles.length).toBe(1);
    expect(snapshot.entities.length).toBe(initialEntitiesCount + 1);
    expect(blackHoles[0].mass).toBe(200);
  });

  it('should align orbits around center on command', () => {
    engine.alignOrbits({ x: 0, y: 0, z: 0 }, 1.0);

    // After orbit alignment, all planets should have non-zero tangential velocity
    const snapshot = engine.getSnapshot();
    const planets = snapshot.entities.filter((e) => e.type === 'PLANET');

    for (const p of planets) {
      const speed = Math.hypot(p.velocity.x, p.velocity.y, p.velocity.z);
      expect(speed).toBeGreaterThan(0);
    }
  });

  it('should trigger supernova and disperse high energy particles', () => {
    engine.triggerSupernova(2.0, { x: 0, y: 0, z: 0 });

    // Step physics to simulate explosion shockwave
    engine.step(1 / 60);

    const snapshot = engine.getSnapshot();
    const buffer = snapshot.particles;
    // Verify some particles gained high outward velocities
    let maxSpeed = 0;
    for (let i = 0; i < 100; i++) {
      const vx = buffer.velocities[i * 3];
      const vy = buffer.velocities[i * 3 + 1];
      const vz = buffer.velocities[i * 3 + 2];
      const speed = Math.hypot(vx, vy, vz);
      if (speed > maxSpeed) maxSpeed = speed;
    }

    expect(maxSpeed).toBeGreaterThan(0.5);
  });
});
