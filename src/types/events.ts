import * as THREE from 'three';

/**
 * Command and Event types for centralized command bus
 */

export type CommandType =
  | 'SET_PALETTE'
  | 'CYCLE_PALETTE'
  | 'TRIGGER_EXPLOSION'
  | 'SET_CHARGE'
  | 'SET_TRANSFORM'
  | 'TOGGLE_WEBCAM_BACKGROUND'
  | 'SET_TRACKING_STATUS'
  | 'SET_MODE_LABEL'
  | 'SHOW_TOAST';

export type CommandSource = 'GESTURE' | 'MOUSE_KEYBOARD' | 'UI' | 'VOICE_AI' | 'SYSTEM';

export interface SetPalettePayload {
  index: number;
}

export interface TriggerExplosionPayload {
  power?: number;
}

export interface SetChargePayload {
  charging: boolean;
  amount?: number;
}

export interface SetTransformPayload {
  position?: THREE.Vector3 | { x: number; y: number; z: number };
  rotation?: THREE.Euler | { x: number; y: number; z: number };
  scale?: number;
}

export interface ToggleWebcamBackgroundPayload {
  enabled?: boolean;
}

export interface SetTrackingStatusPayload {
  active: boolean;
  message?: string;
}

export interface SetModeLabelPayload {
  label: string;
}

export interface ShowToastPayload {
  message: string;
  icon?: string;
}

export interface CommandPayloadMap {
  SET_PALETTE: SetPalettePayload;
  CYCLE_PALETTE: void;
  TRIGGER_EXPLOSION: TriggerExplosionPayload;
  SET_CHARGE: SetChargePayload;
  SET_TRANSFORM: SetTransformPayload;
  TOGGLE_WEBCAM_BACKGROUND: ToggleWebcamBackgroundPayload | void;
  SET_TRACKING_STATUS: SetTrackingStatusPayload;
  SET_MODE_LABEL: SetModeLabelPayload;
  SHOW_TOAST: ShowToastPayload;
}

export interface UniverseCommand<K extends CommandType = CommandType> {
  type: K;
  payload: CommandPayloadMap[K];
  source: CommandSource;
  timestamp: number;
}

export interface InteractionEvent {
  type: string;
  source: CommandSource;
  timestamp: number;
  data?: unknown;
}
