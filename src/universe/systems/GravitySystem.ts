import { UniverseEntity, CosmicParticleBuffer, Vector3D } from '../../types/entity';
import { UniverseConfig } from '../../types/universe';

/**
 * Gravity System
 * Implements softened celestial N-body gravity with dominant mass well optimization
 * and Keplerian orbital mechanics.
 */
export class GravitySystem {
  private readonly softeningSquared: number = 0.25;

  /**
   * Update gravitational acceleration for all active celestial entities
   */
  public updateEntityGravity(entities: UniverseEntity[], config: UniverseConfig, dt: number): void {
    const G = config.gravityConstant;
    const count = entities.length;

    // Reset accelerations
    for (let i = 0; i < count; i++) {
      entities[i].acceleration.x = 0;
      entities[i].acceleration.y = 0;
      entities[i].acceleration.z = 0;
    }

    // Pairwise gravity between discrete celestial bodies (N is small, e.g. 5-30)
    for (let i = 0; i < count; i++) {
      const eA = entities[i];
      if (eA.isDead || eA.mass <= 0) continue;

      for (let j = i + 1; j < count; j++) {
        const eB = entities[j];
        if (eB.isDead || eB.mass <= 0) continue;

        const dx = eB.position.x - eA.position.x;
        const dy = eB.position.y - eA.position.y;
        const dz = eB.position.z - eA.position.z;
        const distSq = dx * dx + dy * dy + dz * dz + this.softeningSquared;
        const dist = Math.sqrt(distSq);

        const forceMagnitude = (G * eA.mass * eB.mass) / (distSq * dist);

        // a = F / m
        const fx = forceMagnitude * dx;
        const fy = forceMagnitude * dy;
        const fz = forceMagnitude * dz;

        eA.acceleration.x += fx / eA.mass;
        eA.acceleration.y += fy / eA.mass;
        eA.acceleration.z += fz / eA.mass;

        eB.acceleration.x -= fx / eB.mass;
        eB.acceleration.y -= fy / eB.mass;
        eB.acceleration.z -= fz / eB.mass;
      }
    }

    // Integrate velocities and positions (Verlet / Semi-implicit Euler)
    for (let i = 0; i < count; i++) {
      const e = entities[i];
      if (e.isDead) continue;

      e.velocity.x += e.acceleration.x * dt;
      e.velocity.y += e.acceleration.y * dt;
      e.velocity.z += e.acceleration.z * dt;

      e.position.x += e.velocity.x * dt;
      e.position.y += e.velocity.y * dt;
      e.position.z += e.velocity.z * dt;
    }
  }

  /**
   * Apply dominant gravitational mass wells to the massive particle buffer (O(N_wells * N_particles))
   */
  public updateParticleGravity(
    buffer: CosmicParticleBuffer,
    dominantBodies: UniverseEntity[],
    config: UniverseConfig,
    dt: number
  ): void {
    const G = config.gravityConstant;
    const { count, positions, velocities } = buffer;
    const wellsCount = dominantBodies.length;

    if (wellsCount === 0 || count === 0) return;

    for (let p = 0; p < count; p++) {
      const p3 = p * 3;
      const px = positions[p3];
      const py = positions[p3 + 1];
      const pz = positions[p3 + 2];

      let ax = 0;
      let ay = 0;
      let az = 0;

      for (let w = 0; w < wellsCount; w++) {
        const well = dominantBodies[w];
        if (well.isDead) continue;

        const dx = well.position.x - px;
        const dy = well.position.y - py;
        const dz = well.position.z - pz;
        const distSq = dx * dx + dy * dy + dz * dz + this.softeningSquared;
        const dist = Math.sqrt(distSq);

        let pullMult = 1.0;
        if (well.type === 'BLACK_HOLE') {
          pullMult = config.blackHolePullForce;
        }

        const force = (G * well.mass * pullMult) / (distSq * dist);
        ax += force * dx;
        ay += force * dy;
        az += force * dz;
      }

      velocities[p3] += ax * dt;
      velocities[p3 + 1] += ay * dt;
      velocities[p3 + 2] += az * dt;

      // Integration
      positions[p3] += velocities[p3] * dt;
      positions[p3 + 1] += velocities[p3 + 1] * dt;
      positions[p3 + 2] += velocities[p3 + 2] * dt;
    }
  }

  /**
   * Helper: Calculate stable Keplerian circular orbit velocity
   */
  public calculateOrbitalVelocity(
    centralBody: UniverseEntity,
    orbitRadius: number,
    orbitPlaneNormal: Vector3D = { x: 0, y: 1, z: 0 },
    G: number = 1.0
  ): Vector3D {
    const speed = Math.sqrt((G * centralBody.mass) / Math.max(0.1, orbitRadius));
    // Vector perpendicular to orbit radius in orbital plane
    return {
      x: -orbitPlaneNormal.z * speed,
      y: 0,
      z: orbitPlaneNormal.x * speed || speed
    };
  }
}
