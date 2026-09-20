import { HandLandmarks } from '../types/hand';
import {
  SemanticGestureType,
  HandFeatures,
  FingerState,
  FingerName,
  GestureClassification,
  TwoHandFeatures
} from '../types/gesture';
import { distance3D, clamp } from '../utils/math';

/**
 * Gesture Classifier
 * Extracts scale-invariant mathematical features from 3D hand landmarks
 * and classifies semantic gestures with continuous confidence scoring.
 */
export class GestureClassifier {
  private prevCentroids: Map<number, { x: number; y: number; z: number; timestamp: number }> = new Map();
  private prevCurlAverages: Map<number, { curl: number; timestamp: number }> = new Map();
  private prevInterHandDistance: { distance: number; timestamp: number } | null = null;

  /**
   * Extract comprehensive mathematical invariant features from hand landmarks
   */
  public extractFeatures(
    handIndex: number,
    landmarks: HandLandmarks,
    trajectory: Array<{ position: { x: number; y: number; z: number }; timestamp: number }>,
    now: number
  ): HandFeatures {
    // 1. Reference Scale S_palm: Wrist (0) to Middle MCP (9)
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    const rawScale = distance3D(wrist, middleMCP);
    const palmScale = Math.max(0.04, rawScale);

    // 2. Palm Centroid C_palm: Average of 0, 5, 9, 13, 17
    const palmCentroid = {
      x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
      y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5,
      z: ((landmarks[0].z || 0) + (landmarks[5].z || 0) + (landmarks[9].z || 0) + (landmarks[13].z || 0) + (landmarks[17].z || 0)) / 5
    };

    // 3. Palm Normal Vector: (p5 - p17) x (p9 - p0)
    const v1 = {
      x: landmarks[5].x - landmarks[17].x,
      y: landmarks[5].y - landmarks[17].y,
      z: (landmarks[5].z || 0) - (landmarks[17].z || 0)
    };
    const v2 = {
      x: landmarks[9].x - landmarks[0].x,
      y: landmarks[9].y - landmarks[0].y,
      z: (landmarks[9].z || 0) - (landmarks[0].z || 0)
    };
    const crossX = v1.y * v2.z - v1.z * v2.y;
    const crossY = v1.z * v2.x - v1.x * v2.z;
    const crossZ = v1.x * v2.y - v1.y * v2.x;
    const crossLen = Math.hypot(crossX, crossY, crossZ) || 1.0;
    const palmNormal = { x: crossX / crossLen, y: crossY / crossLen, z: crossZ / crossLen };

    // 4. Hand Orientation (Pitch, Yaw, Roll)
    const pitch = (middleMCP.y - wrist.y) * 2.5;
    const yaw = ((1 - middleMCP.x) - (1 - wrist.x)) * 3.0;
    const roll = Math.atan2(landmarks[17].y - landmarks[5].y, landmarks[17].x - landmarks[5].x);
    const handOrientation = { pitch, yaw, roll };

    // 5. Linear Velocity
    let velocity = { x: 0, y: 0, z: 0, speed: 0 };
    const prevCentroidEntry = this.prevCentroids.get(handIndex);
    if (prevCentroidEntry) {
      const dt = Math.max(0.001, (now - prevCentroidEntry.timestamp) / 1000);
      const vx = (palmCentroid.x - prevCentroidEntry.x) / dt;
      const vy = (palmCentroid.y - prevCentroidEntry.y) / dt;
      const vz = (palmCentroid.z - prevCentroidEntry.z) / dt;
      const speed = Math.hypot(vx, vy, vz);
      velocity = { x: vx, y: vy, z: vz, speed };
    }
    this.prevCentroids.set(handIndex, { ...palmCentroid, timestamp: now });

    // 6. Finger States & Joint Angles
    const indexFinger = this.computeFingerState('index', [5, 6, 7, 8], landmarks, palmScale, wrist, palmCentroid);
    const middleFinger = this.computeFingerState('middle', [9, 10, 11, 12], landmarks, palmScale, wrist, palmCentroid);
    const ringFinger = this.computeFingerState('ring', [13, 14, 15, 16], landmarks, palmScale, wrist, palmCentroid);
    const pinkyFinger = this.computeFingerState('pinky', [17, 18, 19, 20], landmarks, palmScale, wrist, palmCentroid);
    const thumbFinger = this.computeThumbState(landmarks, palmScale, wrist, palmCentroid);

    const fingers: Record<FingerName, FingerState> = {
      thumb: thumbFinger,
      index: indexFinger,
      middle: middleFinger,
      ring: ringFinger,
      pinky: pinkyFinger
    };

    let extendedCount = 0;
    let totalCurl = 0;
    Object.values(fingers).forEach((f) => {
      if (f.isExtended) extendedCount++;
      totalCurl += 1.0 - f.extensionRatio;
    });
    const averageFingerCurl = totalCurl / 5.0;

    // 7. Curl Rate of Change (for Grab & Release dynamic recognition)
    let curlRateOfChange = 0;
    const prevCurlEntry = this.prevCurlAverages.get(handIndex);
    if (prevCurlEntry) {
      const dt = Math.max(0.001, (now - prevCurlEntry.timestamp) / 1000);
      curlRateOfChange = (averageFingerCurl - prevCurlEntry.curl) / dt;
    }
    this.prevCurlAverages.set(handIndex, { curl: averageFingerCurl, timestamp: now });

    // 8. Pinch Detection (Thumb Tip #4 to Index Tip #8)
    const pinchRawDist = distance3D(landmarks[4], landmarks[8]);
    const pinchDistance = pinchRawDist / palmScale;
    const pinchThreshold = 0.38;
    const pinchConfidence = clamp(1.0 - pinchDistance / pinchThreshold, 0.0, 1.0);

    // 9. Circular Trajectory Curvature
    const { curvature, isCircular, circularConfidence, angularVelocity } = this.computeCircularMotion(trajectory);

    return {
      handIndex,
      palmScale,
      palmCentroid,
      palmNormal,
      handOrientation,
      velocity,
      angularVelocity,
      pinchDistance,
      pinchConfidence,
      fingers,
      extendedFingerCount: extendedCount,
      averageFingerCurl,
      curlRateOfChange,
      trajectoryCurvature: curvature,
      isCircularMotion: isCircular,
      circularConfidence
    };
  }

