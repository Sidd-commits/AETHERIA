/**
 * Particle and ParticleSystem buffer representation
 */

export interface Particle {
  id: number;
  basePosition: [number, number, number];
  currentPosition: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number];
  targetColor: [number, number, number];
  size: number;
}

export interface ParticleBuffer {
  basePositions: Float32Array;
  currentPositions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  targetColors: Float32Array;
  sizes: Float32Array;
  count: number;
}
