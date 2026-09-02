/**
 * Hand tracking landmark and state interfaces
 */

export interface HandLandmark {
  x: number;
  y: number;
  z?: number;
}

export type HandLandmarks = HandLandmark[];

export interface ProcessedHand {
  landmarks: HandLandmarks;
  palmCenter: { x: number; y: number; z: number };
  tilt: { x: number; y: number; z: number };
  isPinching: boolean;
  pinchDistance: number;
  extendedFingers: number;
}

export interface HandState {
  detected: boolean;
  count: number;
  hands: ProcessedHand[];
  handDistance?: number;
}