  /**
   * Compute joint angle and extension state for non-thumb fingers (Index, Middle, Ring, Pinky)
   */
  private computeFingerState(
    name: FingerName,
    indices: [number, number, number, number],
    landmarks: HandLandmarks,
    palmScale: number,
    wrist: { x: number; y: number; z?: number },
    palmCentroid: { x: number; y: number; z?: number }
  ): FingerState {
    const [mcpIdx, pipIdx, dipIdx, tipIdx] = indices;
    const mcp = landmarks[mcpIdx];
    const pip = landmarks[pipIdx];
    const dip = landmarks[dipIdx];
    const tip = landmarks[tipIdx];

    // Segment vectors
    const u = { x: pip.x - mcp.x, y: pip.y - mcp.y, z: (pip.z || 0) - (mcp.z || 0) };
    const v = { x: tip.x - dip.x, y: tip.y - dip.y, z: (tip.z || 0) - (dip.z || 0) };
    const uLen = Math.hypot(u.x, u.y, u.z) || 1.0;
    const vLen = Math.hypot(v.x, v.y, v.z) || 1.0;

    // Joint cosine angle
    const dot = u.x * v.x + u.y * v.y + u.z * v.z;
    const cosAngle = dot / (uLen * vLen);
    const jointAngle = Math.acos(clamp(cosAngle, -1.0, 1.0));

    // Normalized distances
    const tipDistWrist = distance3D(tip, wrist) / palmScale;
    const pipDistWrist = distance3D(pip, wrist) / palmScale;
    const tipDistPalm = distance3D(tip, palmCentroid) / palmScale;

    // Extension heuristics
    const isExtended = tipDistWrist > pipDistWrist * 1.08 && cosAngle > 0.45 && tip.y < pip.y + 0.04;
    const extensionRatio = clamp((tipDistWrist - pipDistWrist * 0.9) / 0.7, 0.0, 1.0);

    return {
      name,
      isExtended,
      extensionRatio,
      jointAngle,
      tipDistanceToWrist: tipDistWrist,
      tipDistanceToPalm: tipDistPalm
    };
  }

