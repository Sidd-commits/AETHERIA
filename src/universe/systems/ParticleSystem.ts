import { CosmicParticleBuffer, UniverseEntity } from '../../types/entity';
import { UniverseConfig } from '../../types/universe';

/**
 * Particle System
 * Manages high-performance typed buffer arrays for cosmic dust,
 * accretion disk spiral flows, stellar winds, and debris particles.
 */
export class ParticleSystem {
  private buffer: CosmicParticleBuffer;

  constructor(maxParticles: number = 6000) {
    this.buffer = {
      positions: new Float32Array(maxParticles * 3),
      velocities: new Float32Array(maxParticles * 3),
      colors: new Float32Array(maxParticles * 3),
      targetColors: new Float32Array(maxParticles * 3),
      sizes: new Float32Array(maxParticles),
      energies: new Float32Array(maxParticles),
      lifetimes: new Float32Array(maxParticles),
      ages: new Float32Array(maxParticles),
      count: 0,
      maxCount: maxParticles
    };
  }

  public getBuffer(): CosmicParticleBuffer {
    return this.buffer;
  }

  /**
   * Reset and seed particle buffer with a specific distribution pattern
   */
  public seedAccretionDisk(
    center: { x: number; y: number; z: number },
    innerRadius: number,
    outerRadius: number,
    count: number,
    color: [number, number, number] = [0.0, 0.95, 1.0]
  ): void {
    const num = Math.min(count, this.buffer.maxCount);
    this.buffer.count = num;

    for (let i = 0; i < num; i++) {
      const i3 = i * 3;
      const r = innerRadius + Math.random() * (outerRadius - innerRadius);
      const theta = Math.random() * Math.PI * 2;
      const heightNoise = (Math.random() - 0.5) * 0.15 * (r / outerRadius);

      this.buffer.positions[i3] = center.x + Math.cos(theta) * r;
      this.buffer.positions[i3 + 1] = center.y + heightNoise;
      this.buffer.positions[i3 + 2] = center.z + Math.sin(theta) * r;

      // Keplerian orbital velocity in disk
      const speed = Math.sqrt(1.5 / r);
      this.buffer.velocities[i3] = -Math.sin(theta) * speed;
      this.buffer.velocities[i3 + 1] = 0;
      this.buffer.velocities[i3 + 2] = Math.cos(theta) * speed;

      // Color gradient
      const t = (r - innerRadius) / (outerRadius - innerRadius);
      this.buffer.colors[i3] = color[0] * (1 - t) + 1.0 * t;
      this.buffer.colors[i3 + 1] = color[1] * (1 - t) + 0.3 * t;
      this.buffer.colors[i3 + 2] = color[2] * (1 - t) + 0.1 * t;

      this.buffer.sizes[i] = 0.18 + Math.random() * 0.16;
      this.buffer.energies[i] = 1.0;
      this.buffer.lifetimes[i] = Infinity;
      this.buffer.ages[i] = 0;
    }
  }

  /**
   * Seed Fibonacci spherical particle lattice
   */
  public seedSphericalLattice(
    center: { x: number; y: number; z: number },
    radius: number,
    count: number
  ): void {
    const num = Math.min(count, this.buffer.maxCount);
    this.buffer.count = num;
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < num; i++) {
      const i3 = i * 3;
      const y = 1 - (i / (num - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;

      const rNoise = radius * (0.92 + Math.random() * 0.16);
      const x = center.x + Math.cos(theta) * radiusAtY * rNoise;
      const posY = center.y + y * rNoise;
      const z = center.z + Math.sin(theta) * radiusAtY * rNoise;

      this.buffer.positions[i3] = x;
      this.buffer.positions[i3 + 1] = posY;
      this.buffer.positions[i3 + 2] = z;

      this.buffer.velocities[i3] = 0;
      this.buffer.velocities[i3 + 1] = 0;
      this.buffer.velocities[i3 + 2] = 0;

      // Default hue
      this.buffer.colors[i3] = 0.0;
      this.buffer.colors[i3 + 1] = 0.95;
      this.buffer.colors[i3 + 2] = 1.0;

      this.buffer.sizes[i] = 0.22 + Math.random() * 0.14;
      this.buffer.energies[i] = 1.0;
      this.buffer.lifetimes[i] = Infinity;
      this.buffer.ages[i] = 0;
    }
  }

  /**
   * Update particle dynamics: velocity damping, vortex swirling around black holes, and boundary bounds
   */
  public update(
    blackHoles: UniverseEntity[],
    config: UniverseConfig,
    dt: number,
    elapsedTime: number
  ): void {
    const { count, positions, velocities, energies } = this.buffer;
    const damping = Math.pow(config.collisionDamping, dt * 60);
    const bounds = config.universeBounds;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Velocity Damping
      velocities[i3] *= damping;
      velocities[i3 + 1] *= damping;
      velocities[i3 + 2] *= damping;

      // Swirling torque near black holes
      for (let b = 0; b < blackHoles.length; b++) {
        const bh = blackHoles[b];
        if (bh.isDead) continue;

        const dx = positions[i3] - bh.position.x;
        const dz = positions[i3 + 2] - bh.position.z;
        const dist2D = Math.hypot(dx, dz);

        if (dist2D < 8.0 && dist2D > 0.3) {
          const swirlSpeed = (1.8 / dist2D) * dt;
          // Tangential swirl force (-z, x)
          velocities[i3] += (-dz / dist2D) * swirlSpeed;
          velocities[i3 + 2] += (dx / dist2D) * swirlSpeed;
        }
      }

      // Cosmic dust undulation wave
      const wave = Math.sin(elapsedTime * 1.5 + i * 0.08) * 0.002;
      positions[i3 + 1] += wave;

      // Boundary soft reflection
      if (Math.abs(positions[i3]) > bounds) velocities[i3] *= -0.8;
      if (Math.abs(positions[i3 + 1]) > bounds) velocities[i3 + 1] *= -0.8;
      if (Math.abs(positions[i3 + 2]) > bounds) velocities[i3 + 2] *= -0.8;

      // Energy recovery
      if (energies[i] < 1.0) {
        energies[i] = Math.min(1.0, energies[i] + 0.1 * dt);
      }
    }
  }
}
