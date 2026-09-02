import './styles/main.css';
import { CommandBus } from './core/CommandBus';
import { WorldState } from './core/WorldState';
import { PhysicsEngine } from './physics/PhysicsEngine';
import { ParticleSimulator } from './simulation/ParticleSimulator';
import { SceneManager } from './rendering/SceneManager';
import { ParticleRenderer } from './rendering/ParticleRenderer';
import { RenderLoop } from './rendering/RenderLoop';
import { HandTracker } from './tracking/HandTracker';
import { GestureRecognizer } from './gestures/GestureRecognizer';
import { InputManager } from './input/InputManager';
import { UIManager } from './ui/UIManager';
import { getRequiredElement } from './utils/dom';
import { DEFAULT_PHYSICS_CONFIG } from './config/constants';

/**
 * AETHERIA Application Bootstrap Entry Point
 */
export class AetheriaApp {
  public readonly commandBus: CommandBus;
  public readonly worldState: WorldState;
  public readonly physicsEngine: PhysicsEngine;
  public readonly particleSimulator: ParticleSimulator;
  public readonly sceneManager: SceneManager;
  public readonly particleRenderer: ParticleRenderer;
  public readonly renderLoop: RenderLoop;
  public readonly handTracker: HandTracker;
  public readonly gestureRecognizer: GestureRecognizer;
  public readonly inputManager: InputManager;
  public readonly uiManager: UIManager;

  constructor() {
    // 1. Core Event & State Subsystems
    this.commandBus = CommandBus.getInstance();
    this.worldState = new WorldState(this.commandBus);

    // 2. Physics & Particle Simulation Subsystems
    this.physicsEngine = new PhysicsEngine(DEFAULT_PHYSICS_CONFIG);
    this.particleSimulator = new ParticleSimulator(this.physicsEngine);

    // 3. Rendering Subsystem
    const webglContainer = getRequiredElement<HTMLElement>('webgl-container');
    this.sceneManager = new SceneManager(webglContainer);
    this.particleRenderer = new ParticleRenderer(this.particleSimulator.getBuffer());
    this.sceneManager.getParticleGroup().add(this.particleRenderer.getMesh());

    // 4. User Interface & Interaction Subsystems
    this.uiManager = new UIManager(this.worldState, this.commandBus);
    this.inputManager = new InputManager(this.worldState, this.commandBus);
    this.gestureRecognizer = new GestureRecognizer(this.worldState, this.commandBus);

    // 5. Render Animation Loop (linked with UI frame updates)
    this.renderLoop = new RenderLoop(
      this.sceneManager,
      this.particleSimulator,
      this.particleRenderer,
      this.worldState,
      this.uiManager
    );

    // 6. Hand Tracking Vision Subsystem
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

    // Wire simulation updates directly to command bus
    this.commandBus.on('SET_PALETTE', (cmd) => {
      this.particleSimulator.setPalette(cmd.payload.index);
    });

    this.commandBus.on('TRIGGER_EXPLOSION', (cmd) => {
      this.particleSimulator.explode(cmd.payload.power ?? 1.0);
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
