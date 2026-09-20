import * as THREE from 'three';
import { UniverseSnapshot } from '../types/universe';
import { UniverseEntity } from '../types/entity';

/**
 * Decoupled Three.js Universe Visualizer
 * Pure passive consumer of UniverseEngine snapshots.
 */
export class UniverseRenderer {
  private group: THREE.Group;

  // Visual Mesh Caches keyed by Entity ID
  private entityMeshes: Map<string, THREE.Object3D> = new Map();
  private entityLights: Map<string, THREE.PointLight> = new Map();

  // Cosmic Particle Mesh
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particlePoints: THREE.Points;
  private particlePosAttr: THREE.BufferAttribute;
  private particleColAttr: THREE.BufferAttribute;

  // Shared Geometries & Materials
  private sphereGeo: THREE.SphereGeometry;
  private starCoronaTexture: THREE.CanvasTexture;

  constructor() {
    this.group = new THREE.Group();
    this.sphereGeo = new THREE.SphereGeometry(1, 24, 24);
    this.starCoronaTexture = this.createGlowTexture();

    // Setup cosmic particle points buffer
    this.particleGeometry = new THREE.BufferGeometry();
    const maxParticles = 6000;
    const initialPositions = new Float32Array(maxParticles * 3);
    const initialColors = new Float32Array(maxParticles * 3);

    this.particlePosAttr = new THREE.BufferAttribute(initialPositions, 3);
    this.particleColAttr = new THREE.BufferAttribute(initialColors, 3);
    this.particleGeometry.setAttribute('position', this.particlePosAttr);
    this.particleGeometry.setAttribute('color', this.particleColAttr);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.26,
      map: this.starCoronaTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particlePoints);
  }

  public getRootGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Procedural circular radial glow sprite generator
   */
  private createGlowTexture(): THREE.CanvasTexture {
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

  /**
   * Render pass: Synchronize visual 3D scene with snapshot data from UniverseEngine
   */
  public renderSnapshot(snapshot: UniverseSnapshot): void {
    const activeEntityIds = new Set<string>();

    // 1. Update Celestial Entities
    snapshot.entities.forEach((entity) => {
      activeEntityIds.add(entity.id);
      let mesh = this.entityMeshes.get(entity.id);

      if (!mesh) {
        mesh = this.createEntityMesh(entity);
        this.entityMeshes.set(entity.id, mesh);
        this.group.add(mesh);
      }

      // Update transform
      mesh.position.set(entity.position.x, entity.position.y, entity.position.z);
      mesh.scale.set(entity.radius, entity.radius, entity.radius);

      // Entity-specific animation/visuals
      if (entity.type === 'STAR') {
        mesh.rotation.y += 0.005;
        const light = this.entityLights.get(entity.id);
        if (light) {
          light.position.set(entity.position.x, entity.position.y, entity.position.z);
        }
      } else if (entity.type === 'BLACK_HOLE') {
        mesh.rotation.y += 0.02;
      } else if (entity.type === 'ENERGY_FIELD') {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = 0.2 + (entity.fieldHarmonics || 0) * 0.4;
        }
      } else if (entity.type === 'PLANET' || entity.type === 'ASTEROID') {
        mesh.rotation.y += 0.01;
      }
    });

    // 2. Prune Dead Entity Meshes
    this.entityMeshes.forEach((mesh, id) => {
      if (!activeEntityIds.has(id)) {
        this.group.remove(mesh);
        const light = this.entityLights.get(id);
        if (light) {
          this.group.remove(light);
          this.entityLights.delete(id);
        }
        this.entityMeshes.delete(id);
      }
    });

    // 3. Update Cosmic Particle Buffer
    const { count, positions, colors } = snapshot.particles;
    this.particleGeometry.setDrawRange(0, count);

    // Direct copy to Three.js BufferAttributes
    const posArray = this.particlePosAttr.array as Float32Array;
    const colArray = this.particleColAttr.array as Float32Array;

    for (let i = 0; i < count * 3; i++) {
      posArray[i] = positions[i];
      colArray[i] = colors[i];
    }

    this.particlePosAttr.needsUpdate = true;
    this.particleColAttr.needsUpdate = true;
  }

  /**
   * Create visual 3D representation based on entity type
   */
  private createEntityMesh(entity: UniverseEntity): THREE.Object3D {
    const colorHex = typeof entity.color === 'string' ? entity.color : '#00f2fe';

    switch (entity.type) {
      case 'STAR': {
        const starGroup = new THREE.Group();
        // Emissive Core Sphere
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex
        });
        const coreMesh = new THREE.Mesh(this.sphereGeo, mat);
        starGroup.add(coreMesh);

        // Corona Halo
        const spriteMat = new THREE.SpriteMaterial({
          map: this.starCoronaTexture,
          color: colorHex,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.85
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(3.5, 3.5, 1);
        starGroup.add(sprite);

        // Point light for solar illumination
        const light = new THREE.PointLight(colorHex, 2.0, 30.0);
        this.group.add(light);
        this.entityLights.set(entity.id, light);

        return starGroup;
      }

      case 'BLACK_HOLE': {
        const bhGroup = new THREE.Group();
        // Pitch Black Event Horizon
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const coreMesh = new THREE.Mesh(this.sphereGeo, coreMat);
        bhGroup.add(coreMesh);

        // Relativistic Accretion Ring
        const ringGeo = new THREE.RingGeometry(1.2, 3.8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfee140,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        bhGroup.add(ringMesh);

        return bhGroup;
      }

      case 'PLANET': {
        const mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.7,
          metalness: 0.1
        });
        return new THREE.Mesh(this.sphereGeo, mat);
      }

      case 'ASTEROID': {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x8a99ad,
          roughness: 0.9,
          metalness: 0.2
        });
        const mesh = new THREE.Mesh(this.sphereGeo, mat);
        mesh.scale.set(0.12, 0.1, 0.14);
        return mesh;
      }

      case 'ENERGY_FIELD': {
        const geo = new THREE.IcosahedronGeometry(1.5, 2);
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          wireframe: true,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending
        });
        return new THREE.Mesh(geo, mat);
      }

      case 'NEBULA':
      default: {
        const geo = new THREE.SphereGeometry(1, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.12,
          wireframe: true,
          blending: THREE.AdditiveBlending
        });
        return new THREE.Mesh(geo, mat);
      }
    }
  }

  public dispose(): void {
    this.entityMeshes.forEach((mesh) => this.group.remove(mesh));
    this.entityLights.forEach((light) => this.group.remove(light));
    this.entityMeshes.clear();
    this.entityLights.clear();
    this.sphereGeo.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
