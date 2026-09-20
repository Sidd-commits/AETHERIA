import { AetherGuardian } from '../ai/guardian/AetherGuardian';
import { CommandBus } from '../core/CommandBus';
import { UniverseTelemetrySummary, CosmicAnomaly, GuardianRecommendation } from '../types/aether';
import { AIManager } from '../ai/AIManager';

/**
 * AI Observation Panel HUD (AETHER Observatory)
 * Displays real-time aggregated telemetry, cosmos stability score,
 * detected physical & ecological anomalies, proactive guardian recommendations,
 * interactive natural-language Q&A dialog with AETHER, and recent command logs.
 */
export class AIObservationPanel {
  private guardian: AetherGuardian;
  private commandBus: CommandBus;
  private aiManager: AIManager;
  private container: HTMLElement;
  private isVisible: boolean = false;
  private currentTelemetry: UniverseTelemetrySummary | null = null;
  private lastUpdate: number = 0;
  private updateThrottleMs: number = 100; // ~10fps DOM update throttle

  // Cached DOM elements
  private stabilityValEl!: HTMLElement;
  private stabilityBarEl!: HTMLElement;
  private stabilityStatusEl!: HTMLElement;
  private epochTimeEl!: HTMLElement;
  private entityCountsEl!: HTMLElement;
  private energyHotspotEl!: HTMLElement;
  private anomaliesListEl!: HTMLElement;
  private recommendationsListEl!: HTMLElement;
  private chatHistoryEl!: HTMLElement;
  private chatInputEl!: HTMLInputElement;
  private recentCommandsListEl!: HTMLElement;

  constructor(aiManager: AIManager, commandBus: CommandBus = CommandBus.getInstance()) {
    this.guardian = AetherGuardian.getInstance();
    this.aiManager = aiManager;
    this.commandBus = commandBus;
    this.container = document.createElement('div');
    this.container.id = 'aether-observation-panel';
    this.createUI();
    this.bindEvents();
    this.bindKeyboardShortcuts();
  }

