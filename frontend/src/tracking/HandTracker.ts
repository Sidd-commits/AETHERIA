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
  private isTracking: boolean = false;
  private isProcessingFrame: boolean = false;
  private lastInferenceTime: number = 0;
  private visionProcessingTimeMs: number = 0;

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

  public getVisionProcessingTimeMs(): number {
    return this.visionProcessingTimeMs;
  }

  public setOnResults(callback: HandResultsCallback): void {
    this.onResultsCallback = callback;
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Poll for window.Hands to be available
   */
  private async waitForMediaPipe(timeoutMs: number = 6000): Promise<boolean> {
    if (typeof window.Hands !== 'undefined') return true;

    try {
      await Promise.all([
        this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
        this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
      ]);
    } catch {
      // Dynamic load failed, fall back to polling
    }

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (typeof window.Hands !== 'undefined') {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return typeof window.Hands !== 'undefined';
  }

  public async initialize(): Promise<void> {
    try {
      this.commandBus.dispatch(
        'SET_TRACKING_STATUS',
        {
          active: false,
          message: 'INITIALIZING CAMERA...'
        },
        'SYSTEM'
      );

      // 1. Direct getUserMedia for immediate webcam video feed
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Webcam API (navigator.mediaDevices.getUserMedia) is not supported in this browser.'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      this.isTracking = true;

      this.commandBus.dispatch(
        'SET_TRACKING_STATUS',
        {
          active: false,
          message: 'CAMERA ONLINE'
        },
        'SYSTEM'
      );

      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: '📷 Camera connected. Initializing Hand AI...',
          icon: '📷'
        },
        'SYSTEM'
      );

      // 2. Initialize MediaPipe Hands
      const handsReady = await this.waitForMediaPipe();
      if (handsReady && window.Hands) {
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

        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: '✨ Hand Tracking Vision AI Active!',
            icon: '✨'
          },
          'SYSTEM'
        );
      } else {
        console.warn(
          'MediaPipe Hands library could not be loaded. Operating in camera preview + mouse mode.'
        );
      }

      // 3. Start high-performance frame processing loop
      this.startFrameLoop();
    } catch (err: any) {
      console.warn('HandTracker initialization note (fallback to mouse):', err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';

      this.commandBus.dispatch(
        'SET_TRACKING_STATUS',
        {
          active: false,
          message: 'MOUSE CONTROLS ACTIVE'
        },
        'SYSTEM'
      );

      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: isPermissionDenied
            ? '⚠️ Camera permission denied. Mouse controls active.'
            : '⚠️ Webcam unavailable. Mouse controls active.',
          icon: '⚠️'
        },
        'SYSTEM'
      );
    }
  }

  private startFrameLoop(): void {
    const processFrame = async () => {
      if (!this.isTracking) return;

      if (this.videoElement.readyState >= 2) {
        // Continuous PiP video feed rendering
        this.pipCanvas.width = this.videoElement.videoWidth || 320;
        this.pipCanvas.height = this.videoElement.videoHeight || 240;
        this.pipCtx.drawImage(this.videoElement, 0, 0, this.pipCanvas.width, this.pipCanvas.height);

        // Send frame to MediaPipe Hands if available (~30 FPS inference throttle)
        const now = performance.now();
        if (this.handsInstance && !this.isProcessingFrame && now - this.lastInferenceTime >= 33.0) {
          this.isProcessingFrame = true;
          this.lastInferenceTime = now;
          const t0 = performance.now();
          try {
            await this.handsInstance.send({ image: this.videoElement });
          } catch {
            // Frame skip
          } finally {
            this.visionProcessingTimeMs = performance.now() - t0;
            this.isProcessingFrame = false;
          }
        }
      }

      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
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
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // Thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // Index
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // Middle
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // Ring
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // Pinky
      [5, 9],
      [9, 13],
      [13, 17] // Palm bridge
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
        this.pipCtx.fillStyle = idx === 4 || idx === 8 ? '#ff0844' : '#00f5a0';
        this.pipCtx.beginPath();
        this.pipCtx.arc(
          p.x * this.pipCanvas.width,
          p.y * this.pipCanvas.height,
          idx === 4 || idx === 8 ? 4 : 2.5,
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
