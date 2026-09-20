import { UniverseEntity } from '../types/entity';
import { UniverseConfig, UniversePresetId, UniverseSnapshot } from '../types/universe';
import { GravitySystem } from './systems/GravitySystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { EnergySystem } from './systems/EnergySystem';
import { FormationSystem } from './systems/FormationSystem';
import { DestructionSystem } from './systems/DestructionSystem';

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
 * Coordinates 6 simulation systems via a deterministic fixed-timestep simulation loop.
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

  public loadPreset(presetId: UniversePresetId): void {
    this.activePreset = presetId;
    this.entities = this.formationSystem.generatePreset(presetId, this.particleSystem);
  }

  public reset(): void {
    this.loadPreset(this.activePreset);
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

    // 3. Collision System: Celestial contacts & Horizon absorption
    this.collisionSystem.resolveBodyCollisions(this.entities, this.config);
    this.collisionSystem.resolveParticleCollisions(this.particleSystem.getBuffer(), blackHoles);

    // 4. Energy System: Solar radiation, thermal decay, and harmonic fields
    this.energySystem.update(this.entities, this.config, dt, this.simulationTime);

    // 5. Destruction System: Entity lifecycle aging and cleanup
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
