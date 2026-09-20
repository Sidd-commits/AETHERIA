import { UniverseEntity } from '../types/entity';
import { UniverseConfig, UniversePresetId, UniverseSnapshot, EcosystemStats } from '../types/universe';
import { UniverseConfiguration, WorldGenResult } from '../types/worldGen';
import { GravitySystem } from './systems/GravitySystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { EnergySystem } from './systems/EnergySystem';
import { FormationSystem } from './systems/FormationSystem';
import { DestructionSystem } from './systems/DestructionSystem';
import { EcosystemSystem } from './systems/EcosystemSystem';
import { ProceduralUniverseGenerator } from './generator/ProceduralUniverseGenerator';

export const DEFAULT_UNIVERSE_CONFIG: UniverseConfig = {
  gravityConstant: 1.0,
  timeScale: 1.0,
  isPaused: false,
  collisionDamping: 0.985,
  energyTransferRate: 1.0,
  maxEntities: 100,
  blackHolePullForce: 2.2,
  starLuminosityDecay: 0.05,
  particleCount: 5000,
  universeBounds: 40.0,
  fixedTimestep: 1 / 60
};

/**
 * Master Universe Engine
 * Pure simulation kernel completely decoupled from rendering frameworks.
 * Coordinates 7 simulation systems via a deterministic fixed-timestep simulation loop.
 */
export class UniverseEngine {
  private config: UniverseConfig;
  private entities: UniverseEntity[] = [];
  private activePreset: UniversePresetId = 'SOLAR_SYSTEM';

  // Systems
  private gravitySystem: GravitySystem;
  private particleSystem: ParticleSystem;
  private collisionSystem: CollisionSystem;
  private energySystem: EnergySystem;
  private formationSystem: FormationSystem;
  private destructionSystem: DestructionSystem;
  private ecosystemSystem: EcosystemSystem;

  // Simulation Timekeeping
  private simulationTime: number = 0;
  private tickCount: number = 0;
  private accumulator: number = 0;

  constructor(initialConfig: Partial<UniverseConfig> = {}) {
    this.config = { ...DEFAULT_UNIVERSE_CONFIG, ...initialConfig };

    this.gravitySystem = new GravitySystem();
    this.particleSystem = new ParticleSystem(this.config.particleCount);
    this.collisionSystem = new CollisionSystem();
    this.energySystem = new EnergySystem();
    this.formationSystem = new FormationSystem();
    this.destructionSystem = new DestructionSystem();
    this.ecosystemSystem = new EcosystemSystem();

    this.loadPreset('SOLAR_SYSTEM');
  }

  public getConfig(): Readonly<UniverseConfig> {
    return this.config;
  }

