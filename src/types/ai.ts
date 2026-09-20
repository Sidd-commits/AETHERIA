import { UniversePresetId } from './universe';

/**
 * Supported Structured AI Actions
 */
export type AIActionType =
  | 'CREATE_PLANET'
  | 'CREATE_BLACK_HOLE'
  | 'CREATE_STAR'
  | 'CREATE_SUPERNOVA'
  | 'SET_COLOR_PALETTE'
  | 'ADJUST_GRAVITY'
  | 'SET_GRAVITY'
  | 'PAUSE_SIMULATION'
  | 'RESUME_SIMULATION'
  | 'ALIGN_ORBITS'
  | 'DESTROY_ENTITY'
  | 'CLEAR_ENTITIES'
  | 'SEED_LIFE'
  | 'SPAWN_ENERGY_BURST'
  | 'SET_TIME_SCALE'
  | 'LOAD_PRESET'
  | 'RESET_UNIVERSE'
  | 'UNKNOWN_ACTION';

/**
 * Strict Structured Command Schema produced by AI / LLM
 */
export interface AIStructuredCommand<P = Record<string, any>> {
  action: AIActionType;
  parameters: P;
  confidence: number; // 0.0 - 1.0
  explanation?: string; // Human-readable rationale
  isDestructive?: boolean; // Requires confirmation if true
  rawTranscript?: string; // Original speech input
}

/**
 * Specific typed parameter definitions
 */
export interface CreatePlanetParams {
  name?: string;
  radius?: number; // 0.1 - 2.0
  mass?: number; // 0.1 - 20.0
  color?: string; // Hex color string
  orbitalRadius?: number; // 2.0 - 20.0
  position?: { x: number; y: number; z: number };
}

export interface CreateBlackHoleParams {
  mass?: number; // 50 - 500
  radius?: number; // 0.5 - 3.0
  gravitationalInfluenceRadius?: number; // 10.0 - 60.0
  accretionStrength?: number; // 0.5 - 5.0
  position?: { x: number; y: number; z: number };
}

export interface CreateSupernovaParams {
  power?: number; // 0.5 - 3.0
  targetEntityId?: string;
  position?: { x: number; y: number; z: number };
}

export interface SetColorPaletteParams {
  paletteIndex?: number; // 0 - 5
  colorThemeName?: string; // 'ultraviolet' | 'neon' | 'cyberpunk' | 'solar' | 'emerald' | 'spectrum'
}

export interface AdjustGravityParams {
  multiplier?: number; // 0.1 - 5.0
  gravityConstant?: number; // 0.1 - 10.0
  direction?: 'increase' | 'decrease' | 'reset';
}

export interface DestroyEntityParams {
  targetType?: 'PLANET' | 'STAR' | 'BLACK_HOLE' | 'ASTEROID' | 'ALL_PLANETS' | 'ALL_BLACK_HOLES' | 'ALL';
  targetId?: string;
  all?: boolean;
}

export interface AlignOrbitsParams {
  center?: { x: number; y: number; z: number };
  speedMultiplier?: number;
}

export interface SetTimeScaleParams {
  scale: number; // 0.1 - 5.0
}

export interface LoadPresetParams {
  preset: UniversePresetId;
}

/**
 * Validation Result from CommandValidator
 */
export interface CommandValidationResult {
  isValid: boolean;
  sanitizedCommand?: AIStructuredCommand;
  errors: string[];
  warnings: string[];
}

/**
 * Voice Recognition & AI Agent State
 */
export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'REASONING'
  | 'CONFIRMING'
  | 'EXECUTING'
  | 'ERROR';

/**
 * Command History Item
 */
export interface CommandHistoryItem {
  id: string;
  timestamp: number;
  transcript: string;
  parsedCommand: AIStructuredCommand | null;
  status: 'SUCCESS' | 'REJECTED' | 'CANCELLED' | 'ERROR';
  executionMessage?: string;
  validationErrors?: string[];
  isDestructive?: boolean;
  providerName: string;
}

/**
 * Simulation Context provided to LLM for grounding
 */
export interface SimulationContext {
  dominantBodiesCount: number;
  activePreset: UniversePresetId;
  timeScale: number;
  isPaused: boolean;
  gravityConstant: number;
  organismCount: number;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    mass: number;
    position: { x: number; y: number; z: number };
  }>;
}

/**
 * Parse Result from AICommandAdapter
 */
export interface AIParseResult {
  success: boolean;
  command?: AIStructuredCommand;
  rawResponse?: string;
  errorMessage?: string;
  latencyMs: number;
}

/**
 * Provider-Agnostic AI Command Adapter Interface
 */
export interface AICommandAdapter {
  readonly id: string;
  readonly name: string;
  readonly isCloudProvider: boolean;
  parseCommand(transcript: string, context: SimulationContext): Promise<AIParseResult>;
}
