import { describe, it, expect } from 'vitest';
import { OrbitalTrajectorySystem } from '../../../src/universe/systems/OrbitalTrajectorySystem';
import { UniverseEntity } from '../../../src/types/entity';
import { DEFAULT_UNIVERSE_CONFIG } from '../../../src/universe/UniverseEngine';

describe('Orbital Trajectory Prediction System', () => {
  it('correctly calculates Keplerian orbital elements for a stable circular planet', () => {
    const system = new OrbitalTrajectorySystem();

    const star: UniverseEntity = {
      id: 'star-prime',
      type: 'STAR',
      name: 'Sol Prime',
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

    // Circular orbit at radius r=10. Speed v = sqrt(G*M/r) = sqrt(1.0 * 100 / 10) = sqrt(10) ≈ 3.162
    const orbitalSpeed = Math.sqrt((1.0 * 100.0) / 10.0);
    const planet: UniverseEntity = {
      id: 'planet-terran',
      type: 'PLANET',
      name: 'Terran-1',
      position: { x: 10, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: orbitalSpeed },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 1.0,
      radius: 0.4,
      energy: 50,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#00f5a0'
    };

    const trajectories = system.update([star, planet], DEFAULT_UNIVERSE_CONFIG);

    expect(trajectories.length).toBe(1);
    const traj = trajectories[0];
    expect(traj.entityId).toBe('planet-terran');
    expect(traj.pointCount).toBe(64);
    expect(traj.elements).toBeDefined();

    const el = traj.elements!;
    expect(el.semiMajorAxis).toBeCloseTo(10.0, 0);
    // Eccentricity should be near 0 for circular orbit
    expect(el.eccentricity).toBeLessThan(0.05);
    // Orbital period T = 2 * PI * sqrt(a^3 / mu) = 2 * PI * sqrt(1000 / 100) = 2 * PI * sqrt(10) ≈ 19.86s
    expect(el.orbitalPeriod).toBeCloseTo(19.9, 0);
    // Escape velocity = sqrt(2 * mu / r) = sqrt(2 * 100 / 10) = sqrt(20) ≈ 4.47
    expect(el.escapeVelocity).toBeCloseTo(4.47, 1);
    // Hill sphere radius & Roche limit should be finite positive quantities
    expect(el.hillSphereRadius).toBeGreaterThan(0);
    expect(el.rocheLimit).toBeGreaterThan(0);

    // Analytical 5 Lagrange equilibrium points should be calculated
    expect(traj.lagrangePoints).toBeDefined();
    const lp = traj.lagrangePoints!;
    expect(Number.isFinite(lp.l1.x)).toBe(true);
    expect(Number.isFinite(lp.l2.x)).toBe(true);
    expect(Number.isFinite(lp.l3.x)).toBe(true);
    expect(Number.isFinite(lp.l4.x)).toBe(true);
    expect(Number.isFinite(lp.l5.x)).toBe(true);
  });

  it('generates 64 smooth trajectory points in 3D coordinate space', () => {
    const system = new OrbitalTrajectorySystem();
    const star: UniverseEntity = {
      id: 'star-center',
      type: 'STAR',
      name: 'Sun',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 80.0,
      radius: 1.2,
      energy: 100,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#fff'
    };

    const planet: UniverseEntity = {
      id: 'planet-mars',
      type: 'PLANET',
      name: 'Mars',
      position: { x: 5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 4.0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 0.8,
      radius: 0.3,
      energy: 50,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#ff5858'
    };

    const trajectories = system.update([star, planet], DEFAULT_UNIVERSE_CONFIG);
    expect(trajectories.length).toBe(1);
    const points = trajectories[0].points;
    expect(points.length).toBe(64 * 3);

    // Verify non-zero spread
    let hasX = false;
    let hasZ = false;
    for (let i = 0; i < points.length; i += 3) {
      if (Math.abs(points[i]) > 0.1) hasX = true;
      if (Math.abs(points[i + 2]) > 0.1) hasZ = true;
    }
    expect(hasX).toBe(true);
    expect(hasZ).toBe(true);
  });

  it('handles empty or dead attractors safely without crashing', () => {
    const system = new OrbitalTrajectorySystem();
    const deadStar: UniverseEntity = {
      id: 'dead-star',
      type: 'STAR',
      name: 'Dead Star',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 0,
      radius: 1,
      energy: 0,
      age: 0,
      lifetime: 0,
      isDead: true,
      color: '#000'
    };

    const trajectories = system.update([deadStar], DEFAULT_UNIVERSE_CONFIG);
    expect(trajectories.length).toBe(0);
  });

  it('handles hyperbolic or unbound trajectories (eccentricity >= 1.0) without producing NaN coordinates in buffer', () => {
    const system = new OrbitalTrajectorySystem();
    const star: UniverseEntity = {
      id: 'star-center',
      type: 'STAR',
      name: 'Sun',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 50.0,
      radius: 1.0,
      energy: 100,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#fff'
    };

    // Extremely high tangential velocity => hyperbolic trajectory (eccentricity > 1)
    const hyperbolicProbe: UniverseEntity = {
      id: 'hyperbolic-probe',
      type: 'ASTEROID',
      name: 'Oumuamua',
      position: { x: 10, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 100.0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 0.01,
      radius: 0.1,
      energy: 10,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#aaa'
    };

    const trajectories = system.update([star, hyperbolicProbe], DEFAULT_UNIVERSE_CONFIG);
    expect(trajectories.length).toBe(1);
    const points = trajectories[0].points;
    for (let i = 0; i < points.length; i++) {
      expect(Number.isFinite(points[i])).toBe(true);
      expect(Number.isNaN(points[i])).toBe(false);
    }
  });
});
