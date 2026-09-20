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
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(
    sceneManager: SceneManager,
    universeEngine: UniverseEngine,
    universeRenderer: UniverseRenderer,
    worldState: WorldState,
    uiManager?: UIManager
  ) {
    this.sceneManager = sceneManager;
    this.universeEngine = universeEngine;
    this.universeRenderer = universeRenderer;
    this.worldState = worldState;
    this.uiManager = uiManager || null;
    this.clock = new THREE.Clock();
  }

  public setUIManager(uiManager: UIManager): void {
    this.uiManager = uiManager;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
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

    const delta = Math.min(0.1, this.clock.getDelta());
    const state = this.worldState.getState();

    // 1. Advance charge timer
    this.worldState.updateChargeTick();

    // 2. Update Charge HUD ring
    if (this.uiManager) {
      this.uiManager.updateChargeHud(state);
    }

    // 3. Deterministic Universe Simulation Tick
    this.universeEngine.step(delta);

    // 4. Synchronize Decoupled Three.js Visualizer
    const snapshot = this.universeEngine.getSnapshot();
    this.universeRenderer.renderSnapshot(snapshot);

    // 5. Update Ecosystem Population Monitor & AETHER Observation Panel
    if (this.uiManager) {
      if (snapshot.ecosystemStats) {
        this.uiManager.getPopulationMonitor().update(snapshot.ecosystemStats);
      }

      // Generate compact aggregated telemetry (Zero raw particle array overhead)
      const telemetry = UniverseStateSummarizer.summarize(snapshot, this.universeEngine.getConfig());
      this.uiManager.getAIObservationPanel().update(telemetry);
    }

    // 6. Update scene group transforms (lerping position, rotation, scale)
    this.sceneManager.updateTransforms(
      state.targetPosition,
      state.targetRotation,
      state.targetScale
    );

    // 7. Render Three.js frame
    this.sceneManager.render();
  };
}
