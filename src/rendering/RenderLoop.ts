import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { ParticleSimulator } from '../simulation/ParticleSimulator';
import { ParticleRenderer } from './ParticleRenderer';
import { WorldState } from '../core/WorldState';
import { UIManager } from '../ui/UIManager';

/**
 * Main Render and Animation Loop
 * Ticks physics simulation, interpolates world state transforms, and executes render passes
 */
export class RenderLoop {
  private sceneManager: SceneManager;
  private simulator: ParticleSimulator;
  private particleRenderer: ParticleRenderer;
  private worldState: WorldState;
  private uiManager: UIManager | null = null;
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(
    sceneManager: SceneManager,
    simulator: ParticleSimulator,
    particleRenderer: ParticleRenderer,
    worldState: WorldState,
    uiManager?: UIManager
  ) {
    this.sceneManager = sceneManager;
    this.simulator = simulator;
    this.particleRenderer = particleRenderer;
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

    const elapsedTime = this.clock.getElapsedTime();
    const state = this.worldState.getState();

    // 1. Advance charge timer
    const currentCharge = this.worldState.updateChargeTick();

    // 2. Update Charge HUD ring
    if (this.uiManager) {
      this.uiManager.updateChargeHud(state);
    }

    // 3. Advance particle simulation step
    this.simulator.update(elapsedTime, state.isCharging, currentCharge);

    // 4. Mark GPU buffers dirty for upload
    this.particleRenderer.updateBuffers();

    // 5. Update scene group transforms (lerping position, rotation, scale)
    this.sceneManager.updateTransforms(
      state.targetPosition,
      state.targetRotation,
      state.targetScale
    );

    // 6. Render Three.js frame
    this.sceneManager.render();
  };
}
