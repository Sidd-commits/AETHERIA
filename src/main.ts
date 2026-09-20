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
import { UIManager } from './ui/UIManager';
import { getRequiredElement } from './utils/dom';

/**
 * AETHERIA Application Bootstrap Entry Point
 * Orchestrates UniverseEngine, decoupled Three.js visualizer,
 * gesture recognition engine, and procedural simulation controls.
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

    // 5. User Interface Subsystem (with real-time Debug visualizer & Universe Controls)
    this.uiManager = new UIManager(
      this.worldState,
      this.gestureRecognizer.getDetector(),
      this.commandBus
    );

    // 6. Render Animation Loop (Synchronizes UniverseEngine with UniverseRenderer)
    this.renderLoop = new RenderLoop(
      this.sceneManager,
      this.universeEngine,
      this.universeRenderer,
      this.worldState,
      this.uiManager
    );

    // 7. Hand Tracking Vision Subsystem
    const videoElement = getRequiredElement<HTMLVideoElement>('webcam-video');
    const pipCanvas = getRequiredElement<HTMLCanvasElement>('pip-canvas');
    this.handTracker = new HandTracker(videoElement, pipCanvas, this.commandBus);

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
      this.universeEngine.spawnEntity(cmd.payload.entity);
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
    const app = new AetheriaApp();
    app.start();
    (window as any).__aetheriaApp = app;
  } catch (err) {
    console.error('Failed to initialize Aetheria:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
