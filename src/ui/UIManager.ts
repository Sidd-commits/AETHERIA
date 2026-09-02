import { getRequiredElement } from '../utils/dom';
import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import { HUDController } from './HUDController';
import { ChargeRingController } from './ChargeRingController';
import { ToastController } from './ToastController';
import { UniverseState } from '../types/universe';

/**
 * UI Manager
 * Orchestrates all UI overlays, controllers, HUD elements, and user button inputs
 */
export class UIManager {
  private commandBus: CommandBus;
  private worldState: WorldState;
  private hudController: HUDController;
  private chargeRingController: ChargeRingController;
  private toastController: ToastController;

  private videoElement: HTMLVideoElement;
  private toggleCamBtn: HTMLButtonElement;
  private themeCycleBtn: HTMLButtonElement;
  private explodeDemoBtn: HTMLButtonElement;

  constructor(
    worldState: WorldState,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
    this.worldState = worldState;
    this.commandBus = commandBus;

    this.hudController = new HUDController();
    this.chargeRingController = new ChargeRingController();
    this.toastController = new ToastController(this.commandBus);

    this.videoElement = getRequiredElement<HTMLVideoElement>('webcam-video');
    this.toggleCamBtn = getRequiredElement<HTMLButtonElement>('btn-toggle-cam');
    this.themeCycleBtn = getRequiredElement<HTMLButtonElement>('btn-theme-cycle');
    this.explodeDemoBtn = getRequiredElement<HTMLButtonElement>('btn-explode-demo');

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
      this.commandBus.dispatch('TRIGGER_EXPLOSION', { power: 1.0 }, 'UI');
      this.commandBus.dispatch('SHOW_TOAST', {
        message: '💥 Demo Supernova Triggered!',
        icon: '💥'
      }, 'UI');
    });
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
}
