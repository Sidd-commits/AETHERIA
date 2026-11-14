import { HandLandmarks } from '../types/hand';
import { SemanticGestureType, DebugTelemetry, HandFeatures } from '../types/gesture';
import { GestureSmoother } from './GestureSmoother';
import { GestureClassifier } from './GestureClassifier';
import { GestureEventBus } from './GestureEventBus';
import { GESTURE_CONFIG } from '../config/constants';
import { clamp } from '../utils/math';

interface ActiveHandState {
  handIndex: number;
  currentGesture: SemanticGestureType;
  startTime: number;
  lastUpdateTime: number;
  features: HandFeatures | null;
}

interface ActiveTwoHandState {
  currentGesture: SemanticGestureType;
  startTime: number;
  lastUpdateTime: number;
}

/**
 * Gesture Detector
 * Central engine coordinating landmark smoothing, feature extraction,
 * semantic classification, lifecycle state machines, and event dispatching.
 */
export class GestureDetector {
  private smoother: GestureSmoother;
  private classifier: GestureClassifier;
  private eventBus: GestureEventBus;

  // Active state machines
  private activeHands: Map<number, ActiveHandState> = new Map();
  private activeTwoHand: ActiveTwoHandState | null = null;

  // Performance and Telemetry
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private fps: number = 60;
  private fpsTimer: number = performance.now();
  private lastLatencyMs: number = 0;
  private latestTelemetry: DebugTelemetry | null = null;

  constructor(
    smoother: GestureSmoother = new GestureSmoother(),
    classifier: GestureClassifier = new GestureClassifier(),
    eventBus: GestureEventBus = GestureEventBus.getInstance()
  ) {
    this.smoother = smoother;
    this.classifier = classifier;
    this.eventBus = eventBus;
  }

  public getEventBus(): GestureEventBus {
    return this.eventBus;
  }

  public getSmoother(): GestureSmoother {
    return this.smoother;
  }

  public getClassifier(): GestureClassifier {
    return this.classifier;
  }

