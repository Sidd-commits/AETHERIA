import { HandLandmarks } from '../types/hand';
import { CommandBus } from '../core/CommandBus';

export type HandResultsCallback = (landmarksArray: HandLandmarks[], rawImage: any) => void;

declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

/**
 * Hand Tracker
 * Encapsulates MediaPipe Hands lifecycle, camera frame streaming, and PiP skeleton drawing
 */
export class HandTracker {
  private videoElement: HTMLVideoElement;
  private pipCanvas: HTMLCanvasElement;
  private pipCtx: CanvasRenderingContext2D;
  private commandBus: CommandBus;
  private onResultsCallback: HandResultsCallback | null = null;
  private handsInstance: any = null;
  private cameraInstance: any = null;
  private isTracking: boolean = false;

  constructor(
    videoElement: HTMLVideoElement,
    pipCanvas: HTMLCanvasElement,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
    this.videoElement = videoElement;
    this.pipCanvas = pipCanvas;
    const ctx = pipCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from PiP canvas');
    }
    this.pipCtx = ctx;
    this.commandBus = commandBus;
  }

  public setOnResults(callback: HandResultsCallback): void {
    this.onResultsCallback = callback;
  }

  /**
   * Poll for window.Hands and window.Camera to be available from CDN scripts
   */
  private async waitForMediaPipe(timeoutMs: number = 8000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (typeof window.Hands !== 'undefined' && typeof window.Camera !== 'undefined') {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return typeof window.Hands !== 'undefined' && typeof window.Camera !== 'undefined';
  }

  public async initialize(): Promise<void> {
    try {
      this.commandBus.dispatch('SET_TRACKING_STATUS', {
        active: false,
        message: 'INITIALIZING CAMERA...'
      }, 'SYSTEM');

      // Wait for CDN scripts if needed
      const ready = await this.waitForMediaPipe();
      if (!ready) {
        throw new Error('MediaPipe Hands or Camera scripts not loaded within timeout.');
      }

      this.handsInstance = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      this.handsInstance.onResults(this.handleResults);

      this.cameraInstance = new window.Camera(this.videoElement, {
        onFrame: async () => {
          if (this.handsInstance) {
            await this.handsInstance.send({ image: this.videoElement });
          }
        },
        width: 640,
        height: 480
      });

      await this.cameraInstance.start();
      this.isTracking = true;

      this.commandBus.dispatch('SET_TRACKING_STATUS', {
        active: false,
        message: 'CAMERA ONLINE'
      }, 'SYSTEM');

      this.commandBus.dispatch('SHOW_TOAST', {
        message: '📷 Webcam & MediaPipe Hands Ready!',
        icon: '📷'
      }, 'SYSTEM');
    } catch (err) {
      console.warn('HandTracker initialization note (fallback to mouse):', err);
      this.commandBus.dispatch('SET_TRACKING_STATUS', {
        active: false,
        message: 'MOUSE CONTROLS ACTIVE'
      }, 'SYSTEM');

      this.commandBus.dispatch('SHOW_TOAST', {
        message: '⚠️ Webcam unavailable. Mouse fallback active.',
        icon: '⚠️'
      }, 'SYSTEM');
    }
  }

  private handleResults = (results: any): void => {
    this.pipCanvas.width = this.videoElement.videoWidth || 320;
    this.pipCanvas.height = this.videoElement.videoHeight || 240;

    // Clear and draw camera image to PiP
    this.pipCtx.clearRect(0, 0, this.pipCanvas.width, this.pipCanvas.height);
    if (results.image) {
      this.pipCtx.drawImage(results.image, 0, 0, this.pipCanvas.width, this.pipCanvas.height);
    }

    const multiHandLandmarks: HandLandmarks[] = results.multiHandLandmarks || [];

    // Draw skeletons
    if (multiHandLandmarks.length > 0) {
      this.drawHandPip(multiHandLandmarks);
    }

    if (this.onResultsCallback) {
      this.onResultsCallback(multiHandLandmarks, results.image);
    }
  };

  /**
   * Draw skeletal joint connections on the Picture-in-Picture monitor
   */
  private drawHandPip(allHands: HandLandmarks[]): void {
    this.pipCtx.lineWidth = 2;

    const connections: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17]             // Palm bridge
    ];

    allHands.forEach((landmarks) => {
      // Connections
      this.pipCtx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
      connections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2) {
          this.pipCtx.beginPath();
          this.pipCtx.moveTo(p1.x * this.pipCanvas.width, p1.y * this.pipCanvas.height);
          this.pipCtx.lineTo(p2.x * this.pipCanvas.width, p2.y * this.pipCanvas.height);
          this.pipCtx.stroke();
        }
      });

      // Key Joints
      landmarks.forEach((p, idx) => {
        this.pipCtx.fillStyle = (idx === 4 || idx === 8) ? '#ff0844' : '#00f5a0';
        this.pipCtx.beginPath();
        this.pipCtx.arc(
          p.x * this.pipCanvas.width,
          p.y * this.pipCanvas.height,
          (idx === 4 || idx === 8) ? 4 : 2.5,
          0,
          Math.PI * 2
        );
        this.pipCtx.fill();
      });
    });
  }

  public isRunning(): boolean {
    return this.isTracking;
  }
}
