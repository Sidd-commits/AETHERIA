import { CommandBus } from '../core/CommandBus';
import { AIManager } from '../ai/AIManager';
import { WorldGenValidationResult, CURATED_WORLD_GEN_PROMPTS } from '../types/worldGen';
import { UniverseConfigParser } from '../universe/generator/UniverseConfigParser';
import { WorldGenValidator } from '../universe/generator/WorldGenValidator';
import { PALETTES } from '../config/palettes';

/**
 * Natural-Language Procedural World Generation Studio
 * Glassmorphic 3-step UI interface: Prompt → Generated Configuration → Generated Universe.
 */
export class WorldGenStudio {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private commandBus: CommandBus;
  private aiManager: AIManager;
  private parser: UniverseConfigParser;

  // State
  public currentStep: 1 | 2 | 3 = 1;
  private promptText: string =
    'A peaceful blue universe with three suns and a giant black hole in the center.';
  private currentValidation: WorldGenValidationResult | null = null;
  private isSynthesizing: boolean = false;

  // DOM Elements
  private promptInput!: HTMLTextAreaElement;
  private jsonCodeEl!: HTMLElement;
  private configCardsEl!: HTMLElement;
  private manifestBtn!: HTMLButtonElement;
  private synthesizeBtn!: HTMLButtonElement;
  private stepIndicatorEls: HTMLElement[] = [];
  private stepSections: HTMLElement[] = [];

  constructor(aiManager: AIManager, commandBus: CommandBus = CommandBus.getInstance()) {
    this.aiManager = aiManager;
    this.commandBus = commandBus;
    this.parser = UniverseConfigParser.getInstance();

    this.container = this.createDOM();
    document.body.appendChild(this.container);

    this.bindEvents();

    // Initial pre-parsing of default prompt
    this.runSynthesis(this.promptText, false);
  }

