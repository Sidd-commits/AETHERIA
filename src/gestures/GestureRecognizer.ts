import { HandLandmarks } from '../types/hand';
import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import { distance3D, clamp } from '../utils/math';
import { DEFAULT_PHYSICS_CONFIG, GESTURE_CONFIG } from '../config/constants';

/**
 * Gesture Recognizer
 * Analyzes raw 21-point hand landmarks, classifies gestures, and dispatches high-level universe commands
 */
export class GestureRecognizer {
  private commandBus: CommandBus;
  private worldState: WorldState;
  private wasPinching: boolean = false;
  private handDetected: boolean = false;

  constructor(
    worldState: WorldState,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
    this.worldState = worldState;
    this.commandBus = commandBus;
  }

  /**
   * Main entry point for hand landmark processing
   */
  public processHands(hands: HandLandmarks[]): void {
    const numHands = hands.length;

    if (numHands > 0) {
      if (!this.handDetected) {
        this.handDetected = true;
        this.commandBus.dispatch('SET_TRACKING_STATUS', {
          active: true,
          message: 'HAND TRACKING ACTIVE'
        }, 'GESTURE');
      }

      if (numHands === 1) {
        this.processSingleHand(hands[0]);
      } else {
        this.processTwoHands(hands[0], hands[1]);
      }
    } else {
      this.processNoHands();
    }
  }

