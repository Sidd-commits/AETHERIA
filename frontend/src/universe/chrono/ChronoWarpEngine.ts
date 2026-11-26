import { CosmicParticleBuffer, UniverseEntity } from '../../types/entity';
import {
  ChronoPlaybackMode,
  ChronoSnapshotFrame,
  ChronoEventMarker,
  ChronoTimelineState,
  ChronoEntitySnapshot
} from '../../types/chrono';

/**
 * ChronoWarp Engine
 * Zero-allocation, ring-buffered temporal state journal.
 * Allows reversible deterministic time-scrubbing, cosmic event replays,
 * and frame-by-frame forward/reverse stepping through high-dimensional
 * particle and celestial state vectors.
 */
export class ChronoWarpEngine {
  private readonly capacity: number;
  private readonly maxParticles: number;
  private readonly maxEntities: number;

  private frames: ChronoSnapshotFrame[];
  private markers: ChronoEventMarker[] = [];

  private writeHead: number = 0;
  private recordedCount: number = 0;
  private playbackSlot: number = -1; // -1 indicates LIVE head
  private mode: ChronoPlaybackMode = 'LIVE';

  // Throttle recording to every N ticks (e.g. 2 ticks = 30 Hz at 60 FPS)
  private recordingIntervalTicks: number = 2;
  private lastRecordedTick: number = -1;

  constructor(capacity: number = 360, maxParticles: number = 16000, maxEntities: number = 120) {
    this.capacity = capacity;
    this.maxParticles = maxParticles;
    this.maxEntities = maxEntities;

    // Pre-allocate all ring buffer frames and typed arrays once to guarantee 0 GC during simulation
    this.frames = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      const entityPool: ChronoEntitySnapshot[] = new Array(maxEntities);
      for (let j = 0; j < maxEntities; j++) {
        entityPool[j] = {
          id: '',
          name: '',
          type: 'PLANET',
          x: 0,
          y: 0,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          mass: 1,
          radius: 1,
          color: '#ffffff',
          isDead: false
        };
      }

      this.frames[i] = {
        frameId: -1,
        simTime: 0,
        tickCount: 0,
        particleCount: 0,
        positions: new Float32Array(maxParticles * 3),
        velocities: new Float32Array(maxParticles * 3),
        colors: new Float32Array(maxParticles * 3),
        energies: new Float32Array(maxParticles),
        healths: new Float32Array(maxParticles),
        types: new Uint8Array(maxParticles),
        entities: entityPool
      };
    }
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getMode(): ChronoPlaybackMode {
    return this.mode;
  }

  public isLive(): boolean {
    return this.mode === 'LIVE' && this.playbackSlot === -1;
  }

  public isReverse(): boolean {
    return this.mode === 'REVERSE' || this.mode === 'REVERSE_SLOW';
  }

  public setRecordingInterval(ticks: number): void {
    this.recordingIntervalTicks = Math.max(1, ticks);
  }

  /**
   * Record current simulation state into the circular ring buffer.
   * Zero heap allocations. Uses TypedArray.set() for raw memory throughput.
   */
  public recordTick(
    tickCount: number,
    simTime: number,
    particleBuffer: CosmicParticleBuffer,
    entities: readonly UniverseEntity[]
  ): void {
    // Only record in LIVE mode or when advancing forward
    if (this.mode !== 'LIVE' && this.playbackSlot !== -1) {
      return;
    }

    if (tickCount - this.lastRecordedTick < this.recordingIntervalTicks) {
      return;
    }
    this.lastRecordedTick = tickCount;

    const frame = this.frames[this.writeHead];
    frame.frameId = tickCount;
    frame.tickCount = tickCount;
    frame.simTime = simTime;

    // 1. Copy active particles
    const pCount = Math.min(particleBuffer.count, this.maxParticles);
    frame.particleCount = pCount;

    const pCoords = pCount * 3;
    frame.positions.set(particleBuffer.positions.subarray(0, pCoords));
    frame.velocities.set(particleBuffer.velocities.subarray(0, pCoords));
    frame.colors.set(particleBuffer.colors.subarray(0, pCoords));
    frame.energies.set(particleBuffer.energies.subarray(0, pCount));
    frame.healths.set(particleBuffer.healths.subarray(0, pCount));
    frame.types.set(particleBuffer.types.subarray(0, pCount));

    // 2. Copy celestial entities
    const eCount = Math.min(entities.length, this.maxEntities);
    for (let i = 0; i < eCount; i++) {
      const src = entities[i];
      const dst = frame.entities[i];
      dst.id = src.id;
      dst.name = src.name;
      dst.type = src.type;
      dst.x = src.position.x;
      dst.y = src.position.y;
      dst.z = src.position.z;
      dst.vx = src.velocity.x;
      dst.vy = src.velocity.y;
      dst.vz = src.velocity.z;
      dst.mass = src.mass;
      dst.radius = src.radius;
      dst.color = src.color;
      dst.isDead = src.isDead;
      dst.temperature = src.temperature;
      dst.luminosity = src.luminosity;
    }

    // Clear trailing entity slots so shrinking entity lists never retain stale IDs across wraps
    for (let i = eCount; i < this.maxEntities; i++) {
      if (!frame.entities[i].id) break;
      frame.entities[i].id = '';
    }

    // Advance circular write head
    this.writeHead = (this.writeHead + 1) % this.capacity;
    if (this.recordedCount < this.capacity) {
      this.recordedCount++;
    }
  }