  /**
   * Main vision pipeline ingestion: Process raw MediaPipe hand landmarks per frame
   */
  public process(rawHands: HandLandmarks[]): void {
    const startTime = performance.now();
    const now = startTime;
    const dt = Math.max(0.001, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // Calculate real-time FPS
    this.frameCount++;
    if (now - this.fpsTimer >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = now;
    }

    const handCount = rawHands.length;
    const smoothedHandsList: HandLandmarks[] = [];
    const processedFeaturesList: HandFeatures[] = [];
    const telemetryGestures: DebugTelemetry['singleHandGestures'] = [];

    if (handCount === 0) {
      this.handleAllHandsLost(now);
      this.updateTelemetry(now, 'SEARCHING', 0, [], undefined, rawHands, []);
      this.lastLatencyMs = performance.now() - startTime;
      return;
    }

    // 1. Process Individual Hands
    for (let i = 0; i < handCount; i++) {
      const raw = rawHands[i];
      const smoothed = this.smoother.smoothLandmarks(i, raw, dt);
      smoothedHandsList.push(smoothed);

      // Record trajectory of palm centroid
      const rawCentroid = {
        x: (smoothed[0].x + smoothed[5].x + smoothed[9].x + smoothed[13].x + smoothed[17].x) / 5,
        y: (smoothed[0].y + smoothed[5].y + smoothed[9].y + smoothed[13].y + smoothed[17].y) / 5,
        z: ((smoothed[0].z || 0) + (smoothed[9].z || 0)) / 2
      };
      this.smoother.recordTrajectory(i, rawCentroid, now);

      // Extract invariant features
      const trajectory = this.smoother.getTrajectory(i);
      const features = this.classifier.extractFeatures(i, smoothed, trajectory, now);
      processedFeaturesList.push(features);

      // Classify single hand gesture
      const rawClassification = this.classifier.classifySingleHand(features);

      // Stabilize classification via temporal voting & hysteresis
      const stabilized = this.smoother.stabilizeGesture(
        i,
        rawClassification.type,
        rawClassification.confidence,
        now
      );

      // Update Hand Lifecycle State Machine
      this.updateSingleHandLifecycle(
        i,
        stabilized.dominantGesture,
        stabilized.confidence,
        features,
        now
      );

      telemetryGestures.push({
        handIndex: i,
        gesture: stabilized.dominantGesture,
        confidence: stabilized.confidence,
        pinchDist: features.pinchDistance,
        extendedCount: features.extendedFingerCount,
        features
      });
    }

    // Handle hands that were lost (e.g., 2 hands reduced to 1)
    this.activeHands.forEach((_, handIndex) => {
      if (handIndex >= handCount) {
        this.terminateSingleHand(handIndex, now);
      }
    });

    // 2. Process Dual-Hand Gestures if 2 hands present
    let twoHandTelemetry: DebugTelemetry['twoHandGesture'] | undefined;
    if (handCount >= 2) {
      const dualResult = this.classifier.classifyTwoHands(
        processedFeaturesList[0],
        processedFeaturesList[1],
        now
      );

      this.updateTwoHandLifecycle(
        dualResult.classification.type,
        dualResult.classification.confidence,
        dualResult.features,
        now
      );

      twoHandTelemetry = {
        gesture: dualResult.classification.type,
        confidence: dualResult.classification.confidence,
        distance: dualResult.features.interHandDistance,
        radialVelocity: dualResult.features.radialVelocity
      };
    } else if (this.activeTwoHand) {
      this.terminateTwoHand(now);
    }

    // 3. Update Real-time Telemetry
    this.updateTelemetry(
      now,
      'TRACKING',
      handCount,
      telemetryGestures,
      twoHandTelemetry,
      rawHands,
      smoothedHandsList
    );

    this.lastLatencyMs = performance.now() - startTime;
  }

  /**
   * Manage single-hand lifecycle events (START, UPDATE, END, TRIGGER)
   */
  private updateSingleHandLifecycle(
    handIndex: number,
    gesture: SemanticGestureType,
    confidence: number,
    features: HandFeatures,
    now: number
  ): void {
    let state = this.activeHands.get(handIndex);

    // Continuous 3D mapping coordinates
    const palm = features.palmCentroid;
    const sceneX = (1 - palm.x - 0.5) * GESTURE_CONFIG.singleHandSceneScaleX;
    const sceneY = -(palm.y - 0.5) * GESTURE_CONFIG.singleHandSceneScaleY;
    const sceneZ = -palm.z * GESTURE_CONFIG.singleHandSceneScaleZ;
    const sceneRot = {
      x: features.handOrientation.pitch,
      y: features.handOrientation.yaw,
      z: 0
    };

    if (!state) {
      // First detection of this hand
      state = {
        handIndex,
        currentGesture: gesture,
        startTime: now,
        lastUpdateTime: now,
        features
      };
      this.activeHands.set(handIndex, state);

      this.eventBus.dispatch({
        type: gesture,
        lifecycle: 'START',
        confidence,
        handIndex,
        timestamp: now,
        duration: 0,
        features,
        continuousParams: {
          scenePosition: { x: sceneX, y: sceneY, z: sceneZ },
          sceneRotation: sceneRot
        }
      });
      return;
    }

    // Check if gesture changed
    if (state.currentGesture !== gesture) {
      // 1. Dispatch END for previous gesture
      const prevDuration = now - state.startTime;
      this.eventBus.dispatch({
        type: state.currentGesture,
        lifecycle: 'END',
        confidence,
        handIndex,
        timestamp: now,
        duration: prevDuration,
        features: state.features || features,
        continuousParams: {
          scenePosition: { x: sceneX, y: sceneY, z: sceneZ },
          sceneRotation: sceneRot
        }
      });

      // 2. Dispatch START for new gesture
      state.currentGesture = gesture;
      state.startTime = now;
      state.lastUpdateTime = now;
      state.features = features;

      this.eventBus.dispatch({
        type: gesture,
        lifecycle: 'START',
        confidence,
        handIndex,
        timestamp: now,
        duration: 0,
        features,
        continuousParams: {
          scenePosition: { x: sceneX, y: sceneY, z: sceneZ },
          sceneRotation: sceneRot
        }
      });

      // Discrete Action Trigger
      this.eventBus.dispatch({
        type: gesture,
        lifecycle: 'TRIGGER',
        confidence,
        handIndex,
        timestamp: now,
        duration: 0,
        features,
        continuousParams: {
          scenePosition: { x: sceneX, y: sceneY, z: sceneZ },
          sceneRotation: sceneRot
        }
      });
    } else {
      // Gesture continuation: Dispatch UPDATE
      const duration = now - state.startTime;
      state.lastUpdateTime = now;
      state.features = features;

      this.eventBus.dispatch({
        type: gesture,
        lifecycle: 'UPDATE',
        confidence,
        handIndex,
        timestamp: now,
        duration,
        features,
        continuousParams: {
          scenePosition: { x: sceneX, y: sceneY, z: sceneZ },
          sceneRotation: sceneRot,
          intensity: features.pinchConfidence
        }
      });
    }
  }

  /**
   * Manage two-hand lifecycle events
   */
  private updateTwoHandLifecycle(
    gesture: SemanticGestureType,
    confidence: number,
    features: any,
    now: number
  ): void {
    const rawDist = features.interHandDistance;
    const mappedScale = clamp(
      (rawDist - GESTURE_CONFIG.twoHandScaleDistanceMin) * GESTURE_CONFIG.twoHandScaleFactor +
        GESTURE_CONFIG.twoHandScaleBase,
      GESTURE_CONFIG.minScale,
      GESTURE_CONFIG.maxScale
    );

    const midX = (features.midpoint.x - 0.5) * GESTURE_CONFIG.twoHandMidpointScaleX;
    const midY = -(features.midpoint.y - 0.5) * GESTURE_CONFIG.twoHandMidpointScaleY;

    if (!this.activeTwoHand) {
      this.activeTwoHand = {
        currentGesture: gesture,
        startTime: now,
        lastUpdateTime: now
      };

      this.eventBus.dispatch({
        type: gesture,
        lifecycle: 'START',
        confidence,
        handIndex: -1, // -1 indicates dual-hand
        timestamp: now,
        duration: 0,
        twoHandFeatures: features,
        continuousParams: {
          scenePosition: { x: midX, y: midY, z: 0 },
          scale: mappedScale
        }
      });
      return;
    }

    if (this.activeTwoHand.currentGesture !== gesture) {
      this.eventBus.dispatch({
        type: this.activeTwoHand.currentGesture,
        lifecycle: 'END',
        confidence,
        handIndex: -1,
        timestamp: now,
        duration: now - this.activeTwoHand.startTime,
        twoHandFeatures: features
      });

      this.activeTwoHand.currentGesture = gesture;
      this.activeTwoHand.startTime = now;
      this.activeTwoHand.lastUpdateTime = now;

      this.eventBus.dispatch({
        type: gesture,
        lifecycle: 'START',
        confidence,
        handIndex: -1,
        timestamp: now,
        duration: 0,
        twoHandFeatures: features,
        continuousParams: {
          scenePosition: { x: midX, y: midY, z: 0 },
          scale: mappedScale
        }
      });
    } else {
      this.activeTwoHand.lastUpdateTime = now;
      this.eventBus.dispatch({
        type: gesture,
        lifecycle: 'UPDATE',
        confidence,
        handIndex: -1,
        timestamp: now,
        duration: now - this.activeTwoHand.startTime,
        twoHandFeatures: features,
        continuousParams: {
          scenePosition: { x: midX, y: midY, z: 0 },
          scale: mappedScale
        }
      });
    }
  }

  private terminateSingleHand(handIndex: number, now: number): void {
    const state = this.activeHands.get(handIndex);
    if (state) {
      this.eventBus.dispatch({
        type: state.currentGesture,
        lifecycle: 'END',
        confidence: 0,
        handIndex,
        timestamp: now,
        duration: now - state.startTime,
        features: state.features || undefined
      });
      this.activeHands.delete(handIndex);
      this.smoother.resetHand(handIndex);
    }
  }

  private terminateTwoHand(now: number): void {
    if (this.activeTwoHand) {
      this.eventBus.dispatch({
        type: this.activeTwoHand.currentGesture,
        lifecycle: 'END',
        confidence: 0,
        handIndex: -1,
        timestamp: now,
        duration: now - this.activeTwoHand.startTime
      });
      this.activeTwoHand = null;
    }
  }

  private handleAllHandsLost(now: number): void {
    this.activeHands.forEach((_, idx) => this.terminateSingleHand(idx, now));
    this.terminateTwoHand(now);
    this.classifier.reset();
  }

  private updateTelemetry(
    _now: number,
    state: DebugTelemetry['trackingState'],
    handCount: number,
    singleGestures: DebugTelemetry['singleHandGestures'],
    twoHandGesture: DebugTelemetry['twoHandGesture'] | undefined,
    rawLandmarks: HandLandmarks[],
    smoothedLandmarks: HandLandmarks[]
  ): void {
    this.latestTelemetry = {
      fps: this.fps,
      latencyMs: Math.round(this.lastLatencyMs * 10) / 10,
      trackingState: state,
      handCount,
      singleHandGestures: singleGestures,
      twoHandGesture,
      rawLandmarks,
      smoothedLandmarks
    };
  }

  public getTelemetry(): DebugTelemetry | null {
    return this.latestTelemetry;
  }
}
