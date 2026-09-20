import { GestureDetector } from '../gestures/GestureDetector';
import { CommandBus } from '../core/CommandBus';
import { getOptionalElement } from '../utils/dom';

/**
 * Real-Time Debug Overlay
 * Renders hand landmarks, skeletal connections, trajectory trails,
 * confidence meters, FPS, inference latency, and Black Hole parameter controls.
 */
export class DebugOverlay {
  private detector: GestureDetector;
  private commandBus: CommandBus;
  private isVisible: boolean = false;
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private hudPanel: HTMLElement | null = null;
  private telemetryContainer: HTMLElement | null = null;
  private controlsContainer: HTMLElement | null = null;
  private animFrameId: number | null = null;

  // Black Hole Param States
  private bhMass: number = 140;
  private bhInfluenceRadius: number = 30;
  private bhAccretionStrength: number = 2.2;
  private bhEventHorizonRadius: number = 1.2;

  constructor(
    detector: GestureDetector,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
    this.detector = detector;
    this.commandBus = commandBus;
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

    // 3. Telemetry & Parameter HUD Panel
    this.hudPanel = document.createElement('div');
    this.hudPanel.id = 'debug-telemetry-hud';
    this.hudPanel.style.cssText = `
      position: absolute;
      top: 90px;
      right: 32px;
      width: 340px;
      max-height: calc(100vh - 180px);
      overflow-y: auto;
      background: rgba(10, 14, 22, 0.9);
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

    this.telemetryContainer = document.createElement('div');
    this.telemetryContainer.id = 'debug-telemetry-section';

    this.controlsContainer = document.createElement('div');
    this.controlsContainer.id = 'debug-controls-section';
    this.renderControlsSection();

    this.hudPanel.appendChild(this.telemetryContainer);
    this.hudPanel.appendChild(this.controlsContainer);
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

  private renderControlsSection(): void {
    if (!this.controlsContainer) return;

    this.controlsContainer.style.cssText = `
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    `;

    this.controlsContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-weight: 700; color: #00f2fe; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">
          🕳️ Black Hole Parameters
        </span>
      </div>

      <!-- Mass Slider -->
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
          <span style="color: #8a99ad;">Mass:</span>
          <span id="bh-val-mass" style="color: #fee140; font-weight: 600;">${this.bhMass}</span>
        </div>
        <input id="bh-input-mass" type="range" min="30" max="400" step="5" value="${this.bhMass}" style="width: 100%; accent-color: #00f2fe; cursor: pointer;" />
      </div>

      <!-- Influence Radius Slider -->
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
          <span style="color: #8a99ad;">Influence Radius:</span>
          <span id="bh-val-radius" style="color: #00f5a0; font-weight: 600;">${this.bhInfluenceRadius}</span>
        </div>
        <input id="bh-input-radius" type="range" min="10" max="60" step="1" value="${this.bhInfluenceRadius}" style="width: 100%; accent-color: #00f5a0; cursor: pointer;" />
      </div>

      <!-- Accretion Strength Slider -->
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
          <span style="color: #8a99ad;">Accretion Strength:</span>
          <span id="bh-val-accretion" style="color: #00f2fe; font-weight: 600;">${this.bhAccretionStrength}x</span>
        </div>
        <input id="bh-input-accretion" type="range" min="0.5" max="5.0" step="0.1" value="${this.bhAccretionStrength}" style="width: 100%; accent-color: #00f2fe; cursor: pointer;" />
      </div>

      <!-- Event Horizon Radius Slider -->
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
          <span style="color: #8a99ad;">Horizon Radius ($r_s$):</span>
          <span id="bh-val-horizon" style="color: #ff0844; font-weight: 600;">${this.bhEventHorizonRadius}</span>
        </div>
        <input id="bh-input-horizon" type="range" min="0.4" max="3.0" step="0.1" value="${this.bhEventHorizonRadius}" style="width: 100%; accent-color: #ff0844; cursor: pointer;" />
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 8px;">
        <button id="btn-spawn-bh-debug" style="
          flex: 1;
          background: rgba(0, 242, 254, 0.2);
          border: 1px solid rgba(0, 242, 254, 0.4);
          color: #00f2fe;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">+ Spawn Hole</button>
        <button id="btn-clear-bh-debug" style="
          flex: 1;
          background: rgba(255, 8, 68, 0.15);
          border: 1px solid rgba(255, 8, 68, 0.35);
          color: #ff5858;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">Clear Holes</button>
      </div>

      <div style="margin-top: 10px; text-align: center; font-size: 10px; color: rgba(255,255,255,0.4);">
        Tip: <b>FIST + Circular Motion</b> or key <b>'B'</b> to spawn
      </div>
    `;

    this.bindControlEvents();
  }

