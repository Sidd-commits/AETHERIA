import './styles/main.css';
import { CommandBus } from './core/CommandBus';
import { WorldState } from './core/WorldState';
import { UniverseEngine } from './universe/UniverseEngine';
import { SceneManager } from './rendering/SceneManager';
import { UniverseRenderer } from './rendering/UniverseRenderer';
import { RenderLoop } from './rendering/RenderLoop';
import { HandTracker } from './tracking/HandTracker';
import { GestureRecognizer } from './gestures/GestureRecognizer';
import { InputManager } from './input/InputManager';
import { AIManager } from './ai/AIManager';
import { UIManager } from './ui/UIManager';
import { WorldGenValidator } from './universe/generator/WorldGenValidator';
import { getRequiredElement } from './utils/dom';
import { ErrorBoundary } from './core/ErrorBoundary';
import { Logger } from './utils/logger';

const logger = Logger.create('AppBootstrap');
ErrorBoundary.initialize();

/**
 * AETHERIA Application Bootstrap Entry Point
 * Orchestrates UniverseEngine, decoupled Three.js visualizer,
 * gesture recognition engine, voice AI interface, and procedural simulation controls.
 */
export class AetheriaApp {
  public readonly commandBus: CommandBus;
  public readonly worldState: WorldState;
  public readonly universeEngine: UniverseEngine;
  public readonly sceneManager: SceneManager;
  public readonly universeRenderer: UniverseRenderer;
  public readonly renderLoop: RenderLoop;
  public readonly handTracker: HandTracker;
  public readonly gestureRecognizer: GestureRecognizer;
  public readonly inputManager: InputManager;
  public readonly aiManager: AIManager;
  public readonly uiManager: UIManager;

  constructor() {
    // 1. Core Event & State Subsystems
    this.commandBus = CommandBus.getInstance();
    this.worldState = new WorldState(this.commandBus);

    // 2. Procedural Universe Simulation Engine (Decoupled pure simulation)
    this.universeEngine = new UniverseEngine();

    // 3. Rendering Subsystem & Decoupled Three.js Visualizer
    const webglContainer = getRequiredElement<HTMLElement>('webgl-container');
    this.sceneManager = new SceneManager(webglContainer);
    this.universeRenderer = new UniverseRenderer();
    this.sceneManager.getParticleGroup().add(this.universeRenderer.getRootGroup());

    // 4. Gesture Recognition & Fallback Input Subsystems
    this.gestureRecognizer = new GestureRecognizer(this.worldState, this.commandBus);
    this.inputManager = new InputManager(this.worldState, this.commandBus);

    // 5. Voice AI Interface Subsystem (Decoupled NLP/LLM controller)
    this.aiManager = new AIManager(this.worldState, this.commandBus);

    // 6. Hand Tracking Vision Subsystem
    const videoElement = getRequiredElement<HTMLVideoElement>('webcam-video');
    const pipCanvas = getRequiredElement<HTMLCanvasElement>('pip-canvas');
    this.handTracker = new HandTracker(videoElement, pipCanvas, this.commandBus);

    // 7. User Interface Subsystem (with real-time Debug visualizer, Universe Controls, Voice AI & Performance HUD)
    this.uiManager = new UIManager(
      this.worldState,
      this.gestureRecognizer.getDetector(),
      this.aiManager,
      this.universeEngine,
      this.commandBus
    );

    // 8. Render Animation Loop (Synchronizes UniverseEngine with UniverseRenderer and Performance Monitor)
    this.renderLoop = new RenderLoop(
      this.sceneManager,
      this.universeEngine,
      this.universeRenderer,
      this.worldState,
      this.uiManager,
      () => this.handTracker.getVisionProcessingTimeMs()
    );

    this.wireEvents();
  }