  public setConfig(newConfig: Partial<UniverseConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public setTimeScale(scale: number): void {
    this.config.timeScale = Math.max(0.1, Math.min(5.0, scale));
  }

  public setPaused(paused: boolean): void {
    this.config.isPaused = paused;
  }

  public togglePause(): boolean {
    this.config.isPaused = !this.config.isPaused;
    return this.config.isPaused;
  }

  private activeCustomConfig: UniverseConfiguration | null = null;

  public loadPreset(presetId: UniversePresetId): void {
    this.activeCustomConfig = null;
    this.activePreset = presetId;
    this.entities = this.formationSystem.generatePreset(presetId, this.particleSystem);
    this.ecosystemSystem.initializeEcosystem(this.particleSystem.getBuffer(), 650, 2400);
  }

  public generateFromConfig(customConfig: UniverseConfiguration): WorldGenResult {
    this.activeCustomConfig = customConfig;
    // Apply physical config constants
    this.config.gravityConstant = customConfig.gravity;
    this.config.collisionDamping = customConfig.theme === 'chaotic' ? 0.95 : 0.985;
    this.config.energyTransferRate = customConfig.energyDensity;

    const { entities, result } = ProceduralUniverseGenerator.generate(
      customConfig,
      this.particleSystem,
      this.ecosystemSystem
    );

    this.entities = entities;
    return result;
  }

  public getActiveCustomConfig(): UniverseConfiguration | null {
    return this.activeCustomConfig;
  }

  public reset(): void {
    this.ecosystemSystem.reset();
    if (this.activeCustomConfig) {
      this.generateFromConfig(this.activeCustomConfig);
    } else {
      this.loadPreset(this.activePreset);
    }
  }

  public seedOrganisms(count: number = 50, origin?: { x: number; y: number; z: number }): number {
    return this.ecosystemSystem.seedOrganisms(this.particleSystem.getBuffer(), count, origin);
  }

  public spawnEnergyBurst(count: number = 200, origin?: { x: number; y: number; z: number }): number {
    return this.ecosystemSystem.spawnEnergyBurst(this.particleSystem.getBuffer(), count, origin);
  }

  public resetEcosystem(): void {
    this.ecosystemSystem.reset();
    this.ecosystemSystem.initializeEcosystem(this.particleSystem.getBuffer(), 650, 2400);
  }

  public getEcosystemStats(): Readonly<EcosystemStats> {
    return this.ecosystemSystem.getStats();
  }

  public spawnEntity(partialEntity: Partial<UniverseEntity>): UniverseEntity {
    const id = partialEntity.id || `entity_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const entity: UniverseEntity = {
      id,
      type: partialEntity.type || 'ASTEROID',
      name: partialEntity.name || 'Celestial Body',
      position: partialEntity.position || { x: 0, y: 0, z: 0 },
      velocity: partialEntity.velocity || { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: partialEntity.mass !== undefined ? partialEntity.mass : 1.0,
      radius: partialEntity.radius !== undefined ? partialEntity.radius : 0.3,
      energy: partialEntity.energy !== undefined ? partialEntity.energy : 50.0,
      lifetime: partialEntity.lifetime !== undefined ? partialEntity.lifetime : Infinity,
      age: 0,
      isDead: false,
      color: partialEntity.color || '#ffffff',
      ...partialEntity
    };

    this.entities.push(entity);
    return entity;
  }

  public spawnBlackHole(options: {
    position?: { x: number; y: number; z: number };
    mass?: number;
    radius?: number;
    gravitationalInfluenceRadius?: number;
    accretionStrength?: number;
    eventHorizonRadius?: number;
  } = {}): UniverseEntity {
    const pos = options.position || { x: 0, y: 0, z: 0 };
    const mass = options.mass !== undefined ? options.mass : 120.0;
    const radius = options.radius !== undefined ? options.radius : 1.0;
    const influenceRadius = options.gravitationalInfluenceRadius !== undefined ? options.gravitationalInfluenceRadius : 30.0;
    const accretionStrength = options.accretionStrength !== undefined ? options.accretionStrength : 2.0;
    const eventHorizonRadius = options.eventHorizonRadius !== undefined ? options.eventHorizonRadius : (radius * 1.2);

    const bh = this.spawnEntity({
      type: 'BLACK_HOLE',
      name: `Black Hole (Singularity-${Math.floor(Math.random() * 900 + 100)})`,
      position: { ...pos },
      velocity: { x: 0, y: 0, z: 0 },
      mass,
      radius,
      energy: 250.0,
      eventHorizonRadius,
      accretionRadius: radius * 4.5,
      gravitationalInfluenceRadius: influenceRadius,
      accretionStrength,
      color: '#000000',
      lifetime: Infinity
    });

    return bh;
  }

  public updateBlackHoleParams(params: {
    mass?: number;
    gravitationalInfluenceRadius?: number;
    accretionStrength?: number;
    eventHorizonRadius?: number;
  }): void {
    this.entities.forEach((e) => {
      if (!e.isDead && e.type === 'BLACK_HOLE') {
        if (params.mass !== undefined) e.mass = params.mass;
        if (params.gravitationalInfluenceRadius !== undefined) e.gravitationalInfluenceRadius = params.gravitationalInfluenceRadius;
        if (params.accretionStrength !== undefined) e.accretionStrength = params.accretionStrength;
        if (params.eventHorizonRadius !== undefined) e.eventHorizonRadius = params.eventHorizonRadius;
      }
    });
  }

  public clearBlackHoles(): void {
    this.entities.forEach((e) => {
      if (e.type === 'BLACK_HOLE') {
        e.isDead = true;
      }
    });
  }

  public setGravity(g: number): void {
    this.config.gravityConstant = Math.max(0.05, Math.min(8.0, g));
  }

  public adjustGravity(multiplier: number): void {
    this.config.gravityConstant = Math.max(0.05, Math.min(8.0, this.config.gravityConstant * multiplier));
  }

  public createPlanet(params: {
    name?: string;
    radius?: number;
    mass?: number;
    color?: string;
    orbitalRadius?: number;
    position?: { x: number; y: number; z: number };
  } = {}): UniverseEntity {
    // Find primary star or center mass
    const primary = this.entities.find((e) => !e.isDead && (e.type === 'STAR' || e.type === 'BLACK_HOLE'));
    const centerMass = primary ? primary.mass : 80.0;
    const centerPos = primary ? primary.position : { x: 0, y: 0, z: 0 };

    const r = params.orbitalRadius || (3.5 + Math.random() * 6.5);
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.sqrt((this.config.gravityConstant * centerMass) / r);

    const pos = params.position || {
      x: centerPos.x + Math.cos(angle) * r,
      y: centerPos.y + (Math.random() - 0.5) * 0.2,
      z: centerPos.z + Math.sin(angle) * r
    };

    const vel = {
      x: -Math.sin(angle) * speed,
      y: 0,
      z: Math.cos(angle) * speed
    };

    return this.spawnEntity({
      type: 'PLANET',
      name: params.name || `Planet-${Math.floor(Math.random() * 899 + 100)}`,
      radius: params.radius || 0.35,
      mass: params.mass || 1.5,
      color: params.color || '#00f5a0',
      position: pos,
      velocity: vel,
      orbitalRadius: r,
      orbitalSpeed: speed,
      orbitalAngle: angle,
      parentEntityId: primary?.id
    });
  }

  public destroyEntity(options: { targetId?: string; targetType?: string; all?: boolean } = {}): number {
    let destroyed = 0;

    if (options.all || options.targetType === 'ALL') {
      this.entities.forEach((e) => {
        if (!e.isDead && e.type !== 'STAR') {
          e.isDead = true;
          destroyed++;
        }
      });
      return destroyed;
    }

    if (options.targetType === 'ALL_PLANETS') {
      this.entities.forEach((e) => {
        if (!e.isDead && e.type === 'PLANET') {
          e.isDead = true;
          destroyed++;
        }
      });
      return destroyed;
    }

    if (options.targetType === 'ALL_BLACK_HOLES' || options.targetType === 'BLACK_HOLE') {
      this.entities.forEach((e) => {
        if (!e.isDead && e.type === 'BLACK_HOLE') {
          e.isDead = true;
          destroyed++;
        }
      });
      return destroyed;
    }

    if (options.targetId) {
      const e = this.entities.find((item) => item.id === options.targetId);
      if (e && !e.isDead) {
        e.isDead = true;
        destroyed++;
      }
      return destroyed;
    }

    // Default: destroy outermost or random planet
    const planets = this.entities.filter((e) => !e.isDead && e.type === 'PLANET');
    if (planets.length > 0) {
      planets[planets.length - 1].isDead = true;
      destroyed++;
    }

    return destroyed;
  }

  public alignOrbits(center?: { x: number; y: number; z: number }, speedMultiplier: number = 1.0): void {
    const primary = this.entities.find((e) => !e.isDead && (e.type === 'STAR' || e.type === 'BLACK_HOLE'));
    const origin = center || (primary ? primary.position : { x: 0, y: 0, z: 0 });
    const centerMass = primary ? primary.mass : 80.0;

    this.entities.forEach((entity) => {
      if (entity.isDead || entity.type === 'STAR' || entity.type === 'BLACK_HOLE') return;

      const dx = entity.position.x - origin.x;
      const dz = entity.position.z - origin.z;
      const dist = Math.max(1.5, Math.hypot(dx, dz));

      const angle = Math.atan2(dz, dx);
      const orbitalSpeed = Math.sqrt((this.config.gravityConstant * centerMass) / dist) * speedMultiplier;

      // Lock perpendicular circular velocity
      entity.velocity.x = -Math.sin(angle) * orbitalSpeed;
      entity.velocity.y = 0;
      entity.velocity.z = Math.cos(angle) * orbitalSpeed;
      entity.position.y = origin.y;
    });
  }

  public triggerSupernova(power: number = 1.0, origin?: { x: number; y: number; z: number }): void {
    let explosionOrigin = origin;

    if (!explosionOrigin) {
      // Find primary star or black hole
      const primary = this.entities.find((e) => e.type === 'STAR' || e.type === 'BLACK_HOLE');
      explosionOrigin = primary ? { ...primary.position } : { x: 0, y: 0, z: 0 };
    }

    this.destructionSystem.triggerSupernova(
      explosionOrigin,
      power,
      this.particleSystem.getBuffer(),
      this.entities
    );
  }

  /**
   * Deterministic simulation advance with fixed timestep accumulator
   */
  public step(realDt: number): void {
    if (this.config.isPaused) return;

    // Apply simulation timeScale
    const scaledDt = Math.min(0.1, realDt * this.config.timeScale);
    this.accumulator += scaledDt;
    const fixedDt = this.config.fixedTimestep;

    // Fixed timestep execution
    while (this.accumulator >= fixedDt) {
      this.fixedTick(fixedDt);
      this.accumulator -= fixedDt;
    }
  }

  /**
   * Single deterministic tick
   */
  private fixedTick(dt: number): void {
    this.simulationTime += dt;
    this.tickCount++;

    const dominantWells = this.entities.filter(
      (e) => !e.isDead && (e.type === 'STAR' || e.type === 'BLACK_HOLE' || e.type === 'PLANET')
    );
    const blackHoles = this.entities.filter((e) => !e.isDead && e.type === 'BLACK_HOLE');

    // 1. Gravity System: Entities pairwise gravity & Particle gravity
    this.gravitySystem.updateEntityGravity(this.entities, this.config, dt);
    this.gravitySystem.updateParticleGravity(this.particleSystem.getBuffer(), dominantWells, this.config, dt);

    // 2. Particle System: Damping, Accretion disk swirl, and bounds
    this.particleSystem.update(blackHoles, this.config, dt, this.simulationTime);

    // 3. Ecosystem System: Emergent local rules for Organisms, Energy seeking, Reproduction & Mortality
    this.ecosystemSystem.update(this.particleSystem.getBuffer(), this.entities, this.config, dt);

    // 4. Collision System: Celestial contacts & Horizon absorption
    this.collisionSystem.resolveBodyCollisions(this.entities, this.config);
    this.collisionSystem.resolveParticleCollisions(this.particleSystem.getBuffer(), blackHoles);

    // 5. Energy System: Solar radiation, thermal decay, and harmonic fields
    this.energySystem.update(this.entities, this.config, dt, this.simulationTime);

    // 6. Destruction System: Entity lifecycle aging and cleanup
    this.entities = this.destructionSystem.updateLifecycles(this.entities, dt);
  }

  /**
   * Produce an immutable snapshot for the renderer
   */
  public getSnapshot(): UniverseSnapshot {
    let totalMass = 0;
    let totalEnergy = 0;
    let dominantCount = 0;

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (!e.isDead) {
        totalMass += e.mass;
        totalEnergy += e.energy;
        if (e.type === 'STAR' || e.type === 'BLACK_HOLE' || e.type === 'PLANET') {
          dominantCount++;
        }
      }
    }

    return {
      entities: this.entities.map((e) => ({ ...e })),
      particles: this.particleSystem.getBuffer(),
      ecosystemStats: this.ecosystemSystem.getStats(),
      time: this.simulationTime,
      tickCount: this.tickCount,
      isPaused: this.config.isPaused,
      timeScale: this.config.timeScale,
      activePreset: this.activePreset,
      dominantBodiesCount: dominantCount,
      totalMass: Math.round(totalMass * 10) / 10,
      totalEnergy: Math.round(totalEnergy * 10) / 10
    };
  }

  public getEntities(): ReadonlyArray<UniverseEntity> {
    return this.entities;
  }
}