  private createUI(): void {
    this.container.className = 'aether-observation-panel interactive';
    this.container.style.cssText = `
      position: absolute;
      top: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      width: 580px;
      max-width: 94vw;
      max-height: 82vh;
      background: rgba(8, 12, 22, 0.88);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(0, 242, 254, 0.35);
      border-radius: 22px;
      padding: 18px 22px;
      z-index: 55;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(0, 242, 254, 0.15);
      font-family: 'Outfit', sans-serif;
      color: #f0f4fc;
      opacity: 0;
      pointer-events: none;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    `;

    this.container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #00f2fe, #7928ca); display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 16px rgba(0, 242, 254, 0.5);">
            👁️
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #ffffff; text-shadow: 0 0 10px rgba(0, 242, 254, 0.6);">
              AETHER OBSERVATORY
            </div>
            <div style="font-size: 10px; color: #8a99ad; letter-spacing: 0.05em;">
              INTELLIGENT GUARDIAN & COSMOS DIAGNOSTICS
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span id="obs-epoch-time" style="font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); color: #c4d7f2; border: 1px solid rgba(255, 255, 255, 0.12);">
            EPOCH: 0.0s
          </span>
          <button id="btn-close-aether-obs" style="background: transparent; border: none; color: #8a99ad; cursor: pointer; font-size: 16px; padding: 2px 6px; line-height: 1;" title="Close Observation Panel (Press 'A')">✕</button>
        </div>
      </div>

      <!-- Top Vitals Ribbon: Stability Gauge & Overview -->
      <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 10px;">
        <!-- Stability Gauge -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 10px 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #8a99ad; text-transform: uppercase; letter-spacing: 0.05em;">Stability Score</span>
            <span id="obs-stability-status" style="font-size: 10px; font-weight: 700; color: #00f5a0;">STABLE</span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px;">
            <span id="obs-stability-val" style="font-size: 22px; font-weight: 700; color: #00f2fe; font-family: 'Cinzel', serif;">100%</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden;">
            <div id="obs-stability-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff0844, #fee140, #00f5a0); border-radius: 3px; transition: width 0.25s ease;"></div>
          </div>
        </div>

        <!-- Entity Counts Card -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 10px 12px;">
          <div style="font-size: 10px; color: #8a99ad; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Celestial Entities</div>
          <div id="obs-entity-counts" style="font-size: 12px; color: #ffffff; font-weight: 600; line-height: 1.4;">
            1 Star, 6 Planets, 0 Singularity
          </div>
        </div>

        <!-- Energy Hotspot Card -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 10px 12px;">
          <div style="font-size: 10px; color: #8a99ad; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Highest Energy Sector</div>
          <div id="obs-energy-hotspot" style="font-size: 11px; color: #ffd200; font-weight: 600; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            Sol Prime Core (1000 E)
          </div>
        </div>
      </div>

      <!-- Detected Anomalies Feed -->
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #ff5e62;">
            ⚠️ Detected Cosmic Anomalies
          </span>
          <span style="font-size: 10px; color: #8a99ad;">Real-time Telemetry</span>
        </div>
        <div id="obs-anomalies-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 100px; overflow-y: auto;">
          <div style="font-size: 11px; color: #8a99ad; font-style: italic;">No critical anomalies detected in the cosmos.</div>
        </div>
      </div>

      <!-- Proactive Guardian Recommendations -->
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #00f2fe;">
            💡 Guardian Recommendations
          </span>
          <span style="font-size: 10px; color: #8a99ad;">Actionable Advice</span>
        </div>
        <div id="obs-recommendations-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
      </div>

      <!-- Interactive Ask AETHER Section -->
      <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 14px; padding: 12px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <span style="font-size: 14px;">💬</span>
          <span style="font-size: 12px; font-weight: 600; color: #00f2fe; text-transform: uppercase; letter-spacing: 0.06em;">Ask AETHER (Cosmic Intelligence)</span>
        </div>

        <!-- Quick Question Chips -->
        <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
          <button class="aether-q-chip" data-q="How many planets exist?">🪐 How many planets exist?</button>
          <button class="aether-q-chip" data-q="What is causing the instability?">⚠️ What is causing the instability?</button>
          <button class="aether-q-chip" data-q="Which region has the highest energy?">⚡ Which region has highest energy?</button>
          <button class="aether-q-chip" data-q="Why are particles collapsing?">🌌 Why are particles collapsing?</button>
          <button class="aether-q-chip" data-q="What will happen if I increase gravity?">🔮 What if I increase gravity?</button>
        </div>

        <!-- Response Window -->
        <div id="obs-chat-history" style="background: rgba(12, 18, 30, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.5; color: #e2e8f0; max-height: 150px; overflow-y: auto; margin-bottom: 8px;">
          <div style="color: #8a99ad; font-style: italic;">Select a question above or type below to consult AETHER regarding current simulation physics, anomalies, or future projections.</div>
        </div>

        <!-- Question Input Bar -->
        <div style="display: flex; gap: 6px;">
          <input id="input-aether-query" type="text" placeholder="Ask AETHER anything about the simulation..." style="
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 7px 12px;
            font-family: inherit;
            font-size: 12px;
            color: #ffffff;
            outline: none;
          " />
          <button id="btn-ask-aether" style="
            background: linear-gradient(135deg, #00f2fe, #4facfe);
            border: none;
            color: #000000;
            border-radius: 8px;
            padding: 7px 14px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(0, 242, 254, 0.4);
          ">Ask AETHER</button>
        </div>
      </div>

      <!-- Recent Commands Audit Feed -->
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 8px;">
        <div style="font-size: 10px; color: #8a99ad; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Recent Command Execution Log</div>
        <div id="obs-recent-commands-list" style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; max-height: 65px; overflow-y: auto;">
          <div style="color: #8a99ad;">No commands registered yet.</div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Style helper classes
    const style = document.createElement('style');
    style.innerHTML = `
      .aether-q-chip {
        background: rgba(0, 242, 254, 0.1);
        border: 1px solid rgba(0, 242, 254, 0.3);
        color: #c4d7f2;
        border-radius: 14px;
        padding: 4px 10px;
        font-family: 'Outfit', sans-serif;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .aether-q-chip:hover {
        background: rgba(0, 242, 254, 0.25);
        border-color: #00f2fe;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 0 10px rgba(0, 242, 254, 0.3);
      }
      .aether-rec-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 6px 10px;
        font-size: 11px;
      }
      .aether-apply-btn {
        background: rgba(0, 245, 160, 0.15);
        border: 1px solid rgba(0, 245, 160, 0.35);
        color: #00f5a0;
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .aether-apply-btn:hover {
        background: rgba(0, 245, 160, 0.3);
        box-shadow: 0 0 10px rgba(0, 245, 160, 0.4);
      }
    `;
    document.head.appendChild(style);

    // Cache elements
    this.stabilityValEl = this.container.querySelector('#obs-stability-val') as HTMLElement;
    this.stabilityBarEl = this.container.querySelector('#obs-stability-bar') as HTMLElement;
    this.stabilityStatusEl = this.container.querySelector('#obs-stability-status') as HTMLElement;
    this.epochTimeEl = this.container.querySelector('#obs-epoch-time') as HTMLElement;
    this.entityCountsEl = this.container.querySelector('#obs-entity-counts') as HTMLElement;
    this.energyHotspotEl = this.container.querySelector('#obs-energy-hotspot') as HTMLElement;
    this.anomaliesListEl = this.container.querySelector('#obs-anomalies-list') as HTMLElement;
    this.recommendationsListEl = this.container.querySelector('#obs-recommendations-list') as HTMLElement;
    this.chatHistoryEl = this.container.querySelector('#obs-chat-history') as HTMLElement;
    this.chatInputEl = this.container.querySelector('#input-aether-query') as HTMLInputElement;
    this.recentCommandsListEl = this.container.querySelector('#obs-recent-commands-list') as HTMLElement;
  }

  private bindEvents(): void {
    // Close button
    const closeBtn = this.container.querySelector('#btn-close-aether-obs');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.toggle();
      });
    }

    // Question chips
    const chips = this.container.querySelectorAll('.aether-q-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const q = (e.currentTarget as HTMLElement).dataset.q;
        if (q) {
          this.submitQuery(q);
        }
      });
    });

    // Query Ask Button
    const askBtn = this.container.querySelector('#btn-ask-aether');
    if (askBtn) {
      askBtn.addEventListener('click', () => {
        this.submitInputQuery();
      });
    }

    this.chatInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitInputQuery();
      }
    });
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'a' || e.key === 'A') {
        this.toggle();
      }
    });
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.container.style.transform = 'translateX(-50%) translateY(0)';
      this.container.style.opacity = '1';
      this.container.style.pointerEvents = 'auto';
    } else {
      this.container.style.transform = 'translateX(-50%) translateY(-20px)';
      this.container.style.opacity = '0';
      this.container.style.pointerEvents = 'none';
    }
    return this.isVisible;
  }

  public show(): void {
    if (!this.isVisible) this.toggle();
  }

  public hide(): void {
    if (this.isVisible) this.toggle();
  }

  private submitInputQuery(): void {
    const val = this.chatInputEl.value.trim();
    if (!val) return;
    this.chatInputEl.value = '';
    this.submitQuery(val);
  }

  /**
   * Submit a query to AETHER Guardian
   */
  public async submitQuery(question: string): Promise<void> {
    if (!this.currentTelemetry) return;

    this.chatHistoryEl.innerHTML = `
      <div style="color: #00f2fe; font-weight: 600; margin-bottom: 4px;">Q: "${question}"</div>
      <div style="color: #ffd200; font-style: italic;">👁️ AETHER analyzing cosmos telemetry...</div>
    `;

    try {
      const response = await this.guardian.query(question, this.currentTelemetry);

      let actionHtml = '';
      if (response.suggestedAction) {
        actionHtml = `
          <div style="margin-top: 8px;">
            <button class="aether-apply-btn" id="btn-chat-action" style="padding: 4px 10px; font-size: 11px;">
              ${response.suggestedAction.label}
            </button>
          </div>
        `;
      }

      this.chatHistoryEl.innerHTML = `
        <div style="color: #00f2fe; font-weight: 600; margin-bottom: 6px;">Q: "${question}"</div>
        <div style="color: #ffffff; white-space: pre-line; margin-bottom: 6px;">${response.answer}</div>
        <div style="font-size: 10px; color: #8a99ad; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px;">
          <b>Reasoning:</b> ${response.reasoning}
        </div>
        ${actionHtml}
      `;

      if (response.suggestedAction) {
        const actionBtn = this.chatHistoryEl.querySelector('#btn-chat-action');
        if (actionBtn) {
          actionBtn.addEventListener('click', () => {
            if (response.suggestedAction) {
              this.commandBus.dispatch(response.suggestedAction.actionCommand as any, response.suggestedAction.payload, 'VOICE_AI');
              this.commandBus.dispatch('SHOW_TOAST', {
                message: `✨ Executed ${response.suggestedAction.label}`,
                icon: '👁️'
              }, 'VOICE_AI');
            }
          });
        }
      }
    } catch (err: any) {
      this.chatHistoryEl.innerHTML = `
        <div style="color: #ff5e62;">Error consulting AETHER: ${err.message}</div>
      `;
    }
  }

  /**
   * Update HUD with live summarized telemetry
   */
  public update(telemetry?: UniverseTelemetrySummary): void {
    if (!telemetry) return;
    this.currentTelemetry = telemetry;

    const now = performance.now();
    if (now - this.lastUpdate < this.updateThrottleMs) {
      return;
    }
    this.lastUpdate = now;

    // 1. Stability Gauge
    this.stabilityValEl.textContent = `${telemetry.stabilityScore}%`;
    this.stabilityBarEl.style.width = `${telemetry.stabilityScore}%`;
    this.stabilityStatusEl.textContent = telemetry.stabilityStatus.replace(/_/g, ' ');

    if (telemetry.stabilityScore >= 75) {
      this.stabilityStatusEl.style.color = '#00f5a0';
      this.stabilityValEl.style.color = '#00f5a0';
    } else if (telemetry.stabilityScore >= 45) {
      this.stabilityStatusEl.style.color = '#ffd200';
      this.stabilityValEl.style.color = '#ffd200';
    } else {
      this.stabilityStatusEl.style.color = '#ff5e62';
      this.stabilityValEl.style.color = '#ff5e62';
    }

    // 2. Epoch Time
    this.epochTimeEl.textContent = `EPOCH: ${telemetry.epochTime.toFixed(1)}s`;

    // 3. Entity Counts
    const { stars, planets, blackHoles, asteroids } = telemetry.entityCounts;
    this.entityCountsEl.textContent = `${stars} Star${stars !== 1 ? 's' : ''}, ${planets} Planet${planets !== 1 ? 's' : ''}, ${blackHoles} Singularity${blackHoles !== 1 ? 'ies' : ''}, ${asteroids} Asteroids`;

    // 4. Energy Hotspot
    const hotspot = telemetry.energyStats.highestEnergyRegion;
    this.energyHotspotEl.textContent = `${hotspot.name} (${hotspot.energyDensity.toFixed(0)} E)`;

    // 5. Anomalies Feed
    if (telemetry.anomalies.length === 0) {
      this.anomaliesListEl.innerHTML = '<div style="font-size: 11px; color: #8a99ad; font-style: italic;">No critical anomalies detected in the cosmos.</div>';
    } else {
      this.anomaliesListEl.innerHTML = telemetry.anomalies
        .map((anom: CosmicAnomaly) => {
          const color = anom.severity === 'CRITICAL' ? '#ff0844' : anom.severity === 'WARNING' ? '#ffd200' : '#00f2fe';
          return `
            <div style="background: rgba(255, 255, 255, 0.03); border-left: 2px solid ${color}; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between;">
                <b style="color: ${color};">${anom.title}</b>
                <span style="font-size: 9px; color: ${color}; font-weight: 600;">${anom.severity}</span>
              </div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">${anom.description}</div>
            </div>
          `;
        })
        .join('');
    }

    // 6. Recommendations
    this.recommendationsListEl.innerHTML = telemetry.recommendations
      .map((rec: GuardianRecommendation) => `
        <div class="aether-rec-card">
          <div style="flex: 1; padding-right: 8px;">
            <b style="color: #ffffff;">${rec.title}</b>
            <div style="font-size: 10px; color: #8a99ad;">${rec.text}</div>
          </div>
          ${rec.suggestedActionCommand ? `<button class="aether-apply-btn" data-action="${rec.suggestedActionCommand}">${rec.suggestedActionName || 'Apply'}</button>` : ''}
        </div>
      `)
      .join('');

    // Bind recommendation apply buttons
    const recButtons = this.recommendationsListEl.querySelectorAll('.aether-apply-btn');
    recButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        if (action) {
          this.commandBus.dispatch(action as any, undefined, 'VOICE_AI');
          this.commandBus.dispatch('SHOW_TOAST', {
            message: `✨ Applied Guardian Recommendation: ${action}`,
            icon: '👁️'
          }, 'VOICE_AI');
        }
      });
    });

    // 7. Recent Commands
    const history = this.aiManager.getHistory();
    if (history.length === 0) {
      this.recentCommandsListEl.innerHTML = '<div style="color: #8a99ad;">No commands registered yet.</div>';
    } else {
      this.recentCommandsListEl.innerHTML = history
        .slice(0, 3)
        .map((item) => `
          <div style="display: flex; justify-content: space-between; color: #cbd5e1;">
            <span>"${item.transcript}"</span>
            <span style="color: ${item.status === 'SUCCESS' ? '#00f5a0' : '#ff5e62'}; font-weight: 600; font-size: 10px;">${item.status}</span>
          </div>
        `)
        .join('');
    }
  }
}