  private wireEvents(): void {
    // Connect hand landmarks stream from tracker into gesture classification
    this.handTracker.setOnResults((hands) => {
      this.gestureRecognizer.processHands(hands);
    });

    // Wire simulation controls directly to command bus
    this.commandBus.on('SET_UNIVERSE_PRESET', (cmd) => {
      this.universeEngine.loadPreset(cmd.payload.preset);
    });

    this.commandBus.on('SET_TIME_SCALE', (cmd) => {
      this.universeEngine.setTimeScale(cmd.payload.scale);
    });

    this.commandBus.on('TOGGLE_PAUSE', (cmd) => {
      if (cmd.payload && cmd.payload.paused !== undefined) {
        this.universeEngine.setPaused(cmd.payload.paused);
      } else {
        this.universeEngine.togglePause();
      }
    });

    this.commandBus.on('RESET_UNIVERSE', (cmd) => {
      if (cmd.payload && cmd.payload.preset) {
        this.universeEngine.loadPreset(cmd.payload.preset);
      } else {
        this.universeEngine.reset();
      }
    });

    this.commandBus.on('TRIGGER_SUPERNOVA', (cmd) => {
      this.universeEngine.triggerSupernova(cmd.payload.power ?? 1.0);
    });

    this.commandBus.on('TRIGGER_EXPLOSION', (cmd) => {
      this.universeEngine.triggerSupernova(cmd.payload.power ?? 1.0);
    });

    this.commandBus.on('SPAWN_ENTITY', (cmd) => {
      const entity = cmd.payload.entity;
      if (entity.type === 'PLANET' && !entity.velocity) {
        this.universeEngine.createPlanet({
          name: entity.name,
          radius: entity.radius,
          mass: entity.mass,
          color: typeof entity.color === 'string' ? entity.color : undefined,
          orbitalRadius: entity.orbitalRadius,
          position: entity.position
        });
      } else {
        this.universeEngine.spawnEntity(entity);
      }
    });

    // Synchronize particle colors whenever the active cosmic palette changes
    let lastPaletteIndex = this.worldState.getState().activePaletteIndex;
    this.worldState.subscribe((state) => {
      if (state.activePaletteIndex !== lastPaletteIndex) {
        lastPaletteIndex = state.activePaletteIndex;
        this.universeEngine.applyPalette(lastPaletteIndex);
      }
    });

    this.commandBus.on('SPAWN_BLACK_HOLE', (cmd) => {
      this.universeEngine.spawnBlackHole(cmd.payload || {});
    });

    this.commandBus.on('UPDATE_BLACK_HOLE_PARAMS', (cmd) => {
      this.universeEngine.updateBlackHoleParams(cmd.payload);
    });

    this.commandBus.on('CLEAR_BLACK_HOLES', () => {
      this.universeEngine.clearBlackHoles();
    });

    // Emergent Particle Ecosystem Commands
    this.commandBus.on('SEED_ORGANISMS', (cmd) => {
      const count = cmd.payload?.count ?? 150;
      const origin = cmd.payload?.origin;
      this.universeEngine.seedOrganisms(count, origin);
    });

    this.commandBus.on('SPAWN_ENERGY_BURST', (cmd) => {
      const count = cmd.payload?.count ?? 250;
      const origin = cmd.payload?.origin;
      this.universeEngine.spawnEnergyBurst(count, origin);
    });

    this.commandBus.on('RESET_ECOSYSTEM', () => {
      this.universeEngine.resetEcosystem();
    });

    this.commandBus.on('TOGGLE_POPULATION_MONITOR', () => {
      const visible = this.uiManager.getPopulationMonitor().toggle();
      document.getElementById('btn-toggle-eco')?.classList.toggle('active-glow', visible);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: visible ? '🌿 Population Monitor Open (Press E)' : '🌿 Population Monitor Hidden',
          icon: '🌿'
        },
        'UI'
      );
    });

    // Voice AI Driven Simulation Commands
    this.commandBus.on('SET_GRAVITY', (cmd) => {
      if (cmd.payload?.gravityConstant !== undefined) {
        this.universeEngine.setGravity(cmd.payload.gravityConstant);
      } else if (cmd.payload?.multiplier !== undefined) {
        this.universeEngine.adjustGravity(cmd.payload.multiplier);
      }
    });

    this.commandBus.on('DESTROY_ENTITY', (cmd) => {
      this.universeEngine.destroyEntity(cmd.payload || {});
    });

    this.commandBus.on('ALIGN_ORBITS', (cmd) => {
      this.universeEngine.alignOrbits(cmd.payload?.center, cmd.payload?.speedMultiplier);
    });

    this.commandBus.on('TOGGLE_VOICE_AI', () => {
      const visible = this.uiManager.getVoiceAIHUD().toggle();
      document.getElementById('btn-toggle-voice')?.classList.toggle('active-glow', visible);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: visible ? '🎙️ Voice AI HUD Open (Press V)' : '🎙️ Voice AI HUD Hidden',
          icon: '🎙️'
        },
        'UI'
      );
    });

    this.commandBus.on('TOGGLE_WORLD_GEN', () => {
      const visible = this.uiManager.getWorldGenStudio().toggle();
      document.getElementById('btn-toggle-worldgen')?.classList.toggle('active-glow', visible);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: visible ? '🌌 World Gen Studio Open (Press W)' : '🌌 World Gen Studio Hidden',
          icon: '🌌'
        },
        'UI'
      );
    });

    this.commandBus.on('TOGGLE_INSPECTOR', () => {
      const visible = this.uiManager.getCelestialInspector().toggle();
      document.getElementById('btn-toggle-inspector')?.classList.toggle('active-glow', visible);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: visible ? '🪐 Celestial Inspector Active (Key I)' : '🌑 Celestial Inspector Hidden',
          icon: '🪐'
        },
        'UI'
      );
    });

    this.commandBus.on('TOGGLE_AETHER_OBSERVATORY', () => {
      const visible = this.uiManager.getAIObservationPanel().toggle();
      document.getElementById('btn-toggle-aether')?.classList.toggle('active-glow', visible);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: visible ? '👁️ AETHER Observatory Open (Press A)' : '👁️ AETHER Observatory Hidden',
          icon: '👁️'
        },
        'UI'
      );
    });

    this.commandBus.on('TOGGLE_DEBUG', () => {
      const visible = this.uiManager.getDebugOverlay().toggle();
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: visible ? '🛠️ Debug Mode Active (Press D)' : '🌑 Debug Mode Hidden',
          icon: '🛠️'
        },
        'UI'
      );
    });

    this.commandBus.on('TOGGLE_PERF', () => {
      const visible = this.uiManager.getPerformanceMonitor().toggle();
      document.getElementById('btn-toggle-perf')?.classList.toggle('active-glow', visible);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: visible ? '⚡ Performance HUD Active (Press P)' : '⚡ Performance HUD Hidden',
          icon: '⚡'
        },
        'UI'
      );
    });

    this.commandBus.on('GENERATE_PROCEDURAL_UNIVERSE', (cmd) => {
      const result = this.universeEngine.generateFromConfig(cmd.payload.config);
      const paletteIdx = WorldGenValidator.getPaletteIndex(cmd.payload.config.colorPalette);
      this.commandBus.dispatch('SET_PALETTE', { index: paletteIdx }, 'SYSTEM');
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `🌌 Generated Universe: ${cmd.payload.config.theme.toUpperCase()} (${result.entitiesGenerated.stars}★, ${result.entitiesGenerated.planets}♁, ${result.entitiesGenerated.blackHoles}🕳️)`,
          icon: '🪐'
        },
        'SYSTEM'
      );
    });

    // Orbital Trajectories & Spacetime Curvature Commands
    this.commandBus.on('TOGGLE_ORBITAL_TRAJECTORIES', () => {
      const active = this.universeEngine.toggleOrbitalTrajectories();
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: active ? '💫 Orbital Trajectories Active (Key: T)' : '🌑 Orbital Trajectories Hidden',
          icon: '💫'
        },
        'SYSTEM'
      );
    });

    this.commandBus.on('TOGGLE_SPACETIME_GRID', () => {
      const active = this.universeEngine.toggleSpacetimeGrid();
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: active ? '🌌 Spacetime Curvature Grid Active (Key: G)' : '🌑 Spacetime Grid Hidden',
          icon: '🌌'
        },
        'SYSTEM'
      );
    });

    this.commandBus.on('SET_INTEGRATOR_MODE', (cmd) => {
      let mode = cmd.payload?.mode;
      if (!mode) {
        mode = this.universeEngine.toggleIntegratorMode();
      } else {
        this.universeEngine.setIntegratorMode(mode);
      }
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `⚙️ Physics Integrator: ${mode === 'VERLET' ? 'Symplectic Velocity-Verlet (Energy Conserving)' : 'Semi-Implicit Euler (Max Throughput)'}`,
          icon: '⚙️'
        },
        'SYSTEM'
      );
    });

    // ChronoWarp Reversible Deterministic Timeline Commands
    this.commandBus.on('CHRONO_SET_MODE', (cmd) => {
      const mode = cmd.payload?.mode;
      if (mode === 'REVERSE') {
        const nextMode = this.universeEngine.rewindSimulation();
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message:
              nextMode === 'REVERSE'
                ? '⏪ ChronoWarp: Reverse Cosmic Playback Active'
                : '🔴 ChronoWarp: Resumed Live Simulation',
            icon: '⏳'
          },
          'SYSTEM'
        );
      } else {
        this.universeEngine.getChronoEngine().setPlaybackMode(mode);
      }
    });

    this.commandBus.on('CHRONO_SCRUB', (cmd) => {
      const offset = this.universeEngine.scrubSimulationTimeline(cmd.payload.ratio);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message:
            offset === 0
              ? '🔴 ChronoWarp: Live Real-Time'
              : `⏳ Scrubbed to ${offset.toFixed(2)}s in Cosmic History`,
          icon: '⏳'
        },
        'SYSTEM'
      );
    });

    this.commandBus.on('CHRONO_STEP', (cmd) => {
      const offset = this.universeEngine.stepSimulationTimeline(cmd.payload.delta);
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `⏳ Stepped Frame: ${offset.toFixed(2)}s from Live`,
          icon: '⏳'
        },
        'SYSTEM'
      );
    });

    this.commandBus.on('CHRONO_RESUME_LIVE', () => {
      this.universeEngine.resumeLiveSimulation();
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: '🔴 Resumed Live Real-Time Cosmic Simulation',
          icon: '🔴'
        },
        'SYSTEM'
      );
    });

    this.commandBus.on('CHRONO_REPLAY_LAST_EVENT', () => {
      const replayed = this.universeEngine.replayLastEvent();
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: replayed
            ? '↺ Rewound to pre-supernova event state'
            : '⚠️ No recent event bookmarks in timeline buffer',
          icon: '↺'
        },
        'SYSTEM'
      );
    });

    this.commandBus.on('CHRONO_TOGGLE_HUD', () => {
      this.uiManager.getChronoHUD().toggle();
    });

    this.commandBus.on('CAPTURE_SCREENSHOT', () => {
      const ok = this.sceneManager.captureScreenshot();
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: ok
            ? '📸 Cosmos PNG Snapshot Exported!'
            : '⚠️ Unable to capture WebGL snapshot',
          icon: ok ? '📸' : '⚠️'
        },
        'UI'
      );
    });

    this.commandBus.on('TOGGLE_SHORTCUTS', () => {
      this.uiManager.getShortcutsModal().toggle();
    });
  }

  public async start(): Promise<void> {
    // Start 60fps render loop
    this.renderLoop.start();

    // Start MediaPipe camera vision pipeline
    await this.handTracker.initialize();
  }
}

// Bootstrap application safely regardless of DOM load timing
function bootstrap(): void {
  try {
    logger.info('Initializing AETHERIA Universe Engine & Systems...');
    const app = new AetheriaApp();
    app.start();
    (window as any).__aetheriaApp = app;
    logger.info('AETHERIA successfully mounted and operational.');
  } catch (err) {
    logger.error('Failed to initialize Aetheria:', err);
    ErrorBoundary.getInstance().handleError(
      {
        message: err instanceof Error ? err.message : String(err),
        error: err,
        timestamp: new Date().toISOString()
      },
      true
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