  /**
   * Bookmark a notable cosmic event (e.g. Supernova detonation, Singularity creation)
   */
  public recordEventMarker(
    type: 'SUPERNOVA' | 'BLACK_HOLE_SPAWN' | 'COLLISION' | 'PRESET_LOAD',
    label: string,
    simTime: number,
    tickCount: number
  ): void {
    const slot = (this.writeHead - 1 + this.capacity) % this.capacity;
    this.markers.push({
      type,
      label,
      simTime,
      tick: tickCount,
      frameIndex: slot
    });

    // Keep up to 20 markers
    if (this.markers.length > 20) {
      this.markers.shift();
    }
  }

  /**
   * Restore state from a specific frame slot into active simulation buffers
   */
  private applyFrameToSimulation(
    slotIndex: number,
    particleBuffer: CosmicParticleBuffer,
    entities: UniverseEntity[]
  ): void {
    const frame = this.frames[slotIndex];
    if (!frame || frame.frameId < 0) return;

    // 1. Restore particles
    particleBuffer.count = frame.particleCount;
    const pCoords = frame.particleCount * 3;
    particleBuffer.positions.set(frame.positions.subarray(0, pCoords));
    particleBuffer.velocities.set(frame.velocities.subarray(0, pCoords));
    particleBuffer.colors.set(frame.colors.subarray(0, pCoords));
    particleBuffer.energies.set(frame.energies.subarray(0, frame.particleCount));
    particleBuffer.healths.set(frame.healths.subarray(0, frame.particleCount));
    particleBuffer.types.set(frame.types.subarray(0, frame.particleCount));

    // 2. Restore entities
    const restoredIds = new Set<string>();
    const entityCount = frame.entities.length;
    for (let i = 0; i < entityCount; i++) {
      const snap = frame.entities[i];
      if (!snap.id) continue;
      restoredIds.add(snap.id);

      let target = entities.find((e) => e.id === snap.id);
      if (!target && i < entities.length && !restoredIds.has(entities[i].id)) {
        target = entities[i];
      }

      if (target) {
        target.id = snap.id;
        target.name = snap.name;
        target.type = snap.type;
        target.position.x = snap.x;
        target.position.y = snap.y;
        target.position.z = snap.z;
        target.velocity.x = snap.vx;
        target.velocity.y = snap.vy;
        target.velocity.z = snap.vz;
        target.mass = snap.mass;
        target.radius = snap.radius;
        target.color = snap.color;
        target.isDead = snap.isDead;
        if (snap.temperature !== undefined) target.temperature = snap.temperature;
        if (snap.luminosity !== undefined) target.luminosity = snap.luminosity;
      }
    }

    // Hide entities spawned after this historical snapshot without losing their objects for forward scrubbing
    for (let i = 0; i < entities.length; i++) {
      if (!restoredIds.has(entities[i].id)) {
        entities[i].isDead = true;
      }
    }
  }

  /**
   * Scrub simulation state to a normalized timeline ratio (0.0 = oldest recorded, 1.0 = newest/live)
   */
  public scrubToNormalized(
    ratio: number,
    particleBuffer: CosmicParticleBuffer,
    entities: UniverseEntity[]
  ): number {
    if (this.recordedCount === 0) return 0;

    const clampedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 1.0;
    if (clampedRatio >= 0.999) {
      this.resumeLive();
      return 0;
    }

    this.mode = 'SCRUBBING';
    const offsetFromOldest = Math.round(clampedRatio * (this.recordedCount - 1));
    const oldestSlot = (this.writeHead - this.recordedCount + this.capacity) % this.capacity;
    const targetSlot = (oldestSlot + offsetFromOldest) % this.capacity;

    this.playbackSlot = targetSlot;
    this.applyFrameToSimulation(targetSlot, particleBuffer, entities);

    return this.getTimeOffsetFromLive();
  }

