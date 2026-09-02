/**
 * Gesture types and classification structures
 */

export type GestureType =
  | 'NONE'
  | 'SINGLE_HAND_MOVE'
  | 'PINCH_CHARGE'
  | 'PINCH_RELEASE'
  | 'TWO_HAND_SCALE'
  | 'FINGER_COUNT_PALETTE';

export interface Gesture {
  type: GestureType;
  confidence: number;
  payload?: Record<string, unknown>;
}
