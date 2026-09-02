/**
 * Physics engine parameters and configuration
 */
export interface PhysicsConfig {
  particleCount: number;
  sphereRadius: number;
  explosionForce: number;
  springStrength: number;
  damping: number;
  pinchThreshold: number;
  idleWaveSpeed: number;
  idleWaveAmplitude: number;
}
