import { HandLandmarks } from '../types/hand';
import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import { GestureDetector } from './GestureDetector';
import { GestureAdapter } from './GestureAdapter';

/**
 * GestureRecognizer (Backward compatibility facade)
 * Integrates GestureDetector and GestureAdapter into a single interface.
 */
export class GestureRecognizer {
  private detector: GestureDetector;
  private adapter: GestureAdapter;
  private commandBus: CommandBus;
  private wasDetected: boolean = false;

  constructor(worldState: WorldState, commandBus: CommandBus = CommandBus.getInstance()) {
    this.commandBus = commandBus;
    this.detector = new GestureDetector();
    this.adapter = new GestureAdapter(worldState, this.commandBus, this.detector.getEventBus());
  }

  public getDetector(): GestureDetector {
    return this.detector;
  }

  public getAdapter(): GestureAdapter {
    return this.adapter;
  }

  /**
   * Process raw hand landmarks
   */
  public processHands(hands: HandLandmarks[]): void {
    const isDetected = hands.length > 0;
    if (isDetected !== this.wasDetected) {
      this.wasDetected = isDetected;
      this.commandBus.dispatch(
        'SET_TRACKING_STATUS',
        {
          active: isDetected,
          message: isDetected ? 'HAND TRACKING ACTIVE' : 'SEARCHING FOR HANDS...'
        },
        'GESTURE'
      );

      if (!isDetected) {
        this.commandBus.dispatch('SET_MODE_LABEL', { label: 'NO HAND DETECTED' }, 'GESTURE');
        this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'GESTURE');
        this.commandBus.dispatch(
          'SET_TRANSFORM',
          {
            position: { x: 0, y: 0, z: 0 },
            scale: 1.0
          },
          'GESTURE'
        );
        this.adapter.reset();
      }
    }

    this.detector.process(hands);
  }
}
