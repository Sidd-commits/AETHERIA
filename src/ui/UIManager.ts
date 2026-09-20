import { getRequiredElement, getOptionalElement } from '../utils/dom';
import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import { HUDController } from './HUDController';
import { ChargeRingController } from './ChargeRingController';
import { ToastController } from './ToastController';
import { DebugOverlay } from './DebugOverlay';
import { UniverseControls } from './UniverseControls';
import { UniverseState } from '../types/universe';
import { GestureDetector } from '../gestures/GestureDetector';

/**
 * UI Manager
 * Orchestrates all UI overlays, controllers, HUD elements, user button inputs,
 * debug visualizer, and procedural universe simulation controls.
 */
export class UIManager {
  private commandBus: CommandBus;
  private worldState: WorldState;
  private hudController: HUDController;
  private chargeRingController: ChargeRingController;
  private toastController: ToastController;
  private debugOverlay: DebugOverlay;
  private universeControls: UniverseControls;

  private videoElement: HTMLVideoElement;
  private toggleCamBtn: HTMLButtonElement;
  private themeCycleBtn: HTMLButtonElement;
  private explodeDemoBtn: HTMLButtonElement;
  private toggleDebugBtn: HTMLButtonElement | null = null;

  constructor(
    worldState: WorldState,
    gestureDetector: GestureDetector,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
    this.worldState = worldState;
    this.commandBus = commandBus;

    this.hudController = new HUDController();
    this.chargeRingController = new ChargeRingController();
    this.toastController = new ToastController(this.commandBus);
    this.debugOverlay = new DebugOverlay(gestureDetector, this.commandBus);
    this.universeControls = new UniverseControls(this.commandBus);

    this.videoElement = getRequiredElement<HTMLVideoElement>('webcam-video');
    this.toggleCamBtn = getRequiredElement<HTMLButtonElement>('btn-toggle-cam');
    this.themeCycleBtn = getRequiredElement<HTMLButtonElement>('btn-theme-cycle');
    this.explodeDemoBtn = getRequiredElement<HTMLButtonElement>('btn-explode-demo');
    this.toggleDebugBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-debug');

    this.bindButtons();
    this.bindStateUpdates();
  }

  private bindButtons(): void {
    this.toggleCamBtn.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_WEBCAM_BACKGROUND', undefined, 'UI');
    });

    this.themeCycleBtn.addEventListener('click', () => {
      this.commandBus.dispatch('CYCLE_PALETTE', undefined, 'UI');
    });

    this.explodeDemoBtn.addEventListener('click', () => {
      this.commandBus.dispatch('TRIGGER_SUPERNOVA', { power: 1.0 }, 'UI');
      this.commandBus.dispatch('SHOW_TOAST', {
        message: '💥 Supernova Explosion Triggered!',
        icon: '💥'
      }, 'UI');
    });

    if (this.toggleDebugBtn) {
      this.toggleDebugBtn.addEventListener('click', () => {
        const isDebug = this.debugOverlay.toggle();
        this.commandBus.dispatch('SHOW_TOAST', {
          message: isDebug ? '🛠️ Debug Mode Active (Press D)' : '🌑 Debug Mode Hidden',
          icon: '🛠️'
        }, 'UI');
      });
    }
  }

  private bindStateUpdates(): void {
    this.worldState.subscribe((state) => {
      this.hudController.update(state);
      this.chargeRingController.update(state);

      // Webcam backdrop toggle reflection
      if (state.isWebcamBackground) {
        this.videoElement.classList.add('active-fullscreen');
        this.toggleCamBtn.classList.add('active-glow');
      } else {
        this.videoElement.classList.remove('active-fullscreen');
        this.toggleCamBtn.classList.remove('active-glow');
      }
    });
  }

  /**
   * Called per frame by RenderLoop for smooth 60fps charge meter animation
   */
  public updateChargeHud(state: Readonly<UniverseState>): void {
    this.chargeRingController.update(state);
  }

  public getToastController(): ToastController {
    return this.toastController;
  }

  public getDebugOverlay(): DebugOverlay {
    return this.debugOverlay;
  }

  public getUniverseControls(): UniverseControls {
    return this.universeControls;
  }
}
