import * as THREE from 'three';
import { UniversePresetId } from './universe';
import { UniverseEntity } from './entity';
import { UniverseConfiguration } from './worldGen';

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
  | 'SHOW_TOAST'
  | 'SET_UNIVERSE_PRESET'
  | 'SET_TIME_SCALE'
  | 'TOGGLE_PAUSE'
  | 'RESET_UNIVERSE'
  | 'SPAWN_ENTITY'
  | 'SPAWN_BLACK_HOLE'
  | 'UPDATE_BLACK_HOLE_PARAMS'
  | 'CLEAR_BLACK_HOLES'
  | 'SEED_ORGANISMS'
  | 'SPAWN_ENERGY_BURST'
  | 'RESET_ECOSYSTEM'
  | 'TOGGLE_POPULATION_MONITOR'
  | 'TRIGGER_SUPERNOVA'
  | 'SET_GRAVITY'
  | 'DESTROY_ENTITY'
  | 'ALIGN_ORBITS'
  | 'TOGGLE_VOICE_AI'
  | 'GENERATE_PROCEDURAL_UNIVERSE'
  | 'TOGGLE_WORLD_GEN';

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

export interface SetUniversePresetPayload {
  preset: UniversePresetId;
}

export interface SetTimeScalePayload {
  scale: number;
}

export interface TogglePausePayload {
  paused?: boolean;
}

export interface ResetUniversePayload {
  preset?: UniversePresetId;
}

export interface SpawnEntityPayload {
  entity: Partial<UniverseEntity>;
}

export interface SpawnBlackHolePayload {
  position?: { x: number; y: number; z: number };
  mass?: number;
  radius?: number;
  gravitationalInfluenceRadius?: number;
  accretionStrength?: number;
  eventHorizonRadius?: number;
}

export interface UpdateBlackHoleParamsPayload {
  mass?: number;
  gravitationalInfluenceRadius?: number;
  accretionStrength?: number;
  eventHorizonRadius?: number;
}

export interface SeedOrganismsPayload {
  count?: number;
  origin?: { x: number; y: number; z: number };
}

export interface SpawnEnergyBurstPayload {
  count?: number;
  origin?: { x: number; y: number; z: number };
}

export interface TriggerSupernovaPayload {
  power?: number;
  entityId?: string;
}

export interface SetGravityPayload {
  gravityConstant?: number;
  multiplier?: number;
}

export interface DestroyEntityPayload {
  targetId?: string;
  targetType?: string;
  all?: boolean;
}

export interface AlignOrbitsPayload {
  center?: { x: number; y: number; z: number };
  speedMultiplier?: number;
}

export interface ToggleVoiceAIPayload {
  enabled?: boolean;
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
  SET_UNIVERSE_PRESET: SetUniversePresetPayload;
  SET_TIME_SCALE: SetTimeScalePayload;
  TOGGLE_PAUSE: TogglePausePayload | void;
  RESET_UNIVERSE: ResetUniversePayload | void;
  SPAWN_ENTITY: SpawnEntityPayload;
  SPAWN_BLACK_HOLE: SpawnBlackHolePayload | void;
  UPDATE_BLACK_HOLE_PARAMS: UpdateBlackHoleParamsPayload;
  CLEAR_BLACK_HOLES: void;
  SEED_ORGANISMS: SeedOrganismsPayload | void;
  SPAWN_ENERGY_BURST: SpawnEnergyBurstPayload | void;
  RESET_ECOSYSTEM: void;
  TOGGLE_POPULATION_MONITOR: void;
  TRIGGER_SUPERNOVA: TriggerSupernovaPayload;
  SET_GRAVITY: SetGravityPayload;
  DESTROY_ENTITY: DestroyEntityPayload | void;
  ALIGN_ORBITS: AlignOrbitsPayload | void;
  TOGGLE_VOICE_AI: ToggleVoiceAIPayload | void;
  GENERATE_PROCEDURAL_UNIVERSE: { config: UniverseConfiguration };
  TOGGLE_WORLD_GEN: void;
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