  /**
   * Step backward or forward in temporal history by a discrete frame count
   */
  public step(
    delta: number,
    particleBuffer: CosmicParticleBuffer,
    entities: UniverseEntity[]
  ): number {
    if (this.recordedCount <= 1) return 0;

    const safeDelta = Number.isFinite(delta) ? Math.round(delta) : 0;
    if (safeDelta === 0) return this.getTimeOffsetFromLive();

    if (this.playbackSlot === -1) {
      // Stepping back from live
      this.playbackSlot = (this.writeHead - 1 + this.capacity) % this.capacity;
    }

    this.mode = 'SCRUBBING';
    const oldestSlot = (this.writeHead - this.recordedCount + this.capacity) % this.capacity;

    let targetSlot = (this.playbackSlot + safeDelta + this.capacity) % this.capacity;

    // Clamp within available recorded range
    const currentOffset = (this.playbackSlot - oldestSlot + this.capacity) % this.capacity;
    const newOffset = currentOffset + safeDelta;

    if (newOffset <= 0) {
      targetSlot = oldestSlot;
    } else if (newOffset >= this.recordedCount - 1) {
      this.resumeLive();
      return 0;
    } else {
      targetSlot = (oldestSlot + newOffset) % this.capacity;
    }

    this.playbackSlot = targetSlot;
    this.applyFrameToSimulation(targetSlot, particleBuffer, entities);

    return this.getTimeOffsetFromLive();
  }

  /**
   * Automatically step simulation backward during reverse playback tick
   */
  public tickReverse(particleBuffer: CosmicParticleBuffer, entities: UniverseEntity[]): boolean {
    if (this.recordedCount <= 1) {
      this.resumeLive();
      return false;
    }

    const stepDelta = this.mode === 'REVERSE_SLOW' ? -1 : -2;
    this.step(stepDelta, particleBuffer, entities);

    const oldestSlot = (this.writeHead - this.recordedCount + this.capacity) % this.capacity;
    if (this.playbackSlot === oldestSlot) {
      // Reached boundary of recorded history
      this.mode = 'SCRUBBING';
      return false;
    }
    return true;
  }

  /**
   * Switch temporal playback mode
   */
  public setPlaybackMode(mode: ChronoPlaybackMode): void {
    this.mode = mode;
    if (mode === 'LIVE') {
      this.playbackSlot = -1;
    } else if (this.playbackSlot === -1 && this.recordedCount > 0) {
      this.playbackSlot = (this.writeHead - 1 + this.capacity) % this.capacity;
    }
  }

  /**
   * Toggle reverse playback
   */
  public toggleReverse(): ChronoPlaybackMode {
    if (this.mode === 'REVERSE') {
      this.resumeLive();
    } else {
      this.setPlaybackMode('REVERSE');
    }
    return this.mode;
  }

  /**
   * Return immediately to real-time forward simulation execution
   */
  public resumeLive(): void {
    this.mode = 'LIVE';
    this.playbackSlot = -1;
  }

  /**
   * Jump immediately to before the most recent cosmic event marker (e.g. Supernova)
   */
  public jumpToLastMarker(
    particleBuffer: CosmicParticleBuffer,
    entities: UniverseEntity[]
  ): ChronoEventMarker | null {
    if (this.markers.length === 0) return null;

    const marker = this.markers[this.markers.length - 1];
    // Jump to 10-15 frames before the event to show the build-up
    const jumpSlot = (marker.frameIndex - 12 + this.capacity) % this.capacity;
    this.mode = 'SCRUBBING';
    this.playbackSlot = jumpSlot;
    this.applyFrameToSimulation(jumpSlot, particleBuffer, entities);
    return marker;
  }

  /**
   * Calculate temporal time delta in seconds between active playback frame and newest live state
   */
  public getTimeOffsetFromLive(): number {
    if (this.playbackSlot === -1 || this.recordedCount === 0) return 0;

    const newestSlot = (this.writeHead - 1 + this.capacity) % this.capacity;
    const newestTime = this.frames[newestSlot].simTime;
    const activeTime = this.frames[this.playbackSlot].simTime;

    return Math.min(0, activeTime - newestTime);
  }

  /**
   * Produce comprehensive timeline telemetry state for UI scrubbers and HUDs
   */
  public getState(): ChronoTimelineState {
    const oldestSlot = (this.writeHead - this.recordedCount + this.capacity) % this.capacity;
    const newestSlot = (this.writeHead - 1 + this.capacity) % this.capacity;

    const oldestSimTime = this.recordedCount > 0 ? this.frames[oldestSlot].simTime : 0;
    const newestSimTime = this.recordedCount > 0 ? this.frames[newestSlot].simTime : 0;
    const currentSimTime =
      this.playbackSlot !== -1 && this.recordedCount > 0
        ? this.frames[this.playbackSlot].simTime
        : newestSimTime;

    return {
      mode: this.mode,
      totalRecordedFrames: this.recordedCount,
      currentFrameIndex: this.playbackSlot,
      bufferCapacity: this.capacity,
      oldestSimTime,
      newestSimTime,
      currentSimTime,
      timeOffsetSec: this.getTimeOffsetFromLive(),
      isLive: this.isLive(),
      markersCount: this.markers.length
    };
  }

  public getEventMarkers(): readonly ChronoEventMarker[] {
    return this.markers;
  }

  public reset(): void {
    this.writeHead = 0;
    this.recordedCount = 0;
    this.playbackSlot = -1;
    this.mode = 'LIVE';
    this.markers.length = 0;
    this.lastRecordedTick = -1;
  }
}
