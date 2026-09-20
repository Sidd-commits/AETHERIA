import { HandLandmarks, HandLandmark } from '../types/hand';
import { SemanticGestureType } from '../types/gesture';

interface TrajectoryPoint {
  position: { x: number; y: number; z: number };
  timestamp: number;
}

/**
 * Gesture Smoother
 * Provides adaptive landmark filtering, trajectory history tracking,
 * hysteresis-based classification stabilization, and action debouncing.
 */
export class GestureSmoother {
  private smoothedLandmarksMap: Map<number, HandLandmark[]> = new Map();
  private trajectoryHistories: Map<number, TrajectoryPoint[]> = new Map();
  private gestureVoteHistories: Map<
    number,
    Array<{ gesture: SemanticGestureType; confidence: number; timestamp: number }>
  > = new Map();
  private cooldownTimestamps: Map<string, number> = new Map();

  // Smoothing parameters
  private readonly historyWindowMs: number = 1000; // 1-second sliding trajectory window
  private readonly voteWindowSize: number = 5; // Frames for temporal voting

  /**
   * Smooth raw 21-point landmarks using adaptive Exponential Moving Average (EMA)
   */
  public smoothLandmarks(
    handIndex: number,
    rawLandmarks: HandLandmarks,
    dt: number
  ): HandLandmarks {
    let smoothed = this.smoothedLandmarksMap.get(handIndex);

    if (!smoothed || smoothed.length !== rawLandmarks.length) {
      // First frame initialization
      smoothed = rawLandmarks.map((p) => ({ x: p.x, y: p.y, z: p.z || 0 }));
      this.smoothedLandmarksMap.set(handIndex, smoothed);
      return smoothed;
    }

    // Dynamic alpha adjusted for delta time
    const baseAlpha = Math.min(1.0, Math.max(0.1, 1 - Math.exp(-dt * 25.0)));

    for (let i = 0; i < rawLandmarks.length; i++) {
      const raw = rawLandmarks[i];
      const prev = smoothed[i];

      // Velocity-adaptive smoothing: higher alpha during fast motion to eliminate lag
      const dist = Math.hypot(raw.x - prev.x, raw.y - prev.y, (raw.z || 0) - (prev.z || 0));
      const dynamicAlpha = Math.min(0.95, baseAlpha + dist * 3.0);

      prev.x = prev.x + (raw.x - prev.x) * dynamicAlpha;
      prev.y = prev.y + (raw.y - prev.y) * dynamicAlpha;
      prev.z = (prev.z || 0) + ((raw.z || 0) - (prev.z || 0)) * dynamicAlpha;
    }

    return smoothed;
  }

  /**
   * Push palm centroid into trajectory history buffer
   */
  public recordTrajectory(
    handIndex: number,
    centroid: { x: number; y: number; z: number },
    now: number
  ): void {
    let history = this.trajectoryHistories.get(handIndex);
    if (!history) {
      history = [];
      this.trajectoryHistories.set(handIndex, history);
    }

    history.push({ position: { ...centroid }, timestamp: now });

    // Prune points older than window
    const cutoff = now - this.historyWindowMs;
    while (history.length > 0 && history[0].timestamp < cutoff) {
      history.shift();
    }
  }

  /**
   * Get recent trajectory history for a hand
   */
  public getTrajectory(handIndex: number): TrajectoryPoint[] {
    return this.trajectoryHistories.get(handIndex) || [];
  }

  /**
   * Stabilize discrete gesture classification across frames via confidence-weighted temporal voting
   */
  public stabilizeGesture(
    handIndex: number,
    candidateGesture: SemanticGestureType,
    confidence: number,
    now: number
  ): { dominantGesture: SemanticGestureType; confidence: number } {
    let votes = this.gestureVoteHistories.get(handIndex);
    if (!votes) {
      votes = [];
      this.gestureVoteHistories.set(handIndex, votes);
    }

    votes.push({ gesture: candidateGesture, confidence, timestamp: now });
    if (votes.length > this.voteWindowSize) {
      votes.shift();
    }

    // Accumulate weighted scores
    const scores = new Map<SemanticGestureType, number>();
    let totalWeight = 0;

    for (let i = 0; i < votes.length; i++) {
      const vote = votes[i];
      // Recent frames get exponentially higher weight
      const recencyWeight = (i + 1) / votes.length;
      const weight = vote.confidence * recencyWeight;
      const currentScore = scores.get(vote.gesture) || 0;
      scores.set(vote.gesture, currentScore + weight);
      totalWeight += weight;
    }

    let dominant: SemanticGestureType = candidateGesture;
    let maxScore = 0;

    scores.forEach((score, gest) => {
      if (score > maxScore) {
        maxScore = score;
        dominant = gest;
      }
    });

    const smoothedConfidence = totalWeight > 0 ? maxScore / totalWeight : confidence;
    return { dominantGesture: dominant, confidence: Math.min(1.0, smoothedConfidence) };
  }

  /**
   * Check if a discrete action can fire given its cooldown timer
   */
  public checkCooldown(actionKey: string, cooldownMs: number, now: number): boolean {
    const lastTime = this.cooldownTimestamps.get(actionKey) || 0;
    if (now - lastTime >= cooldownMs) {
      this.cooldownTimestamps.set(actionKey, now);
      return true;
    }
    return false;
  }

  /**
   * Reset tracking state for lost/occluded hands
   */
  public resetHand(handIndex: number): void {
    this.smoothedLandmarksMap.delete(handIndex);
    this.trajectoryHistories.delete(handIndex);
    this.gestureVoteHistories.delete(handIndex);
  }

  public clearAll(): void {
    this.smoothedLandmarksMap.clear();
    this.trajectoryHistories.clear();
    this.gestureVoteHistories.clear();
    this.cooldownTimestamps.clear();
  }
}
