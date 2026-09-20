import { describe, it, expect, beforeEach } from 'vitest';
import { GestureSmoother } from '../../../src/gestures/GestureSmoother';
import { HandLandmarks } from '../../../src/types/hand';

describe('GestureSmoother Unit Tests', () => {
  let smoother: GestureSmoother;

  beforeEach(() => {
    smoother = new GestureSmoother();
  });

  it('should initialize landmarks on first frame and smooth on subsequent frames', () => {
    const rawFrame1: HandLandmarks = [
      { x: 0.1, y: 0.2, z: 0.0 },
      { x: 0.2, y: 0.3, z: 0.0 }
    ];

    const smoothed1 = smoother.smoothLandmarks(0, rawFrame1, 0.016);
    expect(smoothed1[0].x).toBeCloseTo(0.1, 4);
    expect(smoothed1[0].y).toBeCloseTo(0.2, 4);

    // Frame 2 with step displacement
    const rawFrame2: HandLandmarks = [
      { x: 0.2, y: 0.4, z: 0.0 },
      { x: 0.3, y: 0.5, z: 0.0 }
    ];

    const smoothed2 = smoother.smoothLandmarks(0, rawFrame2, 0.016);
    // Should be smoothly interpolated between 0.1 and 0.2
    expect(smoothed2[0].x).toBeGreaterThan(0.1);
    expect(smoothed2[0].x).toBeLessThan(0.2);
  });

  it('should maintain trajectory sliding window within history limit', () => {
    const now = 1000;
    for (let i = 0; i < 30; i++) {
      smoother.recordTrajectory(0, { x: i * 0.01, y: i * 0.01, z: 0 }, now + i * 50);
    }

    const trajectory = smoother.getTrajectory(0);
    expect(trajectory.length).toBeGreaterThan(5);
    // Oldest points older than window should be trimmed
    expect(trajectory[0].timestamp).toBeGreaterThanOrEqual(now + 29 * 50 - 1000);
  });

  it('should stabilize noisy gesture fluctuations via temporal voting', () => {
    const now = 1000;
    // Push candidate OPEN_PALM
    for (let i = 0; i < 5; i++) {
      const stable = smoother.stabilizeGesture(0, 'OPEN_PALM', 0.9, now + i * 30);
      if (i >= 2) {
        expect(stable.dominantGesture).toBe('OPEN_PALM');
      }
    }

    // A single noisy frame of FIST should not immediately flip the stabilized gesture
    const noisyFist = smoother.stabilizeGesture(0, 'FIST', 0.8, now + 160);
    expect(noisyFist.dominantGesture).toBe('OPEN_PALM');
  });

  it('should enforce action cooldown intervals correctly', () => {
    const now = 1000;
    const key = 'SPAWN_SUPERNOVA';
    const cooldownMs = 500;

    // First trigger should be allowed
    const canTrigger1 = smoother.checkCooldown(key, cooldownMs, now);
    expect(canTrigger1).toBe(true);

    // Immediate re-trigger within cooldown should be rejected
    const canTrigger2 = smoother.checkCooldown(key, cooldownMs, now + 200);
    expect(canTrigger2).toBe(false);

    // Trigger after cooldown interval has elapsed should be permitted
    const canTrigger3 = smoother.checkCooldown(key, cooldownMs, now + 600);
    expect(canTrigger3).toBe(true);
  });

  it('should reset smoothed states when hand is lost or reset', () => {
    smoother.smoothLandmarks(0, [{ x: 0.5, y: 0.5 }], 0.016);
    smoother.recordTrajectory(0, { x: 0.5, y: 0.5, z: 0 }, 1000);

    smoother.resetHand(0);
    expect(smoother.getTrajectory(0).length).toBe(0);
  });
});
