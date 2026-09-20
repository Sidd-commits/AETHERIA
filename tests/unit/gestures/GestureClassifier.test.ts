import { describe, it, expect, beforeEach } from 'vitest';
import { GestureClassifier } from '../../../src/gestures/GestureClassifier';
import { HandLandmarks } from '../../../src/types/hand';

/**
 * Helper to build synthetic 21-point hand landmark models
 */
function createSyntheticLandmarks(options: {
  thumbExtended?: boolean;
  indexExtended?: boolean;
  middleExtended?: boolean;
  ringExtended?: boolean;
  pinkyExtended?: boolean;
  isPinching?: boolean;
  scale?: number;
}): HandLandmarks {
  const scale = options.scale ?? 0.2;
  const landmarks: Array<{ x: number; y: number; z: number }> = [];

  // Wrist [0]
  landmarks[0] = { x: 0.5, y: 0.8, z: 0 };

  // Thumb [1..4]
  if (options.isPinching) {
    landmarks[1] = { x: 0.46, y: 0.75, z: 0 };
    landmarks[2] = { x: 0.43, y: 0.7, z: 0 };
    landmarks[3] = { x: 0.45, y: 0.65, z: 0 };
    landmarks[4] = { x: 0.48, y: 0.6, z: 0 }; // close to index tip
  } else if (options.thumbExtended) {
    landmarks[1] = { x: 0.44, y: 0.76, z: 0 };
    landmarks[2] = { x: 0.38, y: 0.72, z: 0 };
    landmarks[3] = { x: 0.32, y: 0.68, z: 0 };
    landmarks[4] = { x: 0.26, y: 0.64, z: 0 };
  } else {
    landmarks[1] = { x: 0.48, y: 0.76, z: 0 };
    landmarks[2] = { x: 0.47, y: 0.72, z: 0 };
    landmarks[3] = { x: 0.48, y: 0.7, z: 0 };
    landmarks[4] = { x: 0.49, y: 0.68, z: 0 };
  }

  // Helper for 4 main fingers
  const addFinger = (mcpBaseX: number, isExtended: boolean, isPinchedTip: boolean = false) => {
    const mcpY = 0.6;
    landmarks.push({ x: mcpBaseX, y: mcpY, z: 0 }); // MCP
    if (isExtended) {
      landmarks.push({ x: mcpBaseX, y: mcpY - scale * 0.33, z: 0 }); // PIP
      landmarks.push({ x: mcpBaseX, y: mcpY - scale * 0.66, z: 0 }); // DIP
      landmarks.push({
        x: isPinchedTip ? 0.48 : mcpBaseX,
        y: isPinchedTip ? 0.6 : mcpY - scale,
        z: 0
      }); // TIP
    } else {
      landmarks.push({ x: mcpBaseX, y: mcpY - scale * 0.2, z: 0.05 }); // PIP
      landmarks.push({ x: mcpBaseX, y: mcpY + scale * 0.1, z: 0.08 }); // DIP (curled)
      landmarks.push({ x: mcpBaseX, y: mcpY + scale * 0.2, z: 0.1 }); // TIP (curled into palm)
    }
  };

  // Index [5..8]
  addFinger(0.48, options.indexExtended ?? false, options.isPinching);
  // Middle [9..12]
  addFinger(0.5, options.middleExtended ?? false);
  // Ring [13..16]
  addFinger(0.52, options.ringExtended ?? false);
  // Pinky [17..20]
  addFinger(0.54, options.pinkyExtended ?? false);

  return landmarks;
}

