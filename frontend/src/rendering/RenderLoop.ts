import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { UniverseEngine } from '../universe/UniverseEngine';
import { UniverseRenderer } from './UniverseRenderer';
import { WorldState } from '../core/WorldState';
import { UIManager } from '../ui/UIManager';
import { UniverseStateSummarizer } from '../ai/guardian/UniverseStateSummarizer';

/**
 * Main Render and Animation Loop
 * Ticks deterministic procedural universe simulation,
 * synchronizes decoupled Three.js visualizer, and executes render passes.
 */
export class RenderLoop {
  private sceneManager: SceneManager;
  private universeEngine: UniverseEngine;
  private universeRenderer: UniverseRenderer;
  private worldState: WorldState;
  private uiManager: UIManager | null = null;
  private getVisionTimeFn: (() => number) | null = null;
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  // Real-time FPS & Timing metrics
  private lastFrameTimestamp: number = performance.now();
  private frameTimes: number[] = [];
  private rollingFps: number = 60.0;
  private currentFrameTimeMs: number = 16.6;
  private physicsTimeMs: number = 0;
  private renderTimeMs: number = 0;

  constructor(
    sceneManager: SceneManager,
    universeEngine: UniverseEngine,
    universeRenderer: UniverseRenderer,
    worldState: WorldState,
    uiManager?: UIManager,
    getVisionTimeFn?: () => number
  ) {
    this.sceneManager = sceneManager;
    this.universeEngine = universeEngine;
    this.universeRenderer = universeRenderer;
    this.worldState = worldState;
    this.uiManager = uiManager || null;
    this.getVisionTimeFn = getVisionTimeFn || null;
    this.clock = new THREE.Clock();
  }

  public setUIManager(uiManager: UIManager): void {
    this.uiManager = uiManager;
  }

  public setVisionTimeGetter(fn: () => number): void {
    this.getVisionTimeFn = fn;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTimestamp = performance.now();
    this.clock.start();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const frameDeltaMs = now - this.lastFrameTimestamp;
    this.lastFrameTimestamp = now;
    this.currentFrameTimeMs = frameDeltaMs;

    // Rolling FPS calculation
    this.frameTimes.push(frameDeltaMs);
    if (this.frameTimes.length > 30) this.frameTimes.shift();
    const avgFrameMs = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.rollingFps = avgFrameMs > 0 ? 1000 / avgFrameMs : 60.0;

    const delta = Math.min(0.1, this.clock.getDelta());
    const state = this.worldState.getState();

    // 1. Advance charge timer
    this.worldState.updateChargeTick();

    // 2. Update Charge HUD ring
    if (this.uiManager) {
      this.uiManager.updateChargeHud(state);
    }

    // 3. Deterministic Universe Simulation Tick (Timed)
    const tPhysicsStart = performance.now();
    this.universeEngine.step(delta);
    this.physicsTimeMs = performance.now() - tPhysicsStart;

    // 4. Synchronize Decoupled Three.js Visualizer (Timed)
    const tRenderStart = performance.now();
    const snapshot = this.universeEngine.getSnapshot();
    this.universeRenderer.renderSnapshot(snapshot);

    // 5. Update Ecosystem Population Monitor & AETHER Observation Panel
    if (this.uiManager) {
      if (snapshot.ecosystemStats) {
        this.uiManager.getPopulationMonitor().update(snapshot.ecosystemStats);
      }

      // Generate compact aggregated telemetry (Zero raw particle array overhead)
      const telemetry = UniverseStateSummarizer.summarize(
        snapshot,
        this.universeEngine.getConfig()
      );
      this.uiManager.getAIObservationPanel().update(telemetry);

      // Feed FPS into QualityScaler
      this.uiManager.getQualityScaler().updateFPS(this.rollingFps);

      // Query Memory where available
      let memoryMb: number | null = null;
      if (typeof window !== 'undefined' && (performance as any).memory) {
        memoryMb = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
      }

      // Update Performance Monitor HUD
      const visionMs = this.getVisionTimeFn ? this.getVisionTimeFn() : 0;
      this.uiManager.getPerformanceMonitor().update({
        fps: this.rollingFps,
        frameTimeMs: this.currentFrameTimeMs,
        physicsTimeMs: this.physicsTimeMs,
        visionTimeMs: visionMs,
        renderTimeMs: this.renderTimeMs,
        activeParticles: snapshot.particles.count,
        maxParticles: snapshot.particles.maxCount,
        memoryUsageMb: memoryMb
      });
    }

    // 6. Update scene group transforms (lerping position, rotation, scale)
    this.sceneManager.updateTransforms(
      state.targetPosition,
      state.targetRotation,
      state.targetScale
    );

    // 7. Render Three.js frame
    this.sceneManager.render();
    this.renderTimeMs = performance.now() - tRenderStart;
  };
}
