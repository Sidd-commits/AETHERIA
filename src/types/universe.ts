import * as THREE from 'three';

/**
 * World and Universe simulation state
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
}