  /**
   * Compute thumb finger state using opposition and abduction geometry
   */
  private computeThumbState(
    landmarks: HandLandmarks,
    palmScale: number,
    wrist: { x: number; y: number; z?: number },
    palmCentroid: { x: number; y: number; z?: number }
  ): FingerState {
    const tip = landmarks[4];
    const ip = landmarks[3];
    const mcp = landmarks[2];
    const pinkyMCP = landmarks[17];
    const indexMCP = landmarks[5];

    const distPinkyMCP = distance3D(tip, pinkyMCP);
    const mcpDistPinkyMCP = distance3D(mcp, pinkyMCP);
    const distIndexMCP = distance3D(tip, indexMCP) / palmScale;

    const tipDistWrist = distance3D(tip, wrist) / palmScale;
    const tipDistPalm = distance3D(tip, palmCentroid) / palmScale;

    const u = { x: mcp.x - landmarks[1].x, y: mcp.y - landmarks[1].y, z: (mcp.z || 0) - (landmarks[1].z || 0) };
    const v = { x: tip.x - ip.x, y: tip.y - ip.y, z: (tip.z || 0) - (ip.z || 0) };
    const dot = u.x * v.x + u.y * v.y + u.z * v.z;
    const cosAngle = dot / ((Math.hypot(u.x, u.y, u.z) || 1) * (Math.hypot(v.x, v.y, v.z) || 1));
    const jointAngle = Math.acos(clamp(cosAngle, -1.0, 1.0));

    const isExtended = distPinkyMCP > mcpDistPinkyMCP * 1.12 && distIndexMCP > 0.4;
    const extensionRatio = clamp((distPinkyMCP / (mcpDistPinkyMCP || 1) - 0.9) / 0.5, 0.0, 1.0);

    return {
      name: 'thumb',
      isExtended,
      extensionRatio,
      jointAngle,
      tipDistanceToWrist: tipDistWrist,
      tipDistanceToPalm: tipDistPalm
    };
  }

  /**
   * Analyze trajectory history for circular motion and curvature
   */
  private computeCircularMotion(
    trajectory: Array<{ position: { x: number; y: number; z: number }; timestamp: number }>
  ): { curvature: number; isCircular: boolean; circularConfidence: number; angularVelocity: number } {
    if (trajectory.length < 12) {
      return { curvature: 0, isCircular: false, circularConfidence: 0, angularVelocity: 0 };
    }

    let totalAngleSweep = 0;
    let prevHeading: number | null = null;
    let validSteps = 0;

    for (let i = 1; i < trajectory.length; i++) {
      const p1 = trajectory[i - 1].position;
      const p2 = trajectory[i].position;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      if (Math.hypot(dx, dy) > 0.005) {
        const heading = Math.atan2(dy, dx);
        if (prevHeading !== null) {
          let dTheta = heading - prevHeading;
          while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
          while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
          totalAngleSweep += dTheta;
          validSteps++;
        }
        prevHeading = heading;
      }
    }

    const duration = (trajectory[trajectory.length - 1].timestamp - trajectory[0].timestamp) / 1000;
    const angularVelocity = duration > 0 ? totalAngleSweep / duration : 0;
    const absSweep = Math.abs(totalAngleSweep);

    // Circular motion requires at least ~270 degrees (1.5 * PI) sweep in consistent direction
    const isCircular = absSweep >= 1.5 * Math.PI && validSteps >= 8;
    const circularConfidence = clamp(absSweep / (2.0 * Math.PI), 0.0, 1.0);

    return {
      curvature: totalAngleSweep,
      isCircular,
      circularConfidence,
      angularVelocity
    };
  }

