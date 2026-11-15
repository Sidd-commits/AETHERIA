import { describe, it, expect } from 'vitest';
import { GravitySystem } from '../../../src/universe/systems/GravitySystem';
import { UniverseEntity } from '../../../src/types/entity';
import { DEFAULT_UNIVERSE_CONFIG } from '../../../src/universe/UniverseEngine';

describe('Symplectic Velocity-Verlet & Euler Integrator Tests', () => {
  it('integrates celestial orbits stably in VERLET mode without NaN or infinity', () => {
    const gravitySystem = new GravitySystem();

    const star: UniverseEntity = {
      id: 'sun',
      type: 'STAR',
      name: 'Sun',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 100.0,
      radius: 1.5,
      energy: 100,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#ffd200'
    };

    const planet: UniverseEntity = {
      id: 'earth',
      type: 'PLANET',
      name: 'Earth',
      position: { x: 8, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: Math.sqrt((1.0 * 100) / 8) },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 1.0,
      radius: 0.4,
      energy: 50,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#00f2fe'
    };

    const config = { ...DEFAULT_UNIVERSE_CONFIG, integratorMode: 'VERLET' as const };
    const dt = 1 / 60;

    // Advance 60 ticks (1 full simulated second)
    for (let tick = 0; tick < 60; tick++) {
      gravitySystem.updateEntityGravity([star, planet], config, dt);
    }

    expect(Number.isFinite(planet.position.x)).toBe(true);
    expect(Number.isFinite(planet.position.z)).toBe(true);
    expect(Number.isFinite(planet.velocity.x)).toBe(true);
    expect(Number.isFinite(planet.velocity.z)).toBe(true);

    const distFromCenter = Math.hypot(planet.position.x, planet.position.z);
    // Orbit should remain stable near radius 8
    expect(distFromCenter).toBeGreaterThan(6.0);
    expect(distFromCenter).toBeLessThan(10.0);
  });

  it('calculates accurate Keplerian circular orbital velocity', () => {
    const gravitySystem = new GravitySystem();
    const centralBody: UniverseEntity = {
      id: 'core',
      type: 'STAR',
      name: 'Core',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 64.0,
      radius: 1.0,
      energy: 100,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#fff'
    };

    // Orbit radius = 4.0, G = 1.0, M = 64.0. Speed = sqrt(64 / 4) = sqrt(16) = 4.0
    const vel = gravitySystem.calculateOrbitalVelocity(centralBody, 4.0, { x: 0, y: 1, z: 0 }, 1.0);
    const speed = Math.hypot(vel.x, vel.z);
    expect(speed).toBeCloseTo(4.0, 2);
  });
});
