import { UniverseEntity, CosmicParticleBuffer } from '../../types/entity';

export interface ExplosionEvent {
  origin: { x: number; y: number; z: number };
  power: number;
  radius: number;
}

/**
 * Destruction System
 * Manages supernova collapses, explosive shockwave dynamics,
 * asteroid fragmentation, and dead entity lifecycle garbage collection.
 */
export class DestructionSystem {
  private recentExplosions: ExplosionEvent[] = [];

  public getRecentExplosions(): ExplosionEvent[] {
    const events = [...this.recentExplosions];
    this.recentExplosions = [];
    return events;
  }

  /**
   * Trigger a Supernova explosion at a target star or coordinates
   */
  public triggerSupernova(
    origin: { x: number; y: number; z: number },
    power: number = 1.0,
    buffer: CosmicParticleBuffer,
    entities: UniverseEntity[]
  ): void {
    const explosionForce = 3.5 * (0.8 + power * 1.5);
    const radius = 12.0 * power;

    this.recentExplosions.push({ origin: { ...origin }, power, radius });

    // 1. Radial Shockwave on Cosmic Particles
    const { count, positions, velocities, energies } = buffer;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const px = positions[i3] - origin.x;
      const py = positions[i3 + 1] - origin.y;
      const pz = positions[i3 + 2] - origin.z;
      const dist = Math.hypot(px, py, pz) || 0.1;

      if (dist < radius) {
        const factor = (1.0 - dist / radius) * explosionForce;
        const dirX = px / dist;
        const dirY = py / dist;
        const dirZ = pz / dist;
        const jitter = 0.35;

        velocities[i3] += (dirX + (Math.random() - 0.5) * jitter) * factor;
        velocities[i3 + 1] += (dirY + (Math.random() - 0.5) * jitter) * factor;
        velocities[i3 + 2] += (dirZ + (Math.random() - 0.5) * jitter) * factor;

        // Supernova converts particles into dense, energized resource fields
        if (buffer.types) {
          buffer.types[i] = 1; // ECO_TYPE_ENERGY
        }
        energies[i] = 1.8 + Math.random() * 0.5;
        buffer.colors[i3] = 1.0;
        buffer.colors[i3 + 1] = 0.9;
        buffer.colors[i3 + 2] = 0.3;
        buffer.sizes[i] = 0.28;
      }
    }

    // 2. Shockwave Impulse on Celestial Bodies
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.isDead || e.type === 'BLACK_HOLE') continue;

      const dx = e.position.x - origin.x;
      const dy = e.position.y - origin.y;
      const dz = e.position.z - origin.z;
      const dist = Math.hypot(dx, dy, dz) || 0.1;

      if (dist < radius) {
        const bodyImpulse = ((radius - dist) / radius) * (explosionForce / Math.max(1.0, e.mass));
        e.velocity.x += (dx / dist) * bodyImpulse;
        e.velocity.y += (dy / dist) * bodyImpulse;
        e.velocity.z += (dz / dist) * bodyImpulse;
      }
    }
  }

  /**
   * Age entities and prune dead / expired bodies
   */
  public updateLifecycles(entities: UniverseEntity[], dt: number): UniverseEntity[] {
    const alive: UniverseEntity[] = [];

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.isDead) continue;

      e.age += dt;
      if (e.lifetime !== Infinity && e.age >= e.lifetime) {
        e.isDead = true;
        continue;
      }

      alive.push(e);
    }

    return alive;
  }
}