  /**
   * Process 1-Hand interactions (3D translation, tilt rotation, pinch charging & explosion, palette selection)
   */
  private processSingleHand(landmarks: HandLandmarks): void {
    this.commandBus.dispatch('SET_MODE_LABEL', { label: '1 HAND (MOVE & PINCH)' }, 'GESTURE');

    // 1. Palm Center (Centroid of wrist and MCP knuckles)
    const palmX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5;
    const palmY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5;
    const palmZ = ((landmarks[0].z || 0) + (landmarks[9].z || 0)) / 2;

    // Map normalized (0..1) to scene coords (mirrored X for natural interaction)
    const sceneX = ((1 - palmX) - 0.5) * GESTURE_CONFIG.singleHandSceneScaleX;
    const sceneY = -(palmY - 0.5) * GESTURE_CONFIG.singleHandSceneScaleY;
    const sceneZ = -palmZ * GESTURE_CONFIG.singleHandSceneScaleZ;

    // 2. Hand Orientation / Tilt
    const wrist = landmarks[0];
    const middleKnuckle = landmarks[9];
    const tiltX = (middleKnuckle.y - wrist.y) * GESTURE_CONFIG.tiltMultiplierX;
    const tiltY = ((1 - middleKnuckle.x) - (1 - wrist.x)) * GESTURE_CONFIG.tiltMultiplierY;

    this.commandBus.dispatch('SET_TRANSFORM', {
      position: { x: sceneX, y: sceneY, z: sceneZ },
      rotation: { x: tiltX, y: tiltY, z: 0 }
    }, 'GESTURE');

    // 3. Pinch Detection (Thumb Tip 4 & Index Tip 8)
    const pinchDist = distance3D(landmarks[4], landmarks[8]);
    const isPinching = pinchDist < DEFAULT_PHYSICS_CONFIG.pinchThreshold;
    const currentCharge = this.worldState.getState().chargeAmount;

    if (isPinching) {
      this.commandBus.dispatch('SET_CHARGE', { charging: true }, 'GESTURE');
      this.commandBus.dispatch('SET_MODE_LABEL', { label: '⚡ PINCH CHARGING' }, 'GESTURE');
    } else {
      if (this.wasPinching && currentCharge > 0.2) {
        // Supernova explosion on pinch release
        this.commandBus.dispatch('TRIGGER_EXPLOSION', { power: currentCharge }, 'GESTURE');
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '💥 Sphere Supernova Exploded!',
          icon: '💥'
        }, 'GESTURE');
      }
      this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'GESTURE');
    }
    this.wasPinching = isPinching;

    // 4. Extended Finger Count -> Color Palette change
    const fingers = this.countExtendedFingers(landmarks);
    this.commandBus.dispatch('SET_PALETTE', { index: fingers }, 'GESTURE');
  }

  /**
   * Process 2-Hands interaction (Orb scaling, midpoint positioning, dual-hand finger count)
   */
  private processTwoHands(handA: HandLandmarks, handB: HandLandmarks): void {
    this.commandBus.dispatch('SET_MODE_LABEL', { label: '2 HANDS (SCALE ORB)' }, 'GESTURE');
    this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'GESTURE');
    this.wasPinching = false;

    // Palm centers
    const palmA = { x: (1 - handA[9].x), y: handA[9].y };
    const palmB = { x: (1 - handB[9].x), y: handB[9].y };

    // Midpoint position
    const midX = ((palmA.x + palmB.x) / 2 - 0.5) * GESTURE_CONFIG.twoHandMidpointScaleX;
    const midY = -((palmA.y + palmB.y) / 2 - 0.5) * GESTURE_CONFIG.twoHandMidpointScaleY;

    // Distance between two hands controls sphere radius scale
    const handDistance = Math.hypot(palmA.x - palmB.x, palmA.y - palmB.y);
    const newScale = clamp(
      (handDistance - GESTURE_CONFIG.twoHandScaleDistanceMin) * GESTURE_CONFIG.twoHandScaleFactor + GESTURE_CONFIG.twoHandScaleBase,
      GESTURE_CONFIG.minScale,
      GESTURE_CONFIG.maxScale
    );

    this.commandBus.dispatch('SET_TRANSFORM', {
      position: { x: midX, y: midY, z: 0 },
      scale: newScale
    }, 'GESTURE');

    // Combined extended finger count
    const fingersTotal = Math.min(5, this.countExtendedFingers(handA) + this.countExtendedFingers(handB));
    this.commandBus.dispatch('SET_PALETTE', { index: fingersTotal }, 'GESTURE');
  }

  /**
   * Process when no hands are in the camera view
   */
  private processNoHands(): void {
    if (this.handDetected) {
      this.handDetected = false;
      this.commandBus.dispatch('SET_TRACKING_STATUS', {
        active: false,
        message: 'SEARCHING FOR HANDS...'
      }, 'GESTURE');
      this.commandBus.dispatch('SET_MODE_LABEL', { label: 'NO HAND DETECTED' }, 'GESTURE');
    }

    this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'GESTURE');
    this.wasPinching = false;

    // Gently return sphere to center and standard scale
    this.commandBus.dispatch('SET_TRANSFORM', {
      position: { x: 0, y: 0, z: 0 },
      scale: 1.0
    }, 'GESTURE');
  }

  /**
   * Heuristic extended finger counter [0..5]
   */
  public countExtendedFingers(landmarks: HandLandmarks): number {
    let count = 0;
    const wrist = landmarks[0];

    // Index (Tip 8 vs PIP 6)
    if (distance3D(landmarks[8], wrist) > distance3D(landmarks[6], wrist) && landmarks[8].y < landmarks[6].y + 0.03) {
      count++;
    }
    // Middle (Tip 12 vs PIP 10)
    if (distance3D(landmarks[12], wrist) > distance3D(landmarks[10], wrist) && landmarks[12].y < landmarks[10].y + 0.03) {
      count++;
    }
    // Ring (Tip 16 vs PIP 14)
    if (distance3D(landmarks[16], wrist) > distance3D(landmarks[14], wrist) && landmarks[16].y < landmarks[14].y + 0.03) {
      count++;
    }
    // Pinky (Tip 20 vs PIP 18)
    if (distance3D(landmarks[20], wrist) > distance3D(landmarks[18], wrist) && landmarks[20].y < landmarks[18].y + 0.03) {
      count++;
    }

    // Thumb (Tip 4 vs MCP 2 distance to Pinky MCP 17)
    const pinkyMCP = landmarks[17];
    if (distance3D(landmarks[4], pinkyMCP) > distance3D(landmarks[2], pinkyMCP) * 1.15) {
      count++;
    }

    return count;
  }
}
