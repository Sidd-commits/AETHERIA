import * as THREE from 'three';
import { RENDERING_CONFIG, ANIMATION_CONFIG } from '../config/constants';

/**
 * Three.js Scene, Camera, WebGLRenderer, and container manager
 */
export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleGroup: THREE.Group;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      RENDERING_CONFIG.cameraFov,
      width / height,
      RENDERING_CONFIG.cameraNear,
      RENDERING_CONFIG.cameraFar
    );
    this.camera.position.z = RENDERING_CONFIG.cameraZ;

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERING_CONFIG.maxPixelRatio));
    this.container.appendChild(this.renderer.domElement);

    // 4. Particle Group
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    // 5. Resize listener
    window.addEventListener('resize', this.onWindowResize, false);
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getParticleGroup(): THREE.Group {
    return this.particleGroup;
  }

  /**
   * Update particle group transforms with smooth damping
   */
  public updateTransforms(
    targetPosition: THREE.Vector3,
    targetRotation: THREE.Euler,
    targetScale: number
  ): void {
    // Lerp position
    this.particleGroup.position.lerp(targetPosition, ANIMATION_CONFIG.lerpPosition);

    // Lerp rotation
    this.particleGroup.rotation.x += (targetRotation.x - this.particleGroup.rotation.x) * ANIMATION_CONFIG.lerpRotation;
    this.particleGroup.rotation.y += (targetRotation.y - this.particleGroup.rotation.y) * ANIMATION_CONFIG.lerpRotation;
    this.particleGroup.rotation.z += (targetRotation.z - this.particleGroup.rotation.z) * ANIMATION_CONFIG.lerpRotation;

    // Idle spin
    this.particleGroup.rotation.y += ANIMATION_CONFIG.idleSpinY;

    // Lerp scale
    const currentScale = this.particleGroup.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * ANIMATION_CONFIG.lerpScale;
    this.particleGroup.scale.set(newScale, newScale, newScale);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
