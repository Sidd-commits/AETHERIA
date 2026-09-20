import { HandLandmarks } from './hand';

/**
 * Supported Semantic Gesture Types
 */
export type SemanticGestureType =
  | 'OPEN_PALM'
  | 'FIST'
  | 'PINCH'
  | 'POINT'
  | 'PEACE'
  | 'THREE_FINGERS'
  | 'TWO_HAND_EXPAND'
  | 'TWO_HAND_CONTRACT'
  | 'CIRCULAR_MOTION'
  | 'GRAB'
  | 'RELEASE'
  | 'NONE';

/**
 * Backward compatibility alias
 */
export type GestureType = SemanticGestureType;

/**
 * Gesture Lifecycle States
 */
export type GestureLifecycle = 'START' | 'UPDATE' | 'END' | 'TRIGGER';

/**
 * Finger Identification
 */
export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

/**
 * Mathematical Feature Representation for a Single Finger
 */
export interface FingerState {
  name: FingerName;
  isExtended: boolean;
  extensionRatio: number; // 0.0 (curled) to 1.0 (fully extended)
  jointAngle: number; // radians between proximal and distal segments
  tipDistanceToWrist: number; // normalized by palm scale
  tipDistanceToPalm: number; // normalized by palm scale
}

/**
 * Mathematical Invariant Features of a Processed Hand
 */
export interface HandFeatures {
  handIndex: number;
  palmScale: number; // Reference scale S_palm = ||p_9 - p_0||
  palmCentroid: { x: number; y: number; z: number };
  palmNormal: { x: number; y: number; z: number };
  handOrientation: { pitch: number; yaw: number; roll: number };
  velocity: { x: number; y: number; z: number; speed: number };
  angularVelocity: number;
  pinchDistance: number; // normalized distance between thumb tip and index tip
  pinchConfidence: number; // 0.0 to 1.0
  fingers: Record<FingerName, FingerState>;
  extendedFingerCount: number;
  averageFingerCurl: number; // 0.0 (all extended) to 1.0 (all curled)
  curlRateOfChange: number; // d(curl)/dt for grab/release classification
  trajectoryCurvature: number; // angular sweep in radians over sliding window
  isCircularMotion: boolean;
  circularConfidence: number;
  isFistCircular?: boolean;
}

/**
 * Dual-Hand Invariant Features
 */
export interface TwoHandFeatures {
  interHandDistance: number; // Euclidean distance between palm centroids
  radialVelocity: number; // Rate of change of distance (positive = expand, negative = contract)
  midpoint: { x: number; y: number; z: number };
  relativeTilt: { pitch: number; yaw: number; roll: number };
}

/**
 * Comprehensive Gesture Classification Output
 */
export interface GestureClassification {
  type: SemanticGestureType;
  confidence: number; // 0.0 to 1.0
  handIndex?: number;
  isTwoHand?: boolean;
}

/**
 * Typed Gesture Event dispatched through GestureEventBus
 */
export interface GestureEvent {
  type: SemanticGestureType;
  lifecycle: GestureLifecycle;
  confidence: number;
  handIndex: number;
  timestamp: number;
  duration: number; // Duration of active gesture in milliseconds
  features?: HandFeatures;
  twoHandFeatures?: TwoHandFeatures;
  continuousParams?: {
    scenePosition?: { x: number; y: number; z: number };
    sceneRotation?: { x: number; y: number; z: number };
    scale?: number;
    intensity?: number;
  };
}

/**
 * Real-time Telemetry for Debug Visualizer
 */
export interface DebugTelemetry {
  fps: number;
  latencyMs: number;
  trackingState: 'TRACKING' | 'SEARCHING' | 'LOST' | 'DECAYING';
  handCount: number;
  singleHandGestures: Array<{
    handIndex: number;
    gesture: SemanticGestureType;
    confidence: number;
    pinchDist: number;
    extendedCount: number;
    features: HandFeatures;
  }>;
  twoHandGesture?: {
    gesture: SemanticGestureType;
    confidence: number;
    distance: number;
    radialVelocity: number;
  };
  rawLandmarks: HandLandmarks[];
  smoothedLandmarks: HandLandmarks[];
}

/**
 * Simplified Gesture Interface for legacy consumers
 */
export interface Gesture {
  type: SemanticGestureType;
  confidence: number;
  payload?: Record<string, unknown>;
}
