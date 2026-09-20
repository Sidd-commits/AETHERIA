import { UniverseEntity } from '../../types/entity';
import { UniversePresetId } from '../../types/universe';
import { ParticleSystem } from './ParticleSystem';

let entityIdCounter = 1;
function generateId(prefix: string): string {
  return `${prefix}_${entityIdCounter++}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Formation System
 * Handles procedural synthesis of celestial structures (Solar Systems, Binary Stars,
 * Black Holes, Nebulae, and Asteroid Belts) and dynamic entity creation.
 */
export class FormationSystem {
  /**
   * Procedurally build a universe preset
   */
  public generatePreset(
    presetId: UniversePresetId,
    particleSystem: ParticleSystem
  ): UniverseEntity[] {
    switch (presetId) {
      case 'SOLAR_SYSTEM':
        return this.buildSolarSystem(particleSystem);
      case 'BINARY_STARS_NEBULA':
        return this.buildBinaryStarsNebula(particleSystem);
      case 'BLACK_HOLE_ACCRETION':
        return this.buildBlackHoleAccretion(particleSystem);
      case 'CHAOS_GALAXY':
        return this.buildChaosGalaxy(particleSystem);
      case 'AETHERIA_LATTICE':
      default:
        return this.buildAetheriaLattice(particleSystem);
    }
  }

  /**
   * Preset 1: Solar System with central star, 6 orbiting planets, and asteroid belt
   */
  public buildSolarSystem(particleSystem: ParticleSystem): UniverseEntity[] {
    const entities: UniverseEntity[] = [];

    // Central Sun
    const sun: UniverseEntity = {
      id: generateId('star'),
      type: 'STAR',
      name: 'Sol Prime',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 80.0,
      radius: 1.2,
      energy: 1000.0,
      maxEnergy: 1000.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#fee140',
      temperature: 5800,
      luminosity: 1.5
    };
    entities.push(sun);

    // Planets configuration
    const planetConfigs = [
      { name: 'Aether-1 (Ignis)', r: 2.4, size: 0.22, color: '#ff5858', mass: 0.8 },
      { name: 'Aether-2 (Cyane)', r: 3.6, size: 0.34, color: '#00f2fe', mass: 1.5 },
      { name: 'Aether-3 (Terra)', r: 4.8, size: 0.38, color: '#00f5a0', mass: 2.0 },
      { name: 'Aether-4 (Rubor)', r: 6.2, size: 0.28, color: '#f857a6', mass: 1.2 },
      { name: 'Aether-5 (Jove)',  r: 8.4, size: 0.65, color: '#f59e0b', mass: 6.0 },
      { name: 'Aether-6 (Chronos)', r: 10.6, size: 0.55, color: '#9b51e0', mass: 4.5 }
    ];

    planetConfigs.forEach((p, idx) => {
      const angle = (idx * (Math.PI * 2 / planetConfigs.length)) + Math.random() * 0.4;
      const speed = Math.sqrt((1.0 * sun.mass) / p.r);

      entities.push({
        id: generateId('planet'),
        type: 'PLANET',
        name: p.name,
        position: { x: Math.cos(angle) * p.r, y: 0, z: Math.sin(angle) * p.r },
        velocity: { x: -Math.sin(angle) * speed, y: 0, z: Math.cos(angle) * speed },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: p.mass,
        radius: p.size,
        energy: 50.0,
        maxEnergy: 100.0,
        lifetime: Infinity,
        age: 0,
        isDead: false,
        color: p.color,
        parentEntityId: sun.id,
        orbitalRadius: p.r,
        orbitalSpeed: speed,
        orbitalAngle: angle
      });
    });

    // Asteroid Belt (Between Orbit 4 and 5)
    for (let a = 0; a < 16; a++) {
      const r = 7.0 + (Math.random() - 0.5) * 0.9;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.sqrt((1.0 * sun.mass) / r);

      entities.push({
        id: generateId('asteroid'),
        type: 'ASTEROID',
        name: `Asteroid-${a + 1}`,
        position: { x: Math.cos(angle) * r, y: (Math.random() - 0.5) * 0.25, z: Math.sin(angle) * r },
        velocity: { x: -Math.sin(angle) * speed, y: 0, z: Math.cos(angle) * speed },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 0.05,
        radius: 0.08 + Math.random() * 0.06,
        energy: 10.0,
        lifetime: Infinity,
        age: 0,
        isDead: false,
        color: '#8a99ad',
        orbitalRadius: r
      });
    }

    // Seed cosmic background dust in orbital disk
    particleSystem.seedAccretionDisk({ x: 0, y: 0, z: 0 }, 1.8, 12.0, 3500, [0.0, 0.95, 1.0]);

    return entities;
  }

  /**
   * Preset 2: Binary Stars in a Glowing Nebula
   */
  public buildBinaryStarsNebula(particleSystem: ParticleSystem): UniverseEntity[] {
    const entities: UniverseEntity[] = [];

    // Star A (Cyan Primary)
    const starA: UniverseEntity = {
      id: generateId('star'),
      type: 'STAR',
      name: 'Alpha Cyan',
      position: { x: -1.6, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 2.1 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 45.0,
      radius: 0.9,
      energy: 800.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#00f2fe',
      luminosity: 1.4
    };

    // Star B (Magenta Secondary)
    const starB: UniverseEntity = {
      id: generateId('star'),
      type: 'STAR',
      name: 'Beta Magenta',
      position: { x: 1.6, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -2.1 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 45.0,
      radius: 0.9,
      energy: 800.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#ff0844',
      luminosity: 1.4
    };

    entities.push(starA, starB);

    // Circumbinary Planet
    const orbitR = 6.0;
    const speed = Math.sqrt(90.0 / orbitR);
    entities.push({
      id: generateId('planet'),
      type: 'PLANET',
      name: 'Circum-Eden',
      position: { x: 0, y: 0, z: orbitR },
      velocity: { x: speed, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 2.2,
      radius: 0.42,
      energy: 80.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#00f5a0',
      orbitalRadius: orbitR
    });

    // Surrounding Volumetric Nebula Energy Field
    entities.push({
      id: generateId('nebula'),
      type: 'NEBULA',
      name: 'Orion Plasma Veil',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 5.0,
      radius: 8.5,
      energy: 300.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#c084fc'
    });

    // Seed colorful nebula dust
    particleSystem.seedSphericalLattice({ x: 0, y: 0, z: 0 }, 5.5, 4000);

    return entities;
  }

  /**
   * Preset 3: Supermassive Black Hole with Accretion Disk
   */
  public buildBlackHoleAccretion(particleSystem: ParticleSystem): UniverseEntity[] {
    const entities: UniverseEntity[] = [];

    // Supermassive Black Hole Singularity
    const blackHole: UniverseEntity = {
      id: generateId('blackhole'),
      type: 'BLACK_HOLE',
      name: 'Gargantua Singularity',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 140.0,
      radius: 1.0,
      eventHorizonRadius: 1.4,
      accretionRadius: 6.5,
      energy: 200.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#000000'
    };
    entities.push(blackHole);

    // Relativistic Energy Field
    entities.push({
      id: generateId('energy_field'),
      type: 'ENERGY_FIELD',
      name: 'Ergosphere Barrier',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 0,
      radius: 2.2,
      energy: 150.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#fee140'
    });

    // Orbiting doomed celestial bodies
    for (let i = 0; i < 4; i++) {
      const r = 3.5 + i * 1.6;
      const angle = (i * Math.PI) / 2;
      const speed = Math.sqrt((1.0 * blackHole.mass) / r);

      entities.push({
        id: generateId('planet'),
        type: 'PLANET',
        name: `Relic-${i + 1}`,
        position: { x: Math.cos(angle) * r, y: (Math.random() - 0.5) * 0.4, z: Math.sin(angle) * r },
        velocity: { x: -Math.sin(angle) * speed, y: 0, z: Math.cos(angle) * speed },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: 0.8,
        radius: 0.25,
        energy: 40.0,
        lifetime: Infinity,
        age: 0,
        isDead: false,
        color: i % 2 === 0 ? '#ff0844' : '#00f2fe'
      });
    }

    // High-speed accretion disk
    particleSystem.seedAccretionDisk({ x: 0, y: 0, z: 0 }, 1.5, 7.5, 4500, [1.0, 0.4, 0.05]);

    return entities;
  }

  /**
   * Preset 4: Chaos Galaxy Cluster
   */
  public buildChaosGalaxy(particleSystem: ParticleSystem): UniverseEntity[] {
    const entities: UniverseEntity[] = [];

    // 3 Mini Star Centers
    const centers = [
      { pos: { x: -3, y: 0, z: 2 }, color: '#00f2fe', mass: 40 },
      { pos: { x: 3, y: 0, z: -2 }, color: '#ff0844', mass: 40 },
      { pos: { x: 0, y: 2.5, z: 0 }, color: '#fee140', mass: 35 }
    ];

    centers.forEach((c, idx) => {
      entities.push({
        id: generateId('star'),
        type: 'STAR',
        name: `Cluster Core ${idx + 1}`,
        position: { ...c.pos },
        velocity: { x: (Math.random() - 0.5) * 0.8, y: 0, z: (Math.random() - 0.5) * 0.8 },
        acceleration: { x: 0, y: 0, z: 0 },
        mass: c.mass,
        radius: 0.85,
        energy: 600.0,
        lifetime: Infinity,
        age: 0,
        isDead: false,
        color: c.color
      });
    });

    particleSystem.seedSphericalLattice({ x: 0, y: 0, z: 0 }, 6.0, 4000);
    return entities;
  }

  /**
   * Preset 5: Classic Aetheria Harmonic Lattice (100% Backward Visual Compatibility)
   */
  public buildAetheriaLattice(particleSystem: ParticleSystem): UniverseEntity[] {
    const entities: UniverseEntity[] = [];

    // Central Radiant Energy Core
    entities.push({
      id: generateId('star'),
      type: 'STAR',
      name: 'Aether Core',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 50.0,
      radius: 0.6,
      energy: 500.0,
      lifetime: Infinity,
      age: 0,
      isDead: false,
      color: '#00f2fe'
    });

    // 3,000 Particle Uniform Spherical Lattice
    particleSystem.seedSphericalLattice({ x: 0, y: 0, z: 0 }, 3.2, 3000);

    return entities;
  }
}