  private createDOM(): HTMLElement {
    const root = document.createElement('div');
    root.id = 'world-gen-studio';
    root.className = 'world-gen-modal interactive';
    root.style.display = 'none';

    root.innerHTML = `
      <div class="world-gen-backdrop"></div>
      <div class="world-gen-dialog">
        <!-- Header -->
        <div class="world-gen-header">
          <div class="world-gen-title-group">
            <div class="world-gen-logo">🌌</div>
            <div>
              <h2 class="world-gen-title">Natural-Language Universe Generator</h2>
              <div class="world-gen-subtitle">Describe a universe in words • Synthesize validated configuration • Manifest into 3D cosmos</div>
            </div>
          </div>
          <button id="wg-close-btn" class="wg-close-btn" title="Close Studio (Esc or W)">✕</button>
        </div>

        <!-- Progress Pipeline Stepper -->
        <div class="wg-stepper-bar">
          <div class="wg-step-item active" data-step="1">
            <div class="wg-step-num">1</div>
            <div class="wg-step-label">Prompt Description</div>
          </div>
          <div class="wg-step-arrow">→</div>
          <div class="wg-step-item" data-step="2">
            <div class="wg-step-num">2</div>
            <div class="wg-step-label">Structured Config</div>
          </div>
          <div class="wg-step-arrow">→</div>
          <div class="wg-step-item" data-step="3">
            <div class="wg-step-num">3</div>
            <div class="wg-step-label">Manifest Universe</div>
          </div>
        </div>

        <!-- Main Body Content -->
        <div class="world-gen-body">

          <!-- STEP 1: Prompt Input -->
          <div class="wg-section" id="wg-section-1">
            <div class="wg-section-header">
              <span class="wg-badge">STEP 1</span>
              <h3>Describe Your Simulated Universe</h3>
            </div>
            <p class="wg-hint">Describe celestial stars, black holes, color themes, gravity dynamics, and energy fields in plain English:</p>

            <div class="wg-prompt-box-wrap">
              <textarea id="wg-prompt-input" class="wg-prompt-textarea" rows="3" placeholder="e.g. A peaceful blue universe with three suns and a giant black hole in the center..."></textarea>
              <div class="wg-prompt-tools">
                <span id="wg-char-count" class="wg-char-count">82 chars</span>
                <button id="wg-voice-btn" class="wg-tool-btn" title="Speak description via microphone">🎙️ Speak</button>
                <button id="wg-clear-btn" class="wg-tool-btn" title="Clear prompt">🗑️ Clear</button>
              </div>
            </div>

            <!-- Quick Preset Chips -->
            <div class="wg-presets-container">
              <div class="wg-presets-label">✨ Quick Inspiration Templates:</div>
              <div class="wg-preset-chips" id="wg-preset-chips"></div>
            </div>

            <div class="wg-actions-row">
              <button id="wg-synthesize-btn" class="wg-primary-btn">
                <span class="wg-btn-icon">✨</span>
                <span>Synthesize Configuration</span>
              </button>
            </div>
          </div>

          <!-- STEP 2: Configuration Inspector -->
          <div class="wg-section" id="wg-section-2" style="display: none;">
            <div class="wg-section-header">
              <span class="wg-badge">STEP 2</span>
              <h3>Generated & Validated UniverseConfiguration</h3>
            </div>

            <!-- Security & Non-Executable Guarantee Banner -->
            <div class="wg-security-banner">
              <div class="wg-sec-icon">🛡️</div>
              <div class="wg-sec-text">
                <b>Strict Non-Executable Data Guarantee</b>: Configuration parsed into safe JSON primitives. Zero executable JavaScript or scripts allowed.
              </div>
              <div id="wg-validation-status" class="wg-sec-badge valid">✓ Validated</div>
            </div>

            <div class="wg-config-split">
              <!-- Visual Property Cards -->
              <div class="wg-visual-cards" id="wg-visual-cards">
                <!-- Injected dynamically -->
              </div>

              <!-- Raw JSON Code Inspector -->
              <div class="wg-json-inspector">
                <div class="wg-json-header">
                  <span>Structured JSON Schema</span>
                  <button id="wg-copy-json-btn" class="wg-mini-btn" title="Copy JSON">📋 Copy</button>
                </div>
                <pre class="wg-json-pre"><code id="wg-json-code"></code></pre>
              </div>
            </div>

            <div class="wg-actions-row">
              <button id="wg-back-to-1-btn" class="wg-secondary-btn">← Edit Description</button>
              <button id="wg-proceed-to-3-btn" class="wg-primary-btn">Proceed to Manifestation →</button>
            </div>
          </div>

          <!-- STEP 3: Universe Manifestation -->
          <div class="wg-section" id="wg-section-3" style="display: none;">
            <div class="wg-section-header">
              <span class="wg-badge">STEP 3</span>
              <h3>Manifest Generated Universe</h3>
            </div>

            <div class="wg-manifest-card" id="wg-manifest-card">
              <div class="wg-manifest-hero">
                <div class="wg-manifest-icon">🪐</div>
                <div class="wg-manifest-details">
                  <h4 id="wg-manifest-title">Cosmic Manifestation Ready</h4>
                  <p id="wg-manifest-desc">The simulation kernel will procedurally spawn celestial bodies, assign relativistic accretion vectors, and set gravitational fields.</p>
                </div>
              </div>

              <div class="wg-manifest-telemetry" id="wg-manifest-telemetry">
                <!-- Dynamic spawn counts -->
              </div>
            </div>

            <div class="wg-actions-row">
              <button id="wg-back-to-2-btn" class="wg-secondary-btn">← Review Configuration</button>
              <button id="wg-manifest-action-btn" class="wg-primary-btn wg-glow-btn">
                <span class="wg-btn-icon">🚀</span>
                <span>Manifest Universe into Simulation</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    this.injectStyles();
    return root;
  }

  private injectStyles(): void {
    const styleId = 'world-gen-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .world-gen-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: #e2e8f0;
      }
      .world-gen-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(4, 7, 18, 0.82);
        backdrop-filter: blur(12px);
      }
      .world-gen-dialog {
        position: relative;
        width: 900px;
        max-width: 95vw;
        max-height: 90vh;
        background: rgba(13, 19, 36, 0.94);
        border: 1px solid rgba(0, 242, 254, 0.28);
        border-radius: 18px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(0, 242, 254, 0.12);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: wgFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes wgFadeIn {
        from { opacity: 0; transform: scale(0.96) translateY(12px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .world-gen-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 24px;
        background: rgba(10, 15, 29, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .world-gen-title-group {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .world-gen-logo {
        font-size: 28px;
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background: linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(107, 17, 255, 0.25));
        border: 1px solid rgba(0, 242, 254, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .world-gen-title {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        background: linear-gradient(90deg, #00f2fe, #fff, #9b51e0);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .world-gen-subtitle {
        font-size: 0.75rem;
        color: #94a3b8;
        margin-top: 2px;
      }
      .wg-close-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #94a3b8;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 0.2s;
      }
      .wg-close-btn:hover {
        background: rgba(255, 88, 88, 0.25);
        border-color: #ff5858;
        color: #fff;
      }

      /* Stepper Bar */
      .wg-stepper-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 12px 24px;
        background: rgba(6, 10, 22, 0.6);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .wg-step-item {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        opacity: 0.5;
        transition: all 0.2s;
      }
      .wg-step-item.active {
        opacity: 1.0;
      }
      .wg-step-item.completed {
        opacity: 0.85;
      }
      .wg-step-num {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
      }
      .wg-step-item.active .wg-step-num {
        background: #00f2fe;
        color: #050b18;
        border-color: #00f2fe;
        box-shadow: 0 0 12px rgba(0, 242, 254, 0.5);
      }
      .wg-step-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #cbd5e1;
      }
      .wg-step-arrow {
        color: #475569;
        font-size: 12px;
      }

      /* Body */
      .world-gen-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }
      .wg-section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .wg-section-header h3 {
        margin: 0;
        font-size: 1.05rem;
        color: #f1f5f9;
      }
      .wg-badge {
        font-size: 0.65rem;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 6px;
        background: rgba(0, 242, 254, 0.15);
        color: #00f2fe;
        border: 1px solid rgba(0, 242, 254, 0.3);
        letter-spacing: 0.5px;
      }
      .wg-hint {
        font-size: 0.82rem;
        color: #94a3b8;
        margin: 0 0 16px 0;
      }

      /* Prompt Box */
      .wg-prompt-box-wrap {
        position: relative;
        background: rgba(8, 12, 24, 0.85);
        border: 1px solid rgba(0, 242, 254, 0.25);
        border-radius: 12px;
        padding: 12px;
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
        transition: border-color 0.2s;
      }
      .wg-prompt-box-wrap:focus-within {
        border-color: #00f2fe;
        box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);
      }
      .wg-prompt-textarea {
        width: 100%;
        background: transparent;
        border: none;
        color: #f8fafc;
        font-family: inherit;
        font-size: 0.95rem;
        line-height: 1.45;
        resize: vertical;
        outline: none;
        box-sizing: border-box;
      }
      .wg-prompt-tools {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
      .wg-char-count {
        font-size: 0.72rem;
        color: #64748b;
        margin-right: auto;
      }
      .wg-tool-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        font-size: 0.75rem;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .wg-tool-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }

      /* Presets */
      .wg-presets-container {
        margin: 18px 0;
      }
      .wg-presets-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #94a3b8;
        margin-bottom: 10px;
      }
      .wg-preset-chips {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 10px;
      }
      .wg-preset-chip {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .wg-preset-chip:hover {
        background: rgba(0, 242, 254, 0.1);
        border-color: rgba(0, 242, 254, 0.4);
        transform: translateY(-2px);
      }
      .wg-chip-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .wg-chip-title {
        font-size: 0.8rem;
        font-weight: 700;
        color: #e2e8f0;
      }
      .wg-chip-tag {
        font-size: 0.65rem;
        padding: 1px 6px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        color: #94a3b8;
      }
      .wg-chip-prompt {
        font-size: 0.72rem;
        color: #94a3b8;
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Action Buttons */
      .wg-actions-row {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
      }
      .wg-primary-btn {
        background: linear-gradient(135deg, #00f2fe, #4facfe);
        color: #061021;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 10px 20px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3);
      }
      .wg-primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 242, 254, 0.5);
      }
      .wg-secondary-btn {
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        font-weight: 600;
        font-size: 0.85rem;
        padding: 10px 18px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        cursor: pointer;
        transition: all 0.2s;
      }
      .wg-secondary-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
      .wg-glow-btn {
        background: linear-gradient(135deg, #00f5a0, #00d9f5);
        box-shadow: 0 0 25px rgba(0, 245, 160, 0.4);
      }

      /* Security Banner */
      .wg-security-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: rgba(0, 245, 160, 0.08);
        border: 1px solid rgba(0, 245, 160, 0.25);
        border-radius: 10px;
        margin-bottom: 16px;
      }
      .wg-sec-icon { font-size: 20px; }
      .wg-sec-text {
        font-size: 0.78rem;
        color: #cbd5e1;
        flex: 1;
        line-height: 1.4;
      }
      .wg-sec-badge {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        background: #00f5a0;
        color: #061021;
      }

      /* Step 2 Config Split */
      .wg-config-split {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 16px;
      }
      @media (max-width: 768px) {
        .wg-config-split { grid-template-columns: 1fr; }
      }
      .wg-visual-cards {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .wg-metric-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
      }
      .wg-metric-label {
        font-size: 0.78rem;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .wg-metric-value {
        font-size: 0.85rem;
        font-weight: 700;
        color: #f1f5f9;
      }
      .wg-swatch-pills {
        display: flex;
        gap: 4px;
      }
      .wg-swatch-pill {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* JSON Inspector */
      .wg-json-inspector {
        background: rgba(4, 7, 18, 0.9);
        border: 1px solid rgba(0, 242, 254, 0.2);
        border-radius: 10px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .wg-json-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 0.75rem;
        color: #94a3b8;
      }
      .wg-mini-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #cbd5e1;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
      }
      .wg-json-pre {
        margin: 0;
        padding: 12px;
        font-family: 'Fira Code', monospace;
        font-size: 0.76rem;
        color: #00f2fe;
        overflow-x: auto;
        max-height: 240px;
      }

      /* Step 3 Manifest */
      .wg-manifest-card {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(0, 245, 160, 0.3);
        border-radius: 14px;
        padding: 20px;
      }
      .wg-manifest-hero {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 18px;
      }
      .wg-manifest-icon {
        font-size: 36px;
        width: 60px;
        height: 60px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(0, 245, 160, 0.2), rgba(0, 217, 245, 0.2));
        border: 1px solid rgba(0, 245, 160, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .wg-manifest-details h4 {
        margin: 0 0 4px 0;
        font-size: 1.05rem;
        color: #f8fafc;
      }
      .wg-manifest-details p {
        margin: 0;
        font-size: 0.8rem;
        color: #94a3b8;
      }
      .wg-manifest-telemetry {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        padding-top: 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .wg-tel-item {
        background: rgba(8, 12, 24, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 8px 10px;
        text-align: center;
      }
      .wg-tel-val {
        font-size: 1.1rem;
        font-weight: 800;
        color: #00f2fe;
      }
      .wg-tel-label {
        font-size: 0.68rem;
        color: #94a3b8;
        margin-top: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    // DOM reference lookups
    this.promptInput = this.container.querySelector('#wg-prompt-input') as HTMLTextAreaElement;
    this.jsonCodeEl = this.container.querySelector('#wg-json-code') as HTMLElement;
    this.configCardsEl = this.container.querySelector('#wg-visual-cards') as HTMLElement;
    this.synthesizeBtn = this.container.querySelector('#wg-synthesize-btn') as HTMLButtonElement;
    this.manifestBtn = this.container.querySelector('#wg-manifest-action-btn') as HTMLButtonElement;

    this.stepSections = [
      this.container.querySelector('#wg-section-1') as HTMLElement,
      this.container.querySelector('#wg-section-2') as HTMLElement,
      this.container.querySelector('#wg-section-3') as HTMLElement
    ];
    this.stepIndicatorEls = Array.from(
      this.container.querySelectorAll('.wg-step-item')
    ) as HTMLElement[];

    // Set initial prompt
    this.promptInput.value = this.promptText;
    this.updateCharCount();

    // Populate preset chips
    const chipsContainer = this.container.querySelector('#wg-preset-chips') as HTMLElement;
    chipsContainer.innerHTML = CURATED_WORLD_GEN_PROMPTS.map(
      (p) => `
      <button class="wg-preset-chip" data-prompt="${this.escapeHtml(p.prompt)}">
        <div class="wg-chip-top">
          <span class="wg-chip-title">${p.icon} ${p.title}</span>
          <span class="wg-chip-tag">${p.tag}</span>
        </div>
        <div class="wg-chip-prompt">${p.prompt}</div>
      </button>
    `
    ).join('');

    chipsContainer.querySelectorAll('.wg-preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt') || '';
        this.promptInput.value = text;
        this.promptText = text;
        this.updateCharCount();
        this.runSynthesis(text, true);
      });
    });

    // Close button & backdrop click
    this.container.querySelector('#wg-close-btn')?.addEventListener('click', () => this.hide());
    this.container
      .querySelector('.world-gen-backdrop')
      ?.addEventListener('click', () => this.hide());

    // Prompt input typing
    this.promptInput.addEventListener('input', () => {
      this.promptText = this.promptInput.value;
      this.updateCharCount();
    });

    // Clear prompt button
    this.container.querySelector('#wg-clear-btn')?.addEventListener('click', () => {
      this.promptInput.value = '';
      this.promptText = '';
      this.updateCharCount();
    });

    // Voice input button
    this.container.querySelector('#wg-voice-btn')?.addEventListener('click', () => {
      const speech = this.aiManager.getSpeechEngine();
      if (!speech.getIsSupported()) {
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: 'Speech recognition is not supported in this browser.',
            icon: '⚠️'
          },
          'VOICE_AI'
        );
        return;
      }
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: '🎙️ Listening... Speak your universe description.',
          icon: '🎙️'
        },
        'VOICE_AI'
      );
      const unsubscribe = speech.addCallbacks({
        onFinal: (transcript: string) => {
          this.promptInput.value = transcript;
          this.promptText = transcript;
          this.updateCharCount();
          this.runSynthesis(transcript, true);
          speech.stop();
          unsubscribe();
        }
      });
      speech.start();
    });

    // Synthesize button (Step 1 -> Step 2)
    this.synthesizeBtn.addEventListener('click', () => {
      this.runSynthesis(this.promptInput.value, true);
    });

    // Step Navigation buttons
    this.container
      .querySelector('#wg-back-to-1-btn')
      ?.addEventListener('click', () => this.setStep(1));
    this.container
      .querySelector('#wg-proceed-to-3-btn')
      ?.addEventListener('click', () => this.setStep(3));
    this.container
      .querySelector('#wg-back-to-2-btn')
      ?.addEventListener('click', () => this.setStep(2));

    // Stepper header clicks
    this.stepIndicatorEls.forEach((item) => {
      item.addEventListener('click', () => {
        const step = parseInt(item.getAttribute('data-step') || '1', 10) as 1 | 2 | 3;
        this.setStep(step);
      });
    });

    // Copy JSON button
    this.container.querySelector('#wg-copy-json-btn')?.addEventListener('click', () => {
      if (this.currentValidation) {
        navigator.clipboard.writeText(
          JSON.stringify(this.currentValidation.sanitizedConfig, null, 2)
        );
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: '📋 UniverseConfiguration JSON copied to clipboard!',
            icon: '✓'
          },
          'UI'
        );
      }
    });

    // Manifest Universe Action (Step 3 execute)
    this.manifestBtn.addEventListener('click', () => {
      this.manifestUniverse();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      } else if ((e.key === 'w' || e.key === 'W') && !this.isTypingInInput(e)) {
        this.toggle();
      }
    });

    // Listen to command bus for toggle
    this.commandBus.on('TOGGLE_WORLD_GEN', () => {
      this.toggle();
    });
  }

  private isTypingInInput(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    return !!(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'));
  }

  private updateCharCount(): void {
    const el = this.container.querySelector('#wg-char-count');
    if (el) el.textContent = `${this.promptInput.value.length} chars`;
  }

  /**
   * Parse prompt and synthesize UniverseConfiguration
   */
  public async runSynthesis(promptText: string, advanceToStep2: boolean = true): Promise<void> {
    if (this.isSynthesizing) return;
    this.isSynthesizing = true;
    this.synthesizeBtn.innerHTML = `<span>⏳ Synthesizing...</span>`;

    try {
      const validation = await this.parser.parseDescription(promptText);
      this.currentValidation = validation;

      this.renderConfiguration(validation);

      if (advanceToStep2) {
        this.setStep(2);
      }
    } catch (err) {
      console.error('Failed to parse universe configuration:', err);
    } finally {
      this.isSynthesizing = false;
      this.synthesizeBtn.innerHTML = `<span class="wg-btn-icon">✨</span><span>Synthesize Configuration</span>`;
    }
  }

  private renderConfiguration(validation: WorldGenValidationResult): void {
    const cfg = validation.sanitizedConfig;

    // 1. JSON Code display
    this.jsonCodeEl.textContent = JSON.stringify(cfg, null, 2);

    // 2. Palette Swatches lookup
    const paletteIndex = WorldGenValidator.getPaletteIndex(cfg.colorPalette);
    const palette = PALETTES[paletteIndex] || PALETTES[1];

    // 3. Visual Property Cards
    this.configCardsEl.innerHTML = `
      <div class="wg-metric-card">
        <span class="wg-metric-label">🎨 Color Palette</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="wg-metric-value" style="color: ${palette.colors[0]};">${palette.name}</span>
          <div class="wg-swatch-pills">
            ${palette.colors.map((c) => `<div class="wg-swatch-pill" style="background: ${c};"></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="wg-metric-card">
        <span class="wg-metric-label">🎭 Cosmological Theme</span>
        <span class="wg-metric-value" style="text-transform: capitalize; color: #00f2fe;">${cfg.theme}</span>
      </div>

      <div class="wg-metric-card">
        <span class="wg-metric-label">☀️ Star Count (Suns)</span>
        <span class="wg-metric-value">${cfg.stars} ★</span>
      </div>

      <div class="wg-metric-card">
        <span class="wg-metric-label">🕳️ Black Holes (Singularities)</span>
        <span class="wg-metric-value" style="color: ${cfg.blackHoles > 0 ? '#ff5858' : '#94a3b8'};">${cfg.blackHoles}</span>
      </div>

      <div class="wg-metric-card">
        <span class="wg-metric-label">🪐 Orbiting Planets</span>
        <span class="wg-metric-value">${cfg.planets ?? cfg.stars * 3} ♁</span>
      </div>

      <div class="wg-metric-card">
        <span class="wg-metric-label">⚡ Gravitational Constant</span>
        <span class="wg-metric-value">G = ${cfg.gravity.toFixed(2)}</span>
      </div>

      <div class="wg-metric-card">
        <span class="wg-metric-label">✨ Energy Density</span>
        <span class="wg-metric-value">${cfg.energyDensity.toFixed(2)} E</span>
      </div>

      <div class="wg-metric-card">
        <span class="wg-metric-label">🌀 Star Formation Rate</span>
        <span class="wg-metric-value">${cfg.formationRate.toFixed(2)}×</span>
      </div>
    `;

    // 4. Update Step 3 Manifest Telemetry
    const telemetryEl = this.container.querySelector('#wg-manifest-telemetry');
    if (telemetryEl) {
      telemetryEl.innerHTML = `
        <div class="wg-tel-item">
          <div class="wg-tel-val">${cfg.stars}</div>
          <div class="wg-tel-label">Stars</div>
        </div>
        <div class="wg-tel-item">
          <div class="wg-tel-val">${cfg.planets ?? cfg.stars * 3}</div>
          <div class="wg-tel-label">Planets</div>
        </div>
        <div class="wg-tel-item">
          <div class="wg-tel-val" style="color: ${cfg.blackHoles > 0 ? '#ff5858' : '#94a3b8'};">${cfg.blackHoles}</div>
          <div class="wg-tel-label">Black Holes</div>
        </div>
        <div class="wg-tel-item">
          <div class="wg-tel-val">5,000</div>
          <div class="wg-tel-label">Particles</div>
        </div>
        <div class="wg-tel-item">
          <div class="wg-tel-val">${cfg.seedOrganisms ? 'Active' : 'Dormant'}</div>
          <div class="wg-tel-label">Ecosystem</div>
        </div>
      `;
    }
  }

  /**
   * Manifest universe into active simulation
   */
  public manifestUniverse(): void {
    if (!this.currentValidation || !this.currentValidation.isValid) return;

    const config = this.currentValidation.sanitizedConfig;

    // Dispatch typed command to UniverseEngine
    this.commandBus.dispatch('GENERATE_PROCEDURAL_UNIVERSE', { config }, 'UI');

    this.commandBus.dispatch(
      'SHOW_TOAST',
      {
        message: `🌌 Manifesting Universe: "${config.prompt || config.theme}"`,
        icon: '🪐'
      },
      'UI'
    );

    this.hide();
  }

  public setStep(step: 1 | 2 | 3): void {
    this.currentStep = step;

    // Toggle section visibility
    this.stepSections.forEach((sec, idx) => {
      sec.style.display = idx + 1 === step ? 'block' : 'none';
    });

    // Update stepper bar items
    this.stepIndicatorEls.forEach((item, idx) => {
      const s = idx + 1;
      item.classList.remove('active', 'completed');
      if (s === step) item.classList.add('active');
      else if (s < step) item.classList.add('completed');
    });
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'flex';
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  public toggle(): boolean {
    if (this.isVisible) this.hide();
    else this.show();
    return this.isVisible;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
