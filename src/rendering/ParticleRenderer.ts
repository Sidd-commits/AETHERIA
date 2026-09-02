import * as THREE from 'three';
import { ParticleBuffer } from '../types/particle';
import { RENDERING_CONFIG } from '../config/constants';

/**
 * Three.js Particle Mesh, Shader Material, and Texture Generation
 */
export class ParticleRenderer {
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;
  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;

  constructor(buffer: ParticleBuffer) {
    this.geometry = new THREE.BufferGeometry();

    this.positionAttribute = new THREE.BufferAttribute(buffer.currentPositions, 3);
    this.colorAttribute = new THREE.BufferAttribute(buffer.colors, 3);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);

    const texture = this.createParticleTexture();

    this.material = new THREE.PointsMaterial({
      size: RENDERING_CONFIG.particleSize,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: RENDERING_CONFIG.particleOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointsMesh = new THREE.Points(this.geometry, this.material);
  }

  /**
   * Procedural circular radial glow sprite generator
   */
  private createParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public getMesh(): THREE.Points {
    return this.pointsMesh;
  }

  /**
   * Flag GPU buffers for re-upload after simulation mutations
   */
  public updateBuffers(): void {
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
