import { getRequiredElement, getOptionalElement } from '../utils/dom';
import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import { HUDController } from './HUDController';
import { ChargeRingController } from './ChargeRingController';
import { ToastController } from './ToastController';
import { DebugOverlay } from './DebugOverlay';
import { UniverseControls } from './UniverseControls';
import { PopulationMonitor } from './PopulationMonitor';
import { VoiceAIHUD } from './VoiceAIHUD';
import { AIObservationPanel } from './AIObservationPanel';
import { WorldGenStudio } from './WorldGenStudio';
import { AIManager } from '../ai/AIManager';
import { UniverseState } from '../types/universe';
import { GestureDetector } from '../gestures/GestureDetector';

/**
 * UI Manager
 * Orchestrates all UI overlays, controllers, HUD elements, user button inputs,
 * debug visualizer, ecosystem population monitor, voice AI interface, AETHER observation panel,
 * and procedural universe simulation controls.
 */
export class UIManager {
  private commandBus: CommandBus;
  private worldState: WorldState;
  private hudController: HUDController;
  private chargeRingController: ChargeRingController;
  private toastController: ToastController;
  private debugOverlay: DebugOverlay;
  private universeControls: UniverseControls;
  private populationMonitor: PopulationMonitor;
  private voiceAIHUD: VoiceAIHUD;
  private observationPanel: AIObservationPanel;
  private worldGenStudio: WorldGenStudio;

  private videoElement: HTMLVideoElement;
  private toggleCamBtn: HTMLButtonElement;
  private themeCycleBtn: HTMLButtonElement;
  private explodeDemoBtn: HTMLButtonElement;
  private toggleDebugBtn: HTMLButtonElement | null = null;
  private toggleEcoBtn: HTMLButtonElement | null = null;
  private toggleVoiceBtn: HTMLButtonElement | null = null;
  private toggleAetherBtn: HTMLButtonElement | null = null;
  private toggleWorldGenBtn: HTMLButtonElement | null = null;

  constructor(
    worldState: WorldState,
    gestureDetector: GestureDetector,
    aiManager: AIManager,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
    this.worldState = worldState;
    this.commandBus = commandBus;

    this.hudController = new HUDController();
    this.chargeRingController = new ChargeRingController();
    this.toastController = new ToastController(this.commandBus);
    this.debugOverlay = new DebugOverlay(gestureDetector, this.commandBus);
    this.universeControls = new UniverseControls(this.commandBus);
    this.populationMonitor = new PopulationMonitor(this.commandBus);
    this.voiceAIHUD = new VoiceAIHUD(aiManager, this.commandBus);
    this.observationPanel = new AIObservationPanel(aiManager, this.commandBus);
    this.worldGenStudio = new WorldGenStudio(aiManager, this.commandBus);

    this.videoElement = getRequiredElement<HTMLVideoElement>('webcam-video');
    this.toggleCamBtn = getRequiredElement<HTMLButtonElement>('btn-toggle-cam');
    this.themeCycleBtn = getRequiredElement<HTMLButtonElement>('btn-theme-cycle');
    this.explodeDemoBtn = getRequiredElement<HTMLButtonElement>('btn-explode-demo');
    this.toggleDebugBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-debug');
    this.toggleEcoBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-eco');
    this.toggleVoiceBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-voice');
    this.toggleAetherBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-aether');
    this.toggleWorldGenBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-worldgen');

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

    if (this.toggleEcoBtn) {
      this.toggleEcoBtn.addEventListener('click', () => {
        const isVisible = this.populationMonitor.toggle();
        this.commandBus.dispatch('SHOW_TOAST', {
          message: isVisible ? '🌿 Population Monitor Open (Press E)' : '🌿 Population Monitor Hidden',
          icon: '🌿'
        }, 'UI');
      });
    }

    if (this.toggleVoiceBtn) {
      this.toggleVoiceBtn.addEventListener('click', () => {
        const isVisible = this.voiceAIHUD.toggle();
        this.commandBus.dispatch('SHOW_TOAST', {
          message: isVisible ? '🎙️ Voice AI HUD Open (Press V)' : '🎙️ Voice AI HUD Hidden',
          icon: '🎙️'
        }, 'UI');
      });
    }

    if (this.toggleAetherBtn) {
      this.toggleAetherBtn.addEventListener('click', () => {
        const isVisible = this.observationPanel.toggle();
        this.commandBus.dispatch('SHOW_TOAST', {
          message: isVisible ? '👁️ AETHER Observatory Open (Press A)' : '👁️ AETHER Observatory Hidden',
          icon: '👁️'
        }, 'UI');
      });
    }

    if (this.toggleWorldGenBtn) {
      this.toggleWorldGenBtn.addEventListener('click', () => {
        const isVisible = this.worldGenStudio.toggle();
        this.commandBus.dispatch('SHOW_TOAST', {
          message: isVisible ? '🌌 World Gen Studio Open (Press W)' : '🌌 World Gen Studio Hidden',
          icon: '🌌'
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

  public getPopulationMonitor(): PopulationMonitor {
    return this.populationMonitor;
  }

  public getVoiceAIHUD(): VoiceAIHUD {
    return this.voiceAIHUD;
  }

  public getAIObservationPanel(): AIObservationPanel {
    return this.observationPanel;
  }

  public getWorldGenStudio(): WorldGenStudio {
    return this.worldGenStudio;
  }
}
