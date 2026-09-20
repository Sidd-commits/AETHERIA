import { describe, it, expect, beforeEach } from 'vitest';
import { GravitySystem } from '../../../src/universe/systems/GravitySystem';
import { CollisionSystem } from '../../../src/universe/systems/CollisionSystem';
import { ParticleSystem } from '../../../src/universe/systems/ParticleSystem';
import { SpatialHashGrid } from '../../../src/universe/spatial/SpatialHashGrid';
import { UniverseEntity } from '../../../src/types/entity';
import { UniverseConfig } from '../../../src/types/universe';

describe('Physics Calculations & Numerical Accuracy', () => {
  let gravitySystem: GravitySystem;
  let collisionSystem: CollisionSystem;
  let particleSystem: ParticleSystem;
  let config: UniverseConfig;

  beforeEach(() => {
    gravitySystem = new GravitySystem();
    collisionSystem = new CollisionSystem();
    particleSystem = new ParticleSystem(1000);

    config = {
      isPaused: false,
      timeScale: 1.0,
      fixedTimestep: 1 / 60,
      gravityConstant: 1.5,
      collisionDamping: 0.8,
      energyTransferRate: 0.1,
      maxEntities: 50,
      blackHolePullForce: 1.5,
      starLuminosityDecay: 0.01,
      particleCount: 1000,
      universeBounds: 50
    };
  });

  describe('GravitySystem', () => {
    it('should compute mutual gravitational attraction with softening distance', () => {
      const starA: UniverseEntity = {
        id: 'star-1',
        name: 'Primary Star',
        type: 'STAR',
        position: { x: -5, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 100,
        radius: 2,
        energy: 500,
        lifetime: 1000,
        age: 0,
        isDead: false,
        color: '#ffaa00'
      };

      const planetB: UniverseEntity = {
        id: 'planet-1',
        name: 'Orbiting Planet',
        type: 'PLANET',
        position: { x: 5, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 10,
        radius: 0.8,
        energy: 50,
        lifetime: 1000,
        age: 0,
        isDead: false,
        color: '#00f2fe'
      };

      const entities = [starA, planetB];
      gravitySystem.updateEntityGravity(entities, config, 0.016);

      // Star A should accelerate rightward (+x), Planet B should accelerate leftward (-x)
      expect(starA.acceleration.x).toBeGreaterThan(0);
      expect(planetB.acceleration.x).toBeLessThan(0);

      // Planet B should experience greater acceleration because mass is 10x smaller
      expect(Math.abs(planetB.acceleration.x)).toBeGreaterThan(Math.abs(starA.acceleration.x));
    });

    it('should compute valid Keplerian circular orbital velocity', () => {
      const centralStar: UniverseEntity = {
        id: 'central-star',
        name: 'Sol Prime',
        type: 'STAR',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 100,
        radius: 2,
        energy: 1000,
        lifetime: 1000,
        age: 0,
        isDead: false,
        color: '#ffaa00'
      };

      const orbitRadius = 10;
      const G = 1.5;

      const vOrb = gravitySystem.calculateOrbitalVelocity(
        centralStar,
        orbitRadius,
        { x: 0, y: 1, z: 0 },
        G
      );

      // Orbital speed = sqrt(G * M / r) = sqrt(1.5 * 100 / 10) = sqrt(15) ~= 3.873
      const speed = Math.hypot(vOrb.x, vOrb.y, vOrb.z);
      expect(speed).toBeCloseTo(Math.sqrt(15), 2);
    });

    it('should accelerate cosmic particles towards dominant mass wells', () => {
      const buffer = particleSystem.getBuffer();
      // Set particle count
      buffer.count = 10;
      // Position first particle at (5, 0, 0) with zero velocity
      buffer.positions[0] = 5;
      buffer.positions[1] = 0;
      buffer.positions[2] = 0;
      buffer.velocities[0] = 0;
      buffer.velocities[1] = 0;
      buffer.velocities[2] = 0;

      const blackHole: UniverseEntity = {
        id: 'bh-1',
        name: 'Singularity Alpha',
        type: 'BLACK_HOLE',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 300,
        radius: 2,
        eventHorizonRadius: 2.5,
        energy: 1000,
        lifetime: 1000,
        age: 0,
        isDead: false,
        color: '#111111'
      };

      gravitySystem.updateParticleGravity(buffer, [blackHole], config, 0.016);

      // Velocity X should now be negative (drawn towards origin x=0)
      expect(buffer.velocities[0]).toBeLessThan(0);
    });
  });

  describe('CollisionSystem & Black Hole Absorption', () => {
    it('should absorb planet into black hole when crossing event horizon', () => {
      const blackHole: UniverseEntity = {
        id: 'bh-1',
        name: 'Singularity Alpha',
        type: 'BLACK_HOLE',
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 200,
        radius: 2,
        eventHorizonRadius: 2.5,
        energy: 500,
        lifetime: 1000,
        age: 0,
        isDead: false,
        color: '#000'
      };

      const doomedPlanet: UniverseEntity = {
        id: 'planet-victim',
        name: 'Doomed World',
        type: 'PLANET',
        position: { x: 2.0, y: 0, z: 0 }, // Inside event horizon radius 2.5
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 20,
        radius: 0.5,
        energy: 50,
        lifetime: 1000,
        age: 0,
        isDead: false,
        color: '#00ffaa'
      };

      const initialMass = blackHole.mass;
      collisionSystem.resolveBodyCollisions([blackHole, doomedPlanet], config);

      expect(doomedPlanet.isDead).toBe(true);
      expect(blackHole.mass).toBeGreaterThan(initialMass);
    });
  });

  describe('ParticleSystem Dynamics & Damping', () => {
    it('should update particle dynamics without producing NaN', () => {
      const buffer = particleSystem.getBuffer();
      buffer.positions[0] = 1.0;
      buffer.positions[1] = 0;
      buffer.positions[2] = 0;
      buffer.velocities[0] = 5.0;
      buffer.velocities[1] = 0;
      buffer.velocities[2] = 0;

      particleSystem.update([], config, 0.016, 10);

      expect(Number.isNaN(buffer.positions[0])).toBe(false);
      expect(Number.isNaN(buffer.velocities[0])).toBe(false);
      // Velocity damping should keep velocity bounded
      expect(Math.abs(buffer.velocities[0])).toBeLessThanOrEqual(5.0);
    });
  });

  describe('SpatialHashGrid Partitioning', () => {
    it('should insert and query spatial points in O(1) time', () => {
      const grid = new SpatialHashGrid(4.0, 1024, 100);
      grid.clear();

      const positions = new Float32Array([
        1.0,
        1.0,
        1.0, // Index 0 (dist from 1,1,1 is 0)
        2.0,
        2.0,
        2.0, // Index 1 (dist from 1,1,1 is sqrt(3) ~ 1.73 < 3.0)
        50.0,
        50.0,
        50.0 // Index 2 (far away)
      ]);

      grid.insert(0, 1.0, 1.0, 1.0);
      grid.insert(1, 2.0, 2.0, 2.0);
      grid.insert(2, 50.0, 50.0, 50.0);

      const count = grid.queryRadius(1.0, 1.0, 1.0, 3.0, positions);
      expect(count).toBe(2);

      const results = grid.getQueryResultBuffer();
      const indices = Array.from(results.subarray(0, count));

      expect(indices).toContain(0);
      expect(indices).toContain(1);
      expect(indices).not.toContain(2);
    });
  });
});
