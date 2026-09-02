import * as THREE from 'three';
import { ParticleBuffer } from '../types/particle';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { generateFibonacciSphere } from '../utils/math';
import { PALETTES } from '../config/palettes';
import { ANIMATION_CONFIG } from '../config/constants';

/**
 * Particle Simulator
 * Manages particle memory, geometric distribution, theme colors, and simulation updates
 */
export class ParticleSimulator {
  private buffer: ParticleBuffer;
  private physicsEngine: PhysicsEngine;
  private activePaletteIndex: number = 5;

  constructor(physicsEngine: PhysicsEngine) {
    this.physicsEngine = physicsEngine;
    const count = this.physicsEngine.getConfig().particleCount;
    const baseRadius = this.physicsEngine.getConfig().sphereRadius;

    const { positions, sizes } = generateFibonacciSphere(count, baseRadius);

    this.buffer = {
      basePositions: new Float32Array(positions),
      currentPositions: new Float32Array(positions),
      velocities: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      targetColors: new Float32Array(count * 3),
      sizes,
      count
    };

    // Initialize with default palette (Spectrum = 5)
    this.setPalette(5, true);
  }

  public getBuffer(): Readonly<ParticleBuffer> {
    return this.buffer;
  }

  /**
   * Set target color palette for smooth visual transition
   */
  public setPalette(paletteIndex: number, immediate: boolean = false): void {
    const idx = Math.max(0, Math.min(PALETTES.length - 1, paletteIndex));
    this.activePaletteIndex = idx;
    const palette = PALETTES[idx];
    const colorObjs = palette.colors.map((c) => new THREE.Color(c));
    const { count, colors, targetColors } = this.buffer;

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let chosenColor: THREE.Color;

      if (idx === 5) {
        // Spectrum gradient
        const hue = (i / count + 0.1) % 1.0;
        chosenColor = tempColor.setHSL(hue, 0.95, 0.65);
      } else {
        // Blend across palette swatches
        const colorA = colorObjs[i % colorObjs.length];
        const colorB = colorObjs[(i + 1) % colorObjs.length];
        chosenColor = colorA.clone().lerp(colorB, (i % 10) / 10);
      }

      targetColors[i3] = chosenColor.r;
      targetColors[i3 + 1] = chosenColor.g;
      targetColors[i3 + 2] = chosenColor.b;

      if (immediate) {
        colors[i3] = chosenColor.r;
        colors[i3 + 1] = chosenColor.g;
        colors[i3 + 2] = chosenColor.b;
      }
    }
  }

  /**
   * Advance simulation by one frame
   */
  public update(elapsedTime: number, isCharging: boolean, chargeAmount: number): void {
    // Step physics
    this.physicsEngine.step(this.buffer, elapsedTime, isCharging, chargeAmount);

    // Interpolate colors towards targets
    const { count, colors, targetColors } = this.buffer;
    const lerpRate = ANIMATION_CONFIG.lerpColor;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      colors[i3] += (targetColors[i3] - colors[i3]) * lerpRate;
      colors[i3 + 1] += (targetColors[i3 + 1] - colors[i3 + 1]) * lerpRate;
      colors[i3 + 2] += (targetColors[i3 + 2] - colors[i3 + 2]) * lerpRate;
    }
  }

  /**
   * Trigger supernova explosion
   */
  public explode(power: number = 1.0): void {
    this.physicsEngine.triggerExplosion(this.buffer, power);
  }

  public getActivePaletteIndex(): number {
    return this.activePaletteIndex;
  }
}
