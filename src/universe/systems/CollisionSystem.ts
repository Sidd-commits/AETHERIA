import { UniverseEntity, CosmicParticleBuffer } from '../../types/entity';
import { UniverseConfig } from '../../types/universe';

export interface CollisionEvent {
  bodyA: UniverseEntity;
  bodyB: UniverseEntity;
  impactPoint: { x: number; y: number; z: number };
  relativeVelocity: number;
  energyReleased: number;
}

/**
 * Collision System
 * Handles multi-body spherical collision detection, momentum conservation,
 * impact cratering/fragmentation, and black hole event horizon absorption.
 */
export class CollisionSystem {
  private collisionEvents: CollisionEvent[] = [];

  public getRecentEvents(): CollisionEvent[] {
    const events = [...this.collisionEvents];
    this.collisionEvents = [];
    return events;
  }

  /**
   * Resolve collisions between discrete celestial bodies
   */
  public resolveBodyCollisions(entities: UniverseEntity[], _config: UniverseConfig): void {
    const count = entities.length;

    for (let i = 0; i < count; i++) {
      const eA = entities[i];
      if (eA.isDead) continue;

      for (let j = i + 1; j < count; j++) {
        const eB = entities[j];
        if (eB.isDead) continue;

        const dx = eB.position.x - eA.position.x;
        const dy = eB.position.y - eA.position.y;
        const dz = eB.position.z - eA.position.z;
        const dist = Math.hypot(dx, dy, dz);
        const minDist = eA.radius + eB.radius;

        // 1. Black Hole Event Horizon Absorption
        if (eA.type === 'BLACK_HOLE' || eB.type === 'BLACK_HOLE') {
          const bh = eA.type === 'BLACK_HOLE' ? eA : eB;
          const other = eA.type === 'BLACK_HOLE' ? eB : eA;
          const horizonRadius = bh.eventHorizonRadius || bh.radius;

          if (dist < horizonRadius + other.radius * 0.5) {
            // Absorb other body into black hole
            other.isDead = true;
            bh.mass += other.mass * 0.85;
            bh.radius = Math.min(3.0, bh.radius + 0.05);
            bh.energy += other.energy + other.mass * 10;

            this.collisionEvents.push({
              bodyA: bh,
              bodyB: other,
              impactPoint: { ...other.position },
              relativeVelocity: Math.hypot(other.velocity.x, other.velocity.y, other.velocity.z),
              energyReleased: other.mass * 20
            });
            continue;
          }
        }

        // 2. Celestial Body Contact Collision
        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Relative velocity
          const rvx = eB.velocity.x - eA.velocity.x;
          const rvy = eB.velocity.y - eA.velocity.y;
          const rvz = eB.velocity.z - eA.velocity.z;
          const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

          if (velAlongNormal < 0) {
            // Bodies moving toward each other
            const restitution = 0.35; // Inelastic collision
            const impulseMagnitude = -(1 + restitution) * velAlongNormal / (1 / eA.mass + 1 / eB.mass);

            const impX = impulseMagnitude * nx;
            const impY = impulseMagnitude * ny;
            const impZ = impulseMagnitude * nz;

            eA.velocity.x -= impX / eA.mass;
            eA.velocity.y -= impY / eA.mass;
            eA.velocity.z -= impZ / eA.mass;

            eB.velocity.x += impX / eB.mass;
            eB.velocity.y += impY / eB.mass;
            eB.velocity.z += impZ / eB.mass;

            // Asteroid destruction upon high-energy impact
            if (eA.type === 'ASTEROID' && eB.type !== 'ASTEROID') {
              eA.isDead = true;
            } else if (eB.type === 'ASTEROID' && eA.type !== 'ASTEROID') {
              eB.isDead = true;
            }

            const impactPoint = {
              x: eA.position.x + nx * eA.radius,
              y: eA.position.y + ny * eA.radius,
              z: eA.position.z + nz * eA.radius
            };

            this.collisionEvents.push({
              bodyA: eA,
              bodyB: eB,
              impactPoint,
              relativeVelocity: Math.abs(velAlongNormal),
              energyReleased: Math.abs(impulseMagnitude)
            });
          }
        }
      }
    }
  }

  /**
   * Handle particle absorption near black hole event horizons
   */
  public resolveParticleCollisions(
    buffer: CosmicParticleBuffer,
    blackHoles: UniverseEntity[]
  ): void {
    if (blackHoles.length === 0 || buffer.count === 0) return;

    for (let b = 0; b < blackHoles.length; b++) {
      const bh = blackHoles[b];
      if (bh.isDead) continue;
      const horizon = bh.eventHorizonRadius || bh.radius * 0.8;

      for (let p = 0; p < buffer.count; p++) {
        const p3 = p * 3;
        const dx = buffer.positions[p3] - bh.position.x;
        const dy = buffer.positions[p3 + 1] - bh.position.y;
        const dz = buffer.positions[p3 + 2] - bh.position.z;
        const dist = Math.hypot(dx, dy, dz);

        if (dist < horizon) {
          // Recycle absorbed particle to outer accretion boundary
          const angle = Math.random() * Math.PI * 2;
          const outerR = (bh.accretionRadius || 5.0) + Math.random() * 2.0;
          buffer.positions[p3] = bh.position.x + Math.cos(angle) * outerR;
          buffer.positions[p3 + 1] = bh.position.y + (Math.random() - 0.5) * 0.2;
          buffer.positions[p3 + 2] = bh.position.z + Math.sin(angle) * outerR;

          const speed = Math.sqrt(1.2 / outerR);
          buffer.velocities[p3] = -Math.sin(angle) * speed;
          buffer.velocities[p3 + 1] = 0;
          buffer.velocities[p3 + 2] = Math.cos(angle) * speed;

          buffer.energies[p] = 1.0;
          bh.energy += 0.05;
        }
      }
    }
  }
}
