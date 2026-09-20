import { GestureDetector } from '../gestures/GestureDetector';
import { getOptionalElement } from '../utils/dom';

/**
 * Real-Time Debug Overlay
 * Renders hand landmarks, skeletal connections, trajectory trails,
 * confidence meters, FPS, inference latency, and tracking telemetry.
 */
export class DebugOverlay {
  private detector: GestureDetector;
  private isVisible: boolean = false;
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private hudPanel: HTMLElement | null = null;
  private animFrameId: number | null = null;

  constructor(detector: GestureDetector) {
    this.detector = detector;
    this.createElements();
    this.bindKeyboardToggle();
  }

  private createElements(): void {
    // 1. Overlay Container
    this.container = document.createElement('div');
    this.container.id = 'debug-overlay-container';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 80;
      pointer-events: none;
      display: none;
      font-family: 'Outfit', monospace, sans-serif;
    `;

    // 2. Debug Canvas (Fullscreen overlay for landmark skeletal visualization)
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'debug-canvas';
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    // 3. Telemetry HUD Panel
    this.hudPanel = document.createElement('div');
    this.hudPanel.id = 'debug-telemetry-hud';
    this.hudPanel.style.cssText = `
      position: absolute;
      top: 90px;
      right: 32px;
      width: 320px;
      background: rgba(10, 14, 22, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 242, 254, 0.3);
      border-radius: 16px;
      padding: 16px;
      color: #f0f4fc;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      pointer-events: auto;
      font-size: 12px;
    `;
    this.container.appendChild(this.hudPanel);

    document.body.appendChild(this.container);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  private onResize = (): void => {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  };

  private bindKeyboardToggle(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        this.toggle();
      }
    });
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    if (this.container) {
      this.container.style.display = this.isVisible ? 'block' : 'none';
    }

    const debugBtn = getOptionalElement('btn-toggle-debug');
    if (debugBtn) {
      if (this.isVisible) {
        debugBtn.classList.add('active-glow');
      } else {
        debugBtn.classList.remove('active-glow');
      }
    }

    if (this.isVisible) {
      this.startRenderLoop();
    } else {
      this.stopRenderLoop();
    }

    return this.isVisible;
  }

  public setVisible(visible: boolean): void {
    if (this.isVisible !== visible) {
      this.toggle();
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (!this.isVisible) return;
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.stopRenderLoop();
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopRenderLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private render(): void {
    const telemetry = this.detector.getTelemetry();
    if (!telemetry || !this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Skeletal Landmarks on Fullscreen Canvas (Mirrored for natural camera alignment)
    this.drawSkeleton(telemetry);

    // Update Telemetry Card HUD
    this.updateHUD(telemetry);
  }

  private drawSkeleton(telemetry: import('../types/gesture').DebugTelemetry): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const connections: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17]             // Palm
    ];

    telemetry.smoothedLandmarks.forEach((landmarks, hIdx) => {
      // Draw Bones
      ctx.lineWidth = 3;
      ctx.strokeStyle = hIdx === 0 ? 'rgba(0, 242, 254, 0.7)' : 'rgba(255, 8, 68, 0.7)';
      connections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo((1 - p1.x) * w, p1.y * h);
          ctx.lineTo((1 - p2.x) * w, p2.y * h);
          ctx.stroke();
        }
      });

      // Draw Joints
      landmarks.forEach((p, idx) => {
        const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;
        ctx.fillStyle = isTip ? '#fee140' : (idx === 0 ? '#00f2fe' : '#00f5a0');
        ctx.beginPath();
        ctx.arc((1 - p.x) * w, p.y * h, isTip ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw Palm Centroid & Scale circle
      const palmX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5;
      const palmY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc((1 - palmX) * w, palmY * h, 8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private updateHUD(telemetry: import('../types/gesture').DebugTelemetry): void {
    if (!this.hudPanel) return;

    const stateColor = telemetry.trackingState === 'TRACKING' ? '#00f5a0' : '#ffaa00';
    let handsHtml = '';

    if (telemetry.singleHandGestures.length === 0) {
      handsHtml = `<div style="color: #8a99ad; padding: 8px 0;">Searching for hand landmarks...</div>`;
    } else {
      handsHtml = telemetry.singleHandGestures.map((h) => {
        const pct = Math.round(h.confidence * 100);
        return `
          <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 600; color: #00f2fe;">HAND #${h.handIndex + 1}</span>
              <span style="background: rgba(0, 242, 254, 0.15); color: #00f2fe; padding: 2px 8px; border-radius: 6px; font-weight: 600;">
                ${h.gesture}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 4px;">
              <span>Confidence:</span>
              <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #00f2fe, #00f5a0);"></div>
              </div>
              <span style="font-weight: 600;">${pct}%</span>
            </div>
            <div style="font-size: 11px; color: #8a99ad; display: flex; justify-content: space-between;">
              <span>Fingers: <b>${h.extendedCount}/5</b></span>
              <span>Pinch: <b>${Math.round(h.pinchDist * 100) / 100}</b></span>
              <span>Curl: <b>${Math.round(h.features.averageFingerCurl * 100)}%</b></span>
            </div>
          </div>
        `;
      }).join('');
    }

    let dualHtml = '';
    if (telemetry.twoHandGesture) {
      const dualPct = Math.round(telemetry.twoHandGesture.confidence * 100);
      dualHtml = `
        <div style="margin-top: 10px; padding: 10px; background: rgba(254, 225, 64, 0.08); border-radius: 10px; border: 1px solid rgba(254, 225, 64, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: #fee140;">DUAL HAND</span>
            <span style="color: #fee140; font-weight: 600;">${telemetry.twoHandGesture.gesture}</span>
          </div>
          <div style="font-size: 11px; color: #8a99ad; margin-top: 4px; display: flex; justify-content: space-between;">
            <span>Span: <b>${Math.round(telemetry.twoHandGesture.distance * 100) / 100}</b></span>
            <span>Radial V: <b>${Math.round(telemetry.twoHandGesture.radialVelocity * 100) / 100}</b></span>
            <span>Conf: <b>${dualPct}%</b></span>
          </div>
        </div>
      `;
    }

    this.hudPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <span style="font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff;">Telemetry HUD</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${stateColor}; box-shadow: 0 0 6px ${stateColor};"></span>
          <span style="font-size: 10px; font-weight: 600; color: ${stateColor};">${telemetry.trackingState}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #8a99ad;">
        <span>FPS: <b style="color: #ffffff;">${telemetry.fps}</b></span>
        <span>Latency: <b style="color: #ffffff;">${telemetry.latencyMs} ms</b></span>
        <span>Hands: <b style="color: #ffffff;">${telemetry.handCount}</b></span>
      </div>

      ${handsHtml}
      ${dualHtml}

      <div style="margin-top: 10px; text-align: center; font-size: 10px; color: rgba(255,255,255,0.4);">
        Press <b>'D'</b> or click <b>Debug</b> button to toggle
      </div>
    `;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.stopRenderLoop();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
