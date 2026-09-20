import { GestureEventBus } from './GestureEventBus';
import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import { PALETTES } from '../config/palettes';

/**
 * Gesture Adapter
 * Subscribes to decoupled GestureEventBus events and translates them into
 * Aetheria UniverseCommands (transforms, palette shifts, supernova charges, scaling).
 */
export class GestureAdapter {
  private gestureBus: GestureEventBus;
  private commandBus: CommandBus;
  private worldState: WorldState;
  private isPinching: boolean = false;
  private lastTriggeredPalette: number = -1;
  private lastBlackHoleSpawnTime: number = 0;

  constructor(
    worldState: WorldState,
    commandBus: CommandBus = CommandBus.getInstance(),
    gestureBus: GestureEventBus = GestureEventBus.getInstance()
  ) {
    this.worldState = worldState;
    this.commandBus = commandBus;
    this.gestureBus = gestureBus;

    this.bindGestureEvents();
  }

  private bindGestureEvents(): void {
    // 1. OPEN_PALM: 3D navigation & Prismatic Theme (5)
    this.gestureBus.onUpdate('OPEN_PALM', (e) => {
      if (e.handIndex !== -1 && e.continuousParams?.scenePosition) {
        this.commandBus.dispatch(
          'SET_TRANSFORM',
          {
            position: e.continuousParams.scenePosition,
            rotation: e.continuousParams.sceneRotation
          },
          'GESTURE'
        );
      }
    });

    this.gestureBus.onTrigger('OPEN_PALM', (e) => {
      if (e.handIndex !== -1) {
        this.commandBus.dispatch('SET_MODE_LABEL', { label: '🖐️ OPEN PALM (NAVIGATE)' }, 'GESTURE');
        this.setPaletteSafely(5);
      }
    });

    // 2. FIST: Void Ultraviolet Theme (0) & FIST + CIRCULAR_MOTION Black Hole Spawning
    this.gestureBus.onUpdate('FIST', (e) => {
      if (e.features?.isFistCircular) {
        this.trySpawnBlackHoleFromGesture(e);
      }
    });

    this.gestureBus.onTrigger('FIST', (e) => {
      if (e.features?.isFistCircular) {
        this.trySpawnBlackHoleFromGesture(e);
      } else {
        this.commandBus.dispatch('SET_MODE_LABEL', { label: '✊ FIST (ULTRAVIOLET)' }, 'GESTURE');
        this.setPaletteSafely(0);
      }
    });

    // 3. POINT: Cyber Cyan Theme (1) & Precise steering
    this.gestureBus.onUpdate('POINT', (e) => {
      if (e.continuousParams?.scenePosition) {
        this.commandBus.dispatch(
          'SET_TRANSFORM',
          {
            position: e.continuousParams.scenePosition,
            rotation: e.continuousParams.sceneRotation
          },
          'GESTURE'
        );
      }
    });

    this.gestureBus.onTrigger('POINT', () => {
      this.commandBus.dispatch('SET_MODE_LABEL', { label: '☝️ POINT (CYAN)' }, 'GESTURE');
      this.setPaletteSafely(1);
    });

    // 4. PEACE: Sunset Magenta Theme (2)
    this.gestureBus.onTrigger('PEACE', () => {
      this.commandBus.dispatch('SET_MODE_LABEL', { label: '✌️ PEACE (MAGENTA)' }, 'GESTURE');
      this.setPaletteSafely(2);
    });

    // 5. THREE_FINGERS: Hyper Emerald Theme (3)
    this.gestureBus.onTrigger('THREE_FINGERS', () => {
      this.commandBus.dispatch(
        'SET_MODE_LABEL',
        { label: '🤟 THREE FINGERS (EMERALD)' },
        'GESTURE'
      );
      this.setPaletteSafely(3);
    });

    // 6. PINCH: Energy Accumulation & Supernova
    this.gestureBus.onStart('PINCH', () => {
      this.isPinching = true;
      this.commandBus.dispatch('SET_CHARGE', { charging: true }, 'GESTURE');
      this.commandBus.dispatch('SET_MODE_LABEL', { label: '👌 PINCH CHARGING' }, 'GESTURE');
    });

    this.gestureBus.onUpdate('PINCH', (e) => {
      this.isPinching = true;
      if (e.continuousParams?.scenePosition) {
        this.commandBus.dispatch(
          'SET_TRANSFORM',
          {
            position: e.continuousParams.scenePosition,
            rotation: e.continuousParams.sceneRotation
          },
          'GESTURE'
        );
      }
      this.commandBus.dispatch('SET_CHARGE', { charging: true }, 'GESTURE');
      this.commandBus.dispatch('SET_MODE_LABEL', { label: '⚡ PINCH CHARGING' }, 'GESTURE');
    });

    this.gestureBus.onEnd('PINCH', () => {
      const charge = this.worldState.getState().chargeAmount;
      if (this.isPinching && charge > 0.18) {
        this.commandBus.dispatch('TRIGGER_EXPLOSION', { power: charge }, 'GESTURE');
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: '💥 Sphere Supernova Exploded!',
            icon: '💥'
          },
          'GESTURE'
        );
      }
      this.isPinching = false;
      this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'GESTURE');
    });

    // 7. RELEASE: Rapid opening explosion trigger
    this.gestureBus.onTrigger('RELEASE', () => {
      const charge = this.worldState.getState().chargeAmount;
      if (charge > 0.18) {
        this.commandBus.dispatch('TRIGGER_EXPLOSION', { power: charge }, 'GESTURE');
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: '💥 Supernova Release Exploded!',
            icon: '💥'
          },
          'GESTURE'
        );
      }
      this.isPinching = false;
      this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'GESTURE');
    });

    // 8. GRAB: Hold anchor
    this.gestureBus.onTrigger('GRAB', () => {
      this.commandBus.dispatch('SET_MODE_LABEL', { label: '✊ GRAB (ANCHOR)' }, 'GESTURE');
    });

    // 9. CIRCULAR_MOTION: Orbital vortex spin & Fist-Vortex Black Hole Spawning
    this.gestureBus.onUpdate('CIRCULAR_MOTION', (e) => {
      if (e.features?.isFistCircular) {
        this.trySpawnBlackHoleFromGesture(e);
        return;
      }

      this.commandBus.dispatch('SET_MODE_LABEL', { label: '🌀 CIRCULAR VORTEX' }, 'GESTURE');
      if (e.features) {
        const spinImpulse = {
          x: e.continuousParams?.sceneRotation?.x || 0,
          y: (e.continuousParams?.sceneRotation?.y || 0) + e.features.angularVelocity * 0.4,
          z: e.features.angularVelocity * 0.2
        };
        this.commandBus.dispatch(
          'SET_TRANSFORM',
          {
            position: e.continuousParams?.scenePosition,
            rotation: spinImpulse
          },
          'GESTURE'
        );
      }
    });

    // 10. TWO_HAND Gestures (EXPAND / CONTRACT / Dual Palm)
    const handleTwoHands = (e: any, label: string) => {
      this.isPinching = false;
      this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'GESTURE');
      this.commandBus.dispatch('SET_MODE_LABEL', { label }, 'GESTURE');

      if (e.continuousParams) {
        this.commandBus.dispatch(
          'SET_TRANSFORM',
          {
            position: e.continuousParams.scenePosition,
            scale: e.continuousParams.scale
          },
          'GESTURE'
        );
      }
    };

    this.gestureBus.onUpdate('TWO_HAND_EXPAND', (e) => {
      handleTwoHands(e, '👐 EXPANDING SPHERE');
    });

    this.gestureBus.onUpdate('TWO_HAND_CONTRACT', (e) => {
      handleTwoHands(e, '👐 CONTRACTING SPHERE');
    });
  }

  private setPaletteSafely(index: number): void {
    if (this.lastTriggeredPalette !== index) {
      this.lastTriggeredPalette = index;
      this.commandBus.dispatch('SET_PALETTE', { index }, 'GESTURE');
      const palette = PALETTES[index];
      if (palette) {
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: `🎨 ${palette.name} (${index})`,
            icon: '🎨'
          },
          'GESTURE'
        );
      }
    }
  }

  private trySpawnBlackHoleFromGesture(e: any): void {
    const now = performance.now();
    if (now - this.lastBlackHoleSpawnTime > 1800) {
      this.lastBlackHoleSpawnTime = now;
      const pos = e.continuousParams?.scenePosition || { x: 0, y: 0, z: 0 };
      this.commandBus.dispatch(
        'SPAWN_BLACK_HOLE',
        {
          position: pos,
          mass: 140.0,
          radius: 1.0,
          gravitationalInfluenceRadius: 30.0,
          accretionStrength: 2.2
        },
        'GESTURE'
      );
      this.commandBus.dispatch('SET_MODE_LABEL', { label: '🕳️ BLACK HOLE CREATED' }, 'GESTURE');
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: '🕳️ Black Hole Spawned via Fist Vortex!',
          icon: '🕳️'
        },
        'GESTURE'
      );
    }
  }

  public reset(): void {
    this.isPinching = false;
    this.lastTriggeredPalette = -1;
  }
}
