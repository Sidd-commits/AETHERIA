import { getOptionalElement } from '../utils/dom';
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
import { PerformanceMonitor } from './PerformanceMonitor';
import { CelestialInspectorHUD } from './CelestialInspectorHUD';
import { ChronoScrubberHUD } from './ChronoScrubberHUD';
import { ShortcutsModal } from './ShortcutsModal';
import { QualityScaler } from '../core/QualityScaler';
import { BackendApiClient } from '../services/BackendApiClient';
import { UniverseEngine } from '../universe/UniverseEngine';
import { AIManager } from '../ai/AIManager';
import { UniverseState, UniverseSnapshot } from '../types/universe';
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
  private qualityScaler: QualityScaler;
  private perfMonitor: PerformanceMonitor;
  private celestialInspector: CelestialInspectorHUD;
  private chronoHUD: ChronoScrubberHUD;
  private shortcutsModal: ShortcutsModal;
  private backendClient: BackendApiClient;

  private videoElement: HTMLVideoElement | null = null;
  private toggleCamBtn: HTMLButtonElement | null = null;
  private themeCycleBtn: HTMLButtonElement | null = null;
  private toggleDebugBtn: HTMLButtonElement | null = null;
  private toggleEcoBtn: HTMLButtonElement | null = null;
  private toggleVoiceBtn: HTMLButtonElement | null = null;
  private toggleAetherBtn: HTMLButtonElement | null = null;
  private toggleWorldGenBtn: HTMLButtonElement | null = null;
  private togglePerfBtn: HTMLButtonElement | null = null;
  private toggleInspectorBtn: HTMLButtonElement | null = null;
  private toggleShortcutsBtn: HTMLButtonElement | null = null;

  constructor(
    worldState: WorldState,
    gestureDetector: GestureDetector,
    aiManager: AIManager,
    universeEngine: UniverseEngine,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
    this.worldState = worldState;
    this.commandBus = commandBus;

    this.qualityScaler = new QualityScaler(universeEngine, this.commandBus);
    this.perfMonitor = new PerformanceMonitor(this.qualityScaler);
    this.celestialInspector = new CelestialInspectorHUD(this.commandBus);
    this.chronoHUD = new ChronoScrubberHUD(this.commandBus);
    this.shortcutsModal = new ShortcutsModal();
    this.backendClient = new BackendApiClient();

    this.hudController = new HUDController();
    this.chargeRingController = new ChargeRingController();
    this.toastController = new ToastController(this.commandBus);
    this.debugOverlay = new DebugOverlay(gestureDetector, this.commandBus);
    this.universeControls = new UniverseControls(this.commandBus);
    this.populationMonitor = new PopulationMonitor(this.commandBus);
    this.voiceAIHUD = new VoiceAIHUD(aiManager, this.commandBus);
    this.observationPanel = new AIObservationPanel(aiManager, this.commandBus);
    this.worldGenStudio = new WorldGenStudio(aiManager, this.commandBus);

    this.videoElement = getOptionalElement<HTMLVideoElement>('webcam-video');
    this.toggleCamBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-cam');
    this.themeCycleBtn = getOptionalElement<HTMLButtonElement>('btn-theme-cycle');
    this.toggleDebugBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-debug');
    this.toggleEcoBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-eco');
    this.toggleVoiceBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-voice');
    this.toggleAetherBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-aether');
    this.toggleWorldGenBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-worldgen');
    this.togglePerfBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-perf');
    this.toggleInspectorBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-inspector');
    this.toggleShortcutsBtn = getOptionalElement<HTMLButtonElement>('btn-toggle-shortcuts');

    this.bindButtons();
    this.bindStateUpdates();
    this.checkBackendStatus();
  }

  private async checkBackendStatus(): Promise<void> {
    const badge = getOptionalElement('backend-status-badge');
    if (!badge) return;
    const status = await this.backendClient.checkHealth();
    badge.classList.remove('online', 'offline');
    if (status.online) {
      badge.classList.add('online');
      badge.textContent = 'API: ONLINE';
      badge.title = `Backend service connected (${this.backendClient.getBaseUrl()})`;
    } else {
      badge.classList.add('offline');
      badge.textContent = 'STANDALONE';
      badge.title = 'Running in 100% client-side offline simulation mode';
    }
  }

  private bindButtons(): void {
    this.toggleCamBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_WEBCAM_BACKGROUND', undefined, 'UI');
    });

    this.themeCycleBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('CYCLE_PALETTE', undefined, 'UI');
    });

    this.toggleDebugBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_DEBUG', undefined, 'UI');
    });

    this.toggleEcoBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_POPULATION_MONITOR', undefined, 'UI');
    });

    this.toggleVoiceBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_VOICE_AI', undefined, 'UI');
    });

    this.toggleAetherBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_AETHER_OBSERVATORY', undefined, 'UI');
    });

    this.toggleWorldGenBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_WORLD_GEN', undefined, 'UI');
    });

    this.togglePerfBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_PERF', undefined, 'UI');
    });

    this.toggleInspectorBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_INSPECTOR', undefined, 'UI');
    });

    this.toggleShortcutsBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_SHORTCUTS', undefined, 'UI');
    });

    // Reflect initial Ecosystem Monitor visibility on header nav button
    if (this.toggleEcoBtn && this.populationMonitor.getIsVisible()) {
      this.toggleEcoBtn.classList.add('active-glow');
    }
  }

  private bindStateUpdates(): void {
    this.worldState.subscribe((state) => {
      this.hudController.update(state);
      this.chargeRingController.update(state);

      // Webcam backdrop toggle reflection
      if (state.isWebcamBackground) {
        this.videoElement?.classList.add('active-fullscreen');
        this.toggleCamBtn?.classList.add('active-glow');
      } else {
        this.videoElement?.classList.remove('active-fullscreen');
        this.toggleCamBtn?.classList.remove('active-glow');
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

  public getQualityScaler(): QualityScaler {
    return this.qualityScaler;
  }

  public getPerformanceMonitor(): PerformanceMonitor {
    return this.perfMonitor;
  }

  public getCelestialInspector(): CelestialInspectorHUD {
    return this.celestialInspector;
  }

  public updateCelestialInspector(snapshot: UniverseSnapshot): void {
    this.celestialInspector.update(snapshot);
    this.chronoHUD.update(snapshot);
  }

  public getChronoHUD(): ChronoScrubberHUD {
    return this.chronoHUD;
  }

  public getShortcutsModal(): ShortcutsModal {
    return this.shortcutsModal;
  }
}
