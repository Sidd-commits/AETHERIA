import { UniverseEntity } from '../../types/entity';
import { UniverseConfiguration, WorldGenResult } from '../../types/worldGen';
import { ParticleSystem } from '../systems/ParticleSystem';
import { EcosystemSystem } from '../systems/EcosystemSystem';
import { PALETTES } from '../../config/palettes';
import { WorldGenValidator } from './WorldGenValidator';

let entityIdCounter = 1;
function genId(prefix: string): string {
  return `${prefix}_${entityIdCounter++}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Procedural Universe Generator
 *
 * Takes a strictly validated UniverseConfiguration data object and
 * procedurally synthesizes celestial bodies, orbital trajectories, particle
 * vector fields, and energy/ecosystem distributions.
 */
export class ProceduralUniverseGenerator {
  /**
   * Synthesize full universe entities and particle fields from validated configuration
   */
  public static generate(
    config: UniverseConfiguration,
    particleSystem: ParticleSystem,
    ecosystemSystem: EcosystemSystem
  ): { entities: UniverseEntity[]; result: WorldGenResult } {
    const validation = WorldGenValidator.validate(config);
    const validConfig = validation.sanitizedConfig;

    const entities: UniverseEntity[] = [];
    const paletteIndex = WorldGenValidator.getPaletteIndex(validConfig.colorPalette);
    const palette = PALETTES[paletteIndex] || PALETTES[1];

    const generatedCounts = {
      stars: 0,
      planets: 0,
      blackHoles: 0,
      asteroids: 0,
      nebulae: 0,
      energyFields: 0,
      organisms: 0
    };

    // 1. Synthesize Black Holes (Singularities)
    const blackHoleEntities: UniverseEntity[] = [];
    if (validConfig.blackHoles > 0) {
      for (let i = 0; i < validConfig.blackHoles; i++) {
        const isCenter = i === 0 && validConfig.blackHoles === 1;
        const bhPos = isCenter
          ? { x: 0, y: 0, z: 0 }
          : {
              x: Math.cos((i * Math.PI * 2) / validConfig.blackHoles) * (8.0 + i * 4.0),
              y: (Math.random() - 0.5) * 2.0,
              z: Math.sin((i * Math.PI * 2) / validConfig.blackHoles) * (8.0 + i * 4.0)
            };

        const bhMass = isCenter ? 200.0 : 130.0;
        const bh: UniverseEntity = {
          id: genId('blackhole'),
          type: 'BLACK_HOLE',
          name: isCenter ? 'Gargantua Central Singularity' : `Singularity-${i + 1}`,
          position: bhPos,
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          mass: bhMass,
          radius: isCenter ? 1.4 : 1.0,
          gravitationalInfluenceRadius: isCenter ? 42.0 : 28.0,
          accretionStrength: 2.5 * validConfig.formationRate,
          energy: 2500.0,
          maxEnergy: 2500.0,
          lifetime: Infinity,
          age: 0,
          isDead: false,
          color: '#000000',
          temperature: 10,
          luminosity: 0.1
        };
        entities.push(bh);
        blackHoleEntities.push(bh);
        generatedCounts.blackHoles++;
      }
    }

    // 2. Synthesize Stars (Suns)
    const starEntities: UniverseEntity[] = [];
    if (validConfig.stars > 0) {
      if (validConfig.stars === 1) {
        // Single Star
        const hasCenterBH = blackHoleEntities.length > 0 && blackHoleEntities[0].position.x === 0;
        const starPos = hasCenterBH ? { x: 5.5, y: 0, z: 0 } : { x: 0, y: 0, z: 0 };
        const starVel = hasCenterBH
          ? { x: 0, y: 0, z: Math.sqrt((validConfig.gravity * blackHoleEntities[0].mass) / 5.5) }
          : { x: 0, y: 0, z: 0 };

        const sun: UniverseEntity = {
          id: genId('star'),
          type: 'STAR',
          name: 'Sol Prime',
          position: starPos,
          velocity: starVel,
          acceleration: { x: 0, y: 0, z: 0 },
          mass: 85.0,
          radius: 1.3,
          energy: 1200.0,
          maxEnergy: 1200.0,
          lifetime: Infinity,
          age: 0,
          isDead: false,
          color: palette.colors[4] || '#fee140',
          temperature: 6200,
          luminosity: 1.8
        };
        entities.push(sun);
        starEntities.push(sun);
        generatedCounts.stars++;
      } else if (validConfig.stars === 2) {
        // Binary Star System
        const binarySep = 4.2;
        const binarySpeed = Math.sqrt((validConfig.gravity * 65.0) / (binarySep * 2));
        const colors = [palette.colors[4] || '#fee140', palette.colors[1] || '#00f2fe'];

        for (let i = 0; i < 2; i++) {
          const sign = i === 0 ? 1 : -1;
          const star: UniverseEntity = {
            id: genId('star_binary'),
            type: 'STAR',
            name: i === 0 ? 'Helios Alpha' : 'Helios Beta',
            position: { x: sign * (binarySep / 2), y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: sign * binarySpeed },
            acceleration: { x: 0, y: 0, z: 0 },
            mass: 65.0,
            radius: 1.05,
            energy: 900.0,
            maxEnergy: 900.0,
            lifetime: Infinity,
            age: 0,
            isDead: false,
            color: colors[i],
            temperature: i === 0 ? 6500 : 9200,
            luminosity: 1.4
          };
          entities.push(star);
          starEntities.push(star);
          generatedCounts.stars++;
        }
      } else if (validConfig.stars === 3) {
        // Trinary Star System (e.g. 3 suns)
        const trinaryRadius = 7.5;
        const centerMass = blackHoleEntities.length > 0 ? blackHoleEntities[0].mass : 90.0;
        const orbitSpeed = Math.sqrt((validConfig.gravity * centerMass) / trinaryRadius);
        const starColors = [
          palette.colors[4] || '#fee140',
          palette.colors[1] || '#00f2fe',
          palette.colors[2] || '#f857a6'
        ];
        const starNames = ['Solaris Astra', 'Solaris Cyane', 'Solaris Rubor'];

        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3;
          const star: UniverseEntity = {
            id: genId('star_trinary'),
            type: 'STAR',
            name: starNames[i],
            position: {
              x: Math.cos(angle) * trinaryRadius,
              y: Math.sin(i * 2) * 0.5,
              z: Math.sin(angle) * trinaryRadius
            },
            velocity: {
              x: -Math.sin(angle) * orbitSpeed,
              y: 0,
              z: Math.cos(angle) * orbitSpeed
            },
            acceleration: { x: 0, y: 0, z: 0 },
            mass: 55.0,
            radius: 1.1,
            energy: 850.0,
            maxEnergy: 850.0,
            lifetime: Infinity,
            age: 0,
            isDead: false,
            color: starColors[i % starColors.length],
            temperature: 5500 + i * 1500,
            luminosity: 1.3
          };
          entities.push(star);
          starEntities.push(star);
          generatedCounts.stars++;
        }
      } else {
        // Star Cluster (4+ stars)
        for (let i = 0; i < validConfig.stars; i++) {
          const angle = (i * Math.PI * 2) / validConfig.stars;
          const dist = 6.0 + (i % 3) * 3.5;
          const speed = Math.sqrt((validConfig.gravity * 70.0) / dist);
          const star: UniverseEntity = {
            id: genId('star_cluster'),
            type: 'STAR',
            name: `Cluster Star ${String.fromCharCode(65 + i)}`,
            position: {
              x: Math.cos(angle) * dist,
              y: (Math.random() - 0.5) * 2.5,
              z: Math.sin(angle) * dist
            },
            velocity: {
              x: -Math.sin(angle) * speed * (validConfig.theme === 'chaotic' ? 1.2 : 1.0),
              y: (Math.random() - 0.5) * 0.4,
              z: Math.cos(angle) * speed * (validConfig.theme === 'chaotic' ? 1.2 : 1.0)
            },
            acceleration: { x: 0, y: 0, z: 0 },
            mass: 45.0,
            radius: 0.9,
            energy: 700.0,
            maxEnergy: 700.0,
            lifetime: Infinity,
            age: 0,
            isDead: false,
            color: palette.colors[i % palette.colors.length],
            temperature: 5000 + ((i * 1000) % 6000),
            luminosity: 1.1
          };
          entities.push(star);
          starEntities.push(star);
          generatedCounts.stars++;
        }
      }
    }

    // 3. Synthesize Planetary Systems
    const primaryAttractor = starEntities[0] || blackHoleEntities[0];
    const attractorMass = primaryAttractor ? primaryAttractor.mass : 80.0;
    const attractorPos = primaryAttractor ? primaryAttractor.position : { x: 0, y: 0, z: 0 };
    const numPlanets = validConfig.planets ?? validConfig.stars * 3;

    if (numPlanets > 0 && primaryAttractor) {
      const startOrbit = validConfig.stars >= 3 || validConfig.blackHoles > 0 ? 10.5 : 2.5;
      const orbitSpacing = validConfig.stars >= 3 ? 2.2 : 1.8;

      for (let i = 0; i < numPlanets; i++) {
        const orbitR = startOrbit + i * orbitSpacing;
        const angle = i * 1.6180339887 * Math.PI * 2; // Golden ratio angular distribution
        const orbitSpeed = Math.sqrt((validConfig.gravity * attractorMass) / orbitR);
        const planetMass = 0.5 + Math.random() * 2.5;
        const planetSize = 0.2 + (planetMass / 3.0) * 0.35;
        const planetColor = palette.colors[i % palette.colors.length] || '#00f2fe';

        entities.push({
          id: genId('planet'),
          type: 'PLANET',
          name: `Planet-${i + 1} (${validConfig.theme})`,
          position: {
            x: attractorPos.x + Math.cos(angle) * orbitR,
            y: (Math.random() - 0.5) * (validConfig.theme === 'chaotic' ? 1.5 : 0.2),
            z: attractorPos.z + Math.sin(angle) * orbitR
          },
          velocity: {
            x: -Math.sin(angle) * orbitSpeed,
            y: (Math.random() - 0.5) * (validConfig.theme === 'chaotic' ? 0.3 : 0.0),
            z: Math.cos(angle) * orbitSpeed
          },
          acceleration: { x: 0, y: 0, z: 0 },
          mass: planetMass,
          radius: planetSize,
          energy: 60.0 * validConfig.energyDensity,
          maxEnergy: 100.0,
          lifetime: Infinity,
          age: 0,
          isDead: false,
          color: planetColor,
          parentEntityId: primaryAttractor.id,
          orbitalRadius: orbitR,
          orbitalSpeed: orbitSpeed,
          orbitalAngle: angle
        });
        generatedCounts.planets++;
      }
    }

    // 4. Synthesize Asteroid Belts
    if (validConfig.asteroidBelts && validConfig.asteroidBelts > 0) {
      const asteroidCount = validConfig.asteroidBelts * 12;
      const beltRadius = 14.0;
      for (let i = 0; i < asteroidCount; i++) {
        const angle = (i * Math.PI * 2) / asteroidCount + Math.random() * 0.2;
        const r = beltRadius + (Math.random() - 0.5) * 3.0;
        const speed = Math.sqrt((validConfig.gravity * attractorMass) / r);

        entities.push({
          id: genId('asteroid'),
          type: 'ASTEROID',
          name: `Asteroid-${i + 1}`,
          position: {
            x: attractorPos.x + Math.cos(angle) * r,
            y: (Math.random() - 0.5) * 1.8,
            z: attractorPos.z + Math.sin(angle) * r
          },
          velocity: {
            x: -Math.sin(angle) * speed,
            y: (Math.random() - 0.5) * 0.1,
            z: Math.cos(angle) * speed
          },
          acceleration: { x: 0, y: 0, z: 0 },
          mass: 0.1,
          radius: 0.08,
          energy: 10.0,
          maxEnergy: 10.0,
          lifetime: Infinity,
          age: 0,
          isDead: false,
          color: '#8892b0'
        });
        generatedCounts.asteroids++;
      }
    }

    // 5. Procedurally Synthesize Cosmic Particle Buffers & Velocity Dynamics
    this.synthesizeParticleField(
      validConfig,
      palette,
      particleSystem,
      starEntities,
      blackHoleEntities
    );

    // 6. Seed Ecosystem Organisms & Ambient Energy Bursts
    ecosystemSystem.reset();
    const particleBuffer = particleSystem.getBuffer();
    const energyCount = Math.round(1800 * validConfig.energyDensity);
    const organismCount = validConfig.seedOrganisms
      ? validConfig.theme === 'chaotic'
        ? 250
        : 600
      : 0;

    ecosystemSystem.initializeEcosystem(particleBuffer, organismCount, energyCount);
    generatedCounts.organisms = organismCount;
    generatedCounts.energyFields = Math.round(energyCount / 50);

    const result: WorldGenResult = {
      config: validConfig,
      validation,
      entitiesGenerated: generatedCounts,
      totalParticles: particleBuffer.count || particleBuffer.maxCount,
      paletteName: palette.name,
      generationEpoch: Date.now()
    };

    return { entities, result };
  }

  /**
   * Distribute particles into thematic geometries (Laminar Disk, Turbulent Spiral, Volumetric Halo)
   */
  private static synthesizeParticleField(
    config: UniverseConfiguration,
    palette: { colors: string[] },
    particleSystem: ParticleSystem,
    _stars: UniverseEntity[],
    blackHoles: UniverseEntity[]
  ): void {
    const buffer = particleSystem.getBuffer();
    const count = buffer.count;
    const isChaotic = config.theme === 'chaotic';
    const hasCenterBH = blackHoles.length > 0;

    for (let i = 0; i < count; i++) {
      let x = 0,
        y = 0,
        z = 0;
      let vx = 0,
        vy = 0,
        vz = 0;

      if (hasCenterBH) {
        // Relativistic Accretion Swirl around central Black Hole
        const u = Math.random();
        const r = 2.0 + Math.pow(u, 0.7) * 20.0;
        const angle = Math.random() * Math.PI * 2;
        const diskThickness = isChaotic ? 2.5 : 0.45;
        const vOrb = Math.sqrt((config.gravity * 160.0) / r);

        x = Math.cos(angle) * r;
        y = (Math.random() - 0.5) * diskThickness * (1.0 + r * 0.1);
        z = Math.sin(angle) * r;

        vx = -Math.sin(angle) * vOrb;
        vy = (Math.random() - 0.5) * (isChaotic ? 0.8 : 0.05);
        vz = Math.cos(angle) * vOrb;
      } else if (isChaotic) {
        // Turbulent multi-arm galactic storm
        const arms = 3;
        const armIndex = i % arms;
        const armOffset = (armIndex * Math.PI * 2) / arms;
        const r = 1.0 + Math.pow(Math.random(), 0.5) * 22.0;
        const angle = armOffset + r * 0.4 + (Math.random() - 0.5) * 0.8;
        const speed = Math.sqrt((config.gravity * 90.0) / r) * (0.8 + Math.random() * 0.4);

        x = Math.cos(angle) * r;
        y = (Math.random() - 0.5) * 4.0;
        z = Math.sin(angle) * r;

        vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 1.2;
        vy = (Math.random() - 0.5) * 0.9;
        vz = Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2;
      } else {
        // Peaceful / Harmonic Solar Disc with laminar Keplerian flow
        const r = 1.5 + Math.pow(Math.random(), 0.6) * 18.0;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.sqrt((config.gravity * 85.0) / r);

        x = Math.cos(angle) * r;
        y = (Math.random() - 0.5) * 0.6;
        z = Math.sin(angle) * r;

        vx = -Math.sin(angle) * speed;
        vy = (Math.random() - 0.5) * 0.02;
        vz = Math.cos(angle) * speed;
      }

      buffer.positions[i * 3 + 0] = x;
      buffer.positions[i * 3 + 1] = y;
      buffer.positions[i * 3 + 2] = z;

      buffer.velocities[i * 3 + 0] = vx;
      buffer.velocities[i * 3 + 1] = vy;
      buffer.velocities[i * 3 + 2] = vz;

      // Color assignment
      const hexColor = palette.colors[i % palette.colors.length] || '#00f2fe';
      const c = this.hexToRgb(hexColor);
      buffer.colors[i * 3 + 0] = c.r;
      buffer.colors[i * 3 + 1] = c.g;
      buffer.colors[i * 3 + 2] = c.b;

      buffer.energies[i] = 1.0 * config.energyDensity;
      buffer.lifetimes[i] = 100.0 + Math.random() * 200.0;
    }
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255
    };
  }
}
