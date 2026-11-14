import * as THREE from 'three';
import { UniverseEntity, CosmicParticleBuffer } from './entity';

export type UniversePresetId =
  | 'SOLAR_SYSTEM'
  | 'BINARY_STARS_NEBULA'
  | 'BLACK_HOLE_ACCRETION'
  | 'CHAOS_GALAXY'
  | 'AETHERIA_LATTICE';

/**
 * Procedural Universe Simulation Parameters
 */
export interface UniverseConfig {
  gravityConstant: number; // G
  timeScale: number; // 0.1x to 5.0x
  isPaused: boolean;
  collisionDamping: number;
  energyTransferRate: number;
  maxEntities: number;
  blackHolePullForce: number;
  starLuminosityDecay: number;
  particleCount: number;
  universeBounds: number;
  fixedTimestep: number; // default 1/60s
}

/**
 * Real-time Population & Ecosystem Telemetry Stats
 */
export interface EcosystemStats {
  population: number; // Active organism count
  energyCount: number; // Active energy particle count
  matterCount: number; // Active matter particle count
  births: number; // Total organism births
  deaths: number; // Total organism deaths
  averageEnergy: number; // Average energy of living organisms (0 - 2.0)
  averageAge: number; // Average age of living organisms in seconds
  averageHealth: number; // Average health of living organisms (0 - 1.0)
  populationGrowth: number; // Current net population growth rate
}

/**
 * Immutable Universe State Snapshot for visualizer rendering
 */
export interface UniverseSnapshot {
  entities: UniverseEntity[];
  particles: CosmicParticleBuffer;
  ecosystemStats: EcosystemStats;
  time: number;
  tickCount: number;
  isPaused: boolean;
  timeScale: number;
  activePreset: UniversePresetId;
  dominantBodiesCount: number;
  totalMass: number;
  totalEnergy: number;
}

/**
 * World and Universe UI / camera navigation state
 */
export interface UniverseState {
  targetPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  currentRotation: THREE.Euler;
  targetScale: number;
  currentScale: number;
  activePaletteIndex: number;
  isCharging: boolean;
  chargeAmount: number;
  isExploded: boolean;
  isWebcamBackground: boolean;
  handTrackingActive: boolean;
  statusMessage: string;
  activeModeLabel: string;
  activePreset: UniversePresetId;
  isPaused: boolean;
  timeScale: number;
}
