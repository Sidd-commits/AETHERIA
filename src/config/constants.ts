import { PhysicsConfig } from '../types/physics';

/**
 * Global Constants and Default Physics Configuration
 */

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  particleCount: 3000,
  sphereRadius: 3.2,
  explosionForce: 1.8,
  springStrength: 0.045,
  damping: 0.88,
  pinchThreshold: 0.08,
  idleWaveSpeed: 2.2,
  idleWaveAmplitude: 0.05
};

export const RENDERING_CONFIG = {
  cameraFov: 50,
  cameraNear: 0.1,
  cameraFar: 1000,
  cameraZ: 10,
  particleSize: 0.28,
  particleOpacity: 0.9,
  maxPixelRatio: 2
};

export const ANIMATION_CONFIG = {
  lerpPosition: 0.12,
  lerpRotation: 0.10,
  lerpScale: 0.10,
  lerpColor: 0.08,
  idleSpinY: 0.003,
  chargeIncrement: 0.035,
  chargeDecrement: 0.08,
  chargeVibrationMagnitude: 0.14
};

export const GESTURE_CONFIG = {
  singleHandSceneScaleX: 12.0,
  singleHandSceneScaleY: 8.0,
  singleHandSceneScaleZ: 6.0,
  tiltMultiplierX: 2.5,
  tiltMultiplierY: 3.0,
  twoHandMidpointScaleX: 10.0,
  twoHandMidpointScaleY: 7.0,
  twoHandScaleDistanceMin: 0.15,
  twoHandScaleFactor: 3.2,
  twoHandScaleBase: 0.5,
  minScale: 0.4,
  maxScale: 2.8
};
