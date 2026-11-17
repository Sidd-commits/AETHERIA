import { EntityType } from './entity';

export type ChronoPlaybackMode = 'LIVE' | 'REVERSE' | 'SCRUBBING' | 'REVERSE_SLOW';

export interface ChronoEntitySnapshot {
  id: string;
  name: string;
  type: EntityType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
  radius: number;
  color: string | [number, number, number];
  isDead: boolean;
  temperature?: number;
  luminosity?: number;
}

export interface ChronoSnapshotFrame {
  frameId: number;
  simTime: number;
  tickCount: number;
  particleCount: number;
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  energies: Float32Array;
  healths: Float32Array;
  types: Uint8Array;
  entities: ChronoEntitySnapshot[];
}

export interface ChronoEventMarker {
  tick: number;
  type: 'SUPERNOVA' | 'BLACK_HOLE_SPAWN' | 'COLLISION' | 'PRESET_LOAD';
  label: string;
  simTime: number;
  frameIndex: number;
}

export interface ChronoTimelineState {
  mode: ChronoPlaybackMode;
  totalRecordedFrames: number;
  currentFrameIndex: number;
  bufferCapacity: number;
  oldestSimTime: number;
  newestSimTime: number;
  currentSimTime: number;
  timeOffsetSec: number;
  isLive: boolean;
  markersCount: number;
}