  private bindControlEvents(): void {
    if (!this.controlsContainer) return;

    const inputMass = this.controlsContainer.querySelector('#bh-input-mass') as HTMLInputElement;
    const inputRadius = this.controlsContainer.querySelector('#bh-input-radius') as HTMLInputElement;
    const inputAccretion = this.controlsContainer.querySelector('#bh-input-accretion') as HTMLInputElement;
    const inputHorizon = this.controlsContainer.querySelector('#bh-input-horizon') as HTMLInputElement;

    const valMass = this.controlsContainer.querySelector('#bh-val-mass') as HTMLElement;
    const valRadius = this.controlsContainer.querySelector('#bh-val-radius') as HTMLElement;
    const valAccretion = this.controlsContainer.querySelector('#bh-val-accretion') as HTMLElement;
    const valHorizon = this.controlsContainer.querySelector('#bh-val-horizon') as HTMLElement;

    const syncParams = () => {
      this.commandBus.dispatch('UPDATE_BLACK_HOLE_PARAMS', {
        mass: this.bhMass,
        gravitationalInfluenceRadius: this.bhInfluenceRadius,
        accretionStrength: this.bhAccretionStrength,
        eventHorizonRadius: this.bhEventHorizonRadius
      }, 'UI');
    };

    if (inputMass) {
      inputMass.addEventListener('input', () => {
        this.bhMass = parseFloat(inputMass.value);
        if (valMass) valMass.innerText = `${this.bhMass}`;
        syncParams();
      });
    }

    if (inputRadius) {
      inputRadius.addEventListener('input', () => {
        this.bhInfluenceRadius = parseFloat(inputRadius.value);
        if (valRadius) valRadius.innerText = `${this.bhInfluenceRadius}`;
        syncParams();
      });
    }

    if (inputAccretion) {
      inputAccretion.addEventListener('input', () => {
        this.bhAccretionStrength = parseFloat(inputAccretion.value);
        if (valAccretion) valAccretion.innerText = `${this.bhAccretionStrength}x`;
        syncParams();
      });
    }

    if (inputHorizon) {
      inputHorizon.addEventListener('input', () => {
        this.bhEventHorizonRadius = parseFloat(inputHorizon.value);
        if (valHorizon) valHorizon.innerText = `${this.bhEventHorizonRadius}`;
        syncParams();
      });
    }

    const spawnBtn = this.controlsContainer.querySelector('#btn-spawn-bh-debug');
    if (spawnBtn) {
      spawnBtn.addEventListener('click', () => {
        this.commandBus.dispatch('SPAWN_BLACK_HOLE', {
          position: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 4 },
          mass: this.bhMass,
          radius: 1.0,
          gravitationalInfluenceRadius: this.bhInfluenceRadius,
          accretionStrength: this.bhAccretionStrength,
          eventHorizonRadius: this.bhEventHorizonRadius
        }, 'UI');
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '🕳️ Black Hole Spawned from Debug Panel!',
          icon: '🕳️'
        }, 'UI');
      });
    }

    const clearBtn = this.controlsContainer.querySelector('#btn-clear-bh-debug');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.commandBus.dispatch('CLEAR_BLACK_HOLES', undefined, 'UI');
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '🗑️ Cleared All Black Holes',
          icon: '🗑️'
        }, 'UI');
      });
    }
  }

  private updateHUD(telemetry: import('../types/gesture').DebugTelemetry): void {
    if (!this.telemetryContainer) return;

    const stateColor = telemetry.trackingState === 'TRACKING' ? '#00f5a0' : '#ffaa00';
    let handsHtml = '';

    if (telemetry.singleHandGestures.length === 0) {
      handsHtml = `<div style="color: #8a99ad; padding: 8px 0;">Searching for hand landmarks...</div>`;
    } else {
      handsHtml = telemetry.singleHandGestures.map((h) => {
        const pct = Math.round(h.confidence * 100);
        const fistVortexBadge = h.features?.isFistCircular
          ? `<span style="background: rgba(254, 225, 64, 0.25); color: #fee140; padding: 1px 6px; border-radius: 4px; font-size: 10px; margin-left: 4px;">🌀 VORTEX</span>`
          : '';

        return `
          <div style="margin-top: 8px; padding: 8px 10px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; color: #00f2fe;">HAND #${h.handIndex + 1}</span>
              <div style="display: flex; align-items: center;">
                <span style="background: rgba(0, 242, 254, 0.15); color: #00f2fe; padding: 2px 8px; border-radius: 6px; font-weight: 600;">
                  ${h.gesture}
                </span>
                ${fistVortexBadge}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 4px;">
              <span>Confidence:</span>
              <div style="flex: 1; height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #00f2fe, #00f5a0);"></div>
              </div>
              <span style="font-weight: 600;">${pct}%</span>
            </div>
            <div style="font-size: 10px; color: #8a99ad; display: flex; justify-content: space-between;">
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
        <div style="margin-top: 8px; padding: 8px 10px; background: rgba(254, 225, 64, 0.08); border-radius: 10px; border: 1px solid rgba(254, 225, 64, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: #fee140;">DUAL HAND</span>
            <span style="color: #fee140; font-weight: 600;">${telemetry.twoHandGesture.gesture}</span>
          </div>
          <div style="font-size: 10px; color: #8a99ad; margin-top: 4px; display: flex; justify-content: space-between;">
            <span>Span: <b>${Math.round(telemetry.twoHandGesture.distance * 100) / 100}</b></span>
            <span>Radial V: <b>${Math.round(telemetry.twoHandGesture.radialVelocity * 100) / 100}</b></span>
            <span>Conf: <b>${dualPct}%</b></span>
          </div>
        </div>
      `;
    }

    this.telemetryContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
        <span style="font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff;">Telemetry HUD</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${stateColor}; box-shadow: 0 0 6px ${stateColor};"></span>
          <span style="font-size: 10px; font-weight: 600; color: ${stateColor};">${telemetry.trackingState}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: #8a99ad;">
        <span>FPS: <b style="color: #ffffff;">${telemetry.fps}</b></span>
        <span>Latency: <b style="color: #ffffff;">${telemetry.latencyMs} ms</b></span>
        <span>Hands: <b style="color: #ffffff;">${telemetry.handCount}</b></span>
      </div>

      ${handsHtml}
      ${dualHtml}
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
