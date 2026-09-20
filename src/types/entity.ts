/**
 * Celestial Entity Types and Data Interfaces
 */

export type EntityType =
  | 'STAR'
  | 'PLANET'
  | 'ASTEROID'
  | 'NEBULA'
  | 'ENERGY_FIELD'
  | 'BLACK_HOLE'
  | 'PARTICLE';

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
  fieldHarmonics?: number; // for Energy Fields
  metadata?: Record<string, any>;
}

/**
 * Fast Typed Particle Buffer for thousands of cosmic dust and accretion particles
 */
export interface CosmicParticleBuffer {
  positions: Float32Array; // [x, y, z, x, y, z, ...]
  velocities: Float32Array; // [vx, vy, vz, ...]
  colors: Float32Array; // [r, g, b, ...]
  targetColors: Float32Array; // [r, g, b, ...]
  sizes: Float32Array;
  energies: Float32Array;
  lifetimes: Float32Array;
  ages: Float32Array;
  count: number;
  maxCount: number;
}
