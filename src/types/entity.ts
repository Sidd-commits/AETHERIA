/**
 * Celestial Entity Types and Data Interfaces
 */

export type EntityType =
  'STAR' | 'PLANET' | 'ASTEROID' | 'NEBULA' | 'ENERGY_FIELD' | 'BLACK_HOLE' | 'PARTICLE';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Universal Entity representation for all celestial and energy bodies
 */
export interface UniverseEntity {
  id: string;
  type: EntityType;
  name: string;
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  mass: number;
  radius: number;
  energy: number;
  maxEnergy?: number;
  lifetime: number; // in seconds (Infinity for permanent bodies)
  age: number; // in seconds
  isDead: boolean;
  color: string | [number, number, number];
  parentEntityId?: string; // e.g. planet orbiting a star
  orbitalRadius?: number;
  orbitalSpeed?: number;
  orbitalAngle?: number;
  temperature?: number; // Kelvin (for stars)
  luminosity?: number; // Solar luminosity units
  eventHorizonRadius?: number; // for Black Holes
  accretionRadius?: number; // for Black Holes
  gravitationalInfluenceRadius?: number; // for Black Holes
  accretionStrength?: number; // for Black Holes
  fieldHarmonics?: number; // for Energy Fields
  metadata?: Record<string, any>;
}

export type ParticleEcoType = 0 | 1 | 2; // 0: MATTER, 1: ENERGY, 2: ORGANISM

export const ECO_TYPE_MATTER: ParticleEcoType = 0;
export const ECO_TYPE_ENERGY: ParticleEcoType = 1;
export const ECO_TYPE_ORGANISM: ParticleEcoType = 2;

/**
 * Fast Typed Particle Buffer for thousands of cosmic dust and emergent ecosystem entities
 */
export interface CosmicParticleBuffer {
  types: Uint8Array; // 0 = MATTER, 1 = ENERGY, 2 = ORGANISM
  positions: Float32Array; // [x, y, z, x, y, z, ...]
  velocities: Float32Array; // [vx, vy, vz, ...]
  colors: Float32Array; // [r, g, b, ...]
  targetColors: Float32Array; // [r, g, b, ...]
  sizes: Float32Array;
  energies: Float32Array;
  healths: Float32Array; // 0.0 to 1.0 for living organisms
  lifetimes: Float32Array;
  ages: Float32Array;
  reproductionThresholds: Float32Array; // energy required for splitting
  energyConsumptionRates: Float32Array; // basal metabolism loss per second
  attractionPreferences: Float32Array; // sensory affinity weights
  count: number;
  maxCount: number;
}