describe('GestureClassifier Unit Tests', () => {
  let classifier: GestureClassifier;

  beforeEach(() => {
    classifier = new GestureClassifier();
  });

  it('should extract valid palm scale, centroid, and orientation invariants', () => {
    const landmarks = createSyntheticLandmarks({ indexExtended: true, middleExtended: true });
    const now = 1000;
    const features = classifier.extractFeatures(0, landmarks, [], now);

    expect(features.palmScale).toBeGreaterThan(0.04);
    expect(features.palmCentroid.x).toBeCloseTo(0.5, 1);
    expect(features.fingers).toBeDefined();
    expect(features.fingers.index).toBeDefined();
    expect(features.fingers.middle).toBeDefined();
  });

  it('should accurately classify OPEN_PALM with all fingers extended', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: true,
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
      pinkyExtended: true
    });
    const features = classifier.extractFeatures(0, landmarks, [], 1000);
    const classification = classifier.classifySingleHand(features);

    expect(classification.type).toBe('OPEN_PALM');
    expect(classification.confidence).toBeGreaterThan(0.6);
  });

  it('should accurately classify FIST when all fingers are curled', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: false,
      indexExtended: false,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false
    });
    const features = classifier.extractFeatures(0, landmarks, [], 1000);
    const classification = classifier.classifySingleHand(features);

    expect(classification.type).toBe('FIST');
    expect(classification.confidence).toBeGreaterThan(0.6);
  });

  it('should accurately classify POINT when only index is extended', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: false,
      indexExtended: true,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false
    });
    const features = classifier.extractFeatures(0, landmarks, [], 1000);
    const classification = classifier.classifySingleHand(features);

    expect(classification.type).toBe('POINT');
    expect(classification.confidence).toBeGreaterThan(0.6);
  });

  it('should accurately classify PEACE when index and middle are extended', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: false,
      indexExtended: true,
      middleExtended: true,
      ringExtended: false,
      pinkyExtended: false
    });
    const features = classifier.extractFeatures(0, landmarks, [], 1000);
    const classification = classifier.classifySingleHand(features);

    expect(classification.type).toBe('PEACE');
    expect(classification.confidence).toBeGreaterThan(0.6);
  });

  it('should accurately classify THREE_FINGERS when index, middle, ring are extended', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: false,
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
      pinkyExtended: false
    });
    const features = classifier.extractFeatures(0, landmarks, [], 1000);
    const classification = classifier.classifySingleHand(features);

    expect(classification.type).toBe('THREE_FINGERS');
    expect(classification.confidence).toBeGreaterThan(0.6);
  });

  it('should accurately classify PINCH when thumb and index tips are adjacent', () => {
    const landmarks = createSyntheticLandmarks({
      isPinching: true,
      indexExtended: true,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false
    });
    const features = classifier.extractFeatures(0, landmarks, [], 1000);
    const classification = classifier.classifySingleHand(features);

    expect(classification.type).toBe('PINCH');
    expect(classification.confidence).toBeGreaterThan(0.5);
  });

  it('should detect CIRCULAR_MOTION when trajectory exhibits consistent angular sweep', () => {
    const landmarks = createSyntheticLandmarks({
      thumbExtended: true,
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
      pinkyExtended: true
    });
    const trajectory: Array<{ position: { x: number; y: number; z: number }; timestamp: number }> =
      [];

    // Synthesize 20 points in a circle (2 * PI radians)
    const count = 20;
    const radius = 0.15;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      trajectory.push({
        position: {
          x: 0.5 + Math.cos(angle) * radius,
          y: 0.5 + Math.sin(angle) * radius,
          z: 0
        },
        timestamp: 1000 + i * 50
      });
    }

    const features = classifier.extractFeatures(0, landmarks, trajectory, 2000);
    expect(features.isCircularMotion).toBe(true);
    expect(features.circularConfidence).toBeGreaterThan(0.7);

    const classification = classifier.classifySingleHand(features);
    expect(classification.type).toBe('CIRCULAR_MOTION');
  });

  it('should classify two-hand expansion and contraction', () => {
    const landmarksL = createSyntheticLandmarks({ thumbExtended: true, indexExtended: true });
    const landmarksR = createSyntheticLandmarks({ thumbExtended: true, indexExtended: true });

    const f1 = classifier.extractFeatures(0, landmarksL, [], 1000);
    const f2 = classifier.extractFeatures(1, landmarksR, [], 1000);

    // Initial position
    classifier.classifyTwoHands(f1, f2, 1000);

    // Frame 2: Hands move further apart (Expand)
    const f1Moved = { ...f1, palmCentroid: { x: 0.2, y: 0.5, z: 0 } };
    const f2Moved = { ...f2, palmCentroid: { x: 0.8, y: 0.5, z: 0 } };

    const resultExpand = classifier.classifyTwoHands(f1Moved, f2Moved, 1100);
    expect(resultExpand.classification.type).toBe('TWO_HAND_EXPAND');
  });
});