  /**
   * Classify single hand semantic gesture from extracted features
   */
  public classifySingleHand(features: HandFeatures): GestureClassification {
    const {
      pinchConfidence,
      extendedFingerCount,
      fingers,
      averageFingerCurl,
      curlRateOfChange,
      isCircularMotion,
      circularConfidence
    } = features;

    // 1. PINCH Gesture (High priority for interaction)
    if (pinchConfidence > 0.55) {
      return {
        type: 'PINCH',
        confidence: pinchConfidence,
        handIndex: features.handIndex
      };
    }

    // 2. Dynamic GRAB & RELEASE based on curl acceleration
    if (curlRateOfChange > 2.2 && averageFingerCurl > 0.5) {
      return {
        type: 'GRAB',
        confidence: clamp(curlRateOfChange / 4.0, 0.6, 1.0),
        handIndex: features.handIndex
      };
    }

    if (curlRateOfChange < -2.2 && averageFingerCurl < 0.5) {
      return {
        type: 'RELEASE',
        confidence: clamp(Math.abs(curlRateOfChange) / 4.0, 0.6, 1.0),
        handIndex: features.handIndex
      };
    }

    // 3. FIST Gesture (All fingers curled)
    if (extendedFingerCount === 0 || (averageFingerCurl > 0.78 && !fingers.index.isExtended && !fingers.middle.isExtended)) {
      const fistConfidence = clamp(averageFingerCurl, 0.7, 1.0);
      return {
        type: 'FIST',
        confidence: fistConfidence,
        handIndex: features.handIndex
      };
    }

    // 4. POINT Gesture (Index extended, others curled)
    if (
      fingers.index.isExtended &&
      !fingers.middle.isExtended &&
      !fingers.ring.isExtended &&
      !fingers.pinky.isExtended
    ) {
      const pointConfidence = clamp(
        (fingers.index.extensionRatio + (1 - fingers.middle.extensionRatio) + (1 - fingers.ring.extensionRatio)) / 3.0,
        0.65,
        1.0
      );
      return {
        type: 'POINT',
        confidence: pointConfidence,
        handIndex: features.handIndex
      };
    }

    // 5. PEACE Gesture (Index + Middle extended, others curled)
    if (
      fingers.index.isExtended &&
      fingers.middle.isExtended &&
      !fingers.ring.isExtended &&
      !fingers.pinky.isExtended
    ) {
      const peaceConfidence = clamp(
        (fingers.index.extensionRatio + fingers.middle.extensionRatio + (1 - fingers.ring.extensionRatio)) / 3.0,
        0.7,
        1.0
      );
      return {
        type: 'PEACE',
        confidence: peaceConfidence,
        handIndex: features.handIndex
      };
    }

    // 6. THREE_FINGERS Gesture (Index + Middle + Ring extended, Pinky curled)
    if (
      fingers.index.isExtended &&
      fingers.middle.isExtended &&
      fingers.ring.isExtended &&
      !fingers.pinky.isExtended
    ) {
      const threeConfidence = clamp(
        (fingers.index.extensionRatio + fingers.middle.extensionRatio + fingers.ring.extensionRatio) / 3.0,
        0.7,
        1.0
      );
      return {
        type: 'THREE_FINGERS',
        confidence: threeConfidence,
        handIndex: features.handIndex
      };
    }

    // 7. CIRCULAR_MOTION Gesture (Active circular trajectory with open/relaxed hand)
    if (isCircularMotion && extendedFingerCount >= 3) {
      return {
        type: 'CIRCULAR_MOTION',
        confidence: circularConfidence,
        handIndex: features.handIndex
      };
    }

    // 8. OPEN_PALM Gesture (All or almost all fingers extended)
    if (extendedFingerCount >= 4 || averageFingerCurl < 0.25) {
      const palmConfidence = clamp(1.0 - averageFingerCurl, 0.7, 1.0);
      return {
        type: 'OPEN_PALM',
        confidence: palmConfidence,
        handIndex: features.handIndex
      };
    }

    return {
      type: 'NONE',
      confidence: 0.5,
      handIndex: features.handIndex
    };
  }

  /**
   * Extract two-hand features and classify dual-hand gestures (EXPAND / CONTRACT)
   */
  public classifyTwoHands(
    featuresA: HandFeatures,
    featuresB: HandFeatures,
    now: number
  ): { features: TwoHandFeatures; classification: GestureClassification } {
    const posA = featuresA.palmCentroid;
    const posB = featuresB.palmCentroid;
    const interHandDistance = Math.hypot(posA.x - posB.x, posA.y - posB.y, posA.z - posB.z);

    let radialVelocity = 0;
    if (this.prevInterHandDistance) {
      const dt = Math.max(0.001, (now - this.prevInterHandDistance.timestamp) / 1000);
      radialVelocity = (interHandDistance - this.prevInterHandDistance.distance) / dt;
    }
    this.prevInterHandDistance = { distance: interHandDistance, timestamp: now };

    const midpoint = {
      x: (posA.x + posB.x) / 2,
      y: (posA.y + posB.y) / 2,
      z: (posA.z + posB.z) / 2
    };

    const relativeTilt = {
      pitch: (featuresA.handOrientation.pitch + featuresB.handOrientation.pitch) / 2,
      yaw: (featuresA.handOrientation.yaw + featuresB.handOrientation.yaw) / 2,
      roll: (featuresA.handOrientation.roll + featuresB.handOrientation.roll) / 2
    };

    const twoHandFeatures: TwoHandFeatures = {
      interHandDistance,
      radialVelocity,
      midpoint,
      relativeTilt
    };

    let gesture: SemanticGestureType = 'NONE';
    let confidence = 0.5;

    // Fast expansion
    if (radialVelocity > 0.15) {
      gesture = 'TWO_HAND_EXPAND';
      confidence = clamp(radialVelocity / 0.6, 0.6, 1.0);
    } else if (radialVelocity < -0.15) {
      gesture = 'TWO_HAND_CONTRACT';
      confidence = clamp(Math.abs(radialVelocity) / 0.6, 0.6, 1.0);
    } else {
      gesture = 'OPEN_PALM';
      confidence = 0.75;
    }

    return {
      features: twoHandFeatures,
      classification: {
        type: gesture,
        confidence,
        isTwoHand: true
      }
    };
  }

  public reset(): void {
    this.prevCentroids.clear();
    this.prevCurlAverages.clear();
    this.prevInterHandDistance = null;
  }
}
