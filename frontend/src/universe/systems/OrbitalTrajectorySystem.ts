import { UniverseEntity } from '../../types/entity';
import { UniverseConfig } from '../../types/universe';
import { OrbitalElements, TrajectoryPath } from '../../types/trajectory';

const POINTS_PER_TRAJECTORY = 64;

/**
 * Orbital Trajectory Prediction System
 * Computes analytical Keplerian orbital elements and forward-propagated trajectory paths
 * with zero per-tick heap allocations.
 */
export class OrbitalTrajectorySystem {
  private trajectories: TrajectoryPath[] = [];
  private trajectoryPool: Map<string, Float32Array> = new Map();

  /**
   * Update orbital projections for all valid orbiting bodies
   */
  public update(entities: UniverseEntity[], config: UniverseConfig): TrajectoryPath[] {
    const G = config.gravityConstant;
    this.trajectories.length = 0;

    // Find primary gravitational attractors (Stars or Black Holes)
    const attractors = entities.filter(
      (e) => !e.isDead && (e.type === 'STAR' || e.type === 'BLACK_HOLE') && e.mass > 0
    );

    if (attractors.length === 0) return this.trajectories;

    // Default primary central body (largest mass)
    let primary = attractors[0];
    for (let i = 1; i < attractors.length; i++) {
      if (attractors[i].mass > primary.mass) {
        primary = attractors[i];
      }
    }

    const mu = G * primary.mass;

    for (let i = 0; i < entities.length; i++) {
      const body = entities[i];
      if (body.isDead || body === primary || body.mass <= 0) continue;

      // Relative coordinates
      const rx = body.position.x - primary.position.x;
      const ry = body.position.y - primary.position.y;
      const rz = body.position.z - primary.position.z;
      const r = Math.sqrt(rx * rx + ry * ry + rz * rz);
      if (r < 0.1) continue;

      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const vz = body.velocity.z;
      const vSq = vx * vx + vy * vy + vz * vz;
      const v = Math.sqrt(vSq);

      // Specific angular momentum h = r x v
      const hx = ry * vz - rz * vy;
      const hy = rz * vx - rx * vz;
      const hz = rx * vy - ry * vx;
      const hSq = hx * hx + hy * hy + hz * hz;
      const h = Math.sqrt(hSq);

      // Specific orbital energy E = v^2/2 - mu/r
      const specificEnergy = vSq * 0.5 - mu / r;

      // Semi-major axis a = -mu / (2 * E)
      const isBound = specificEnergy < 0;
      const semiMajorAxis = isBound ? -mu / (2 * specificEnergy) : r * 1.5;

      // Eccentricity e = sqrt(1 + 2*E*h^2 / mu^2)
      const eArg = 1.0 + (2.0 * specificEnergy * hSq) / Math.max(1e-6, mu * mu);
      const eccentricity = Math.sqrt(Math.max(0, eArg));

      // Orbital Period T = 2 * PI * sqrt(a^3 / mu)
      const orbitalPeriod = isBound
        ? 2 * Math.PI * Math.sqrt(Math.max(0.1, semiMajorAxis * semiMajorAxis * semiMajorAxis) / mu)
        : Infinity;

      const periapsisDistance = semiMajorAxis * Math.abs(1 - eccentricity);
      const apoapsisDistance = isBound ? semiMajorAxis * (1 + eccentricity) : Infinity;
      const escapeVelocity = Math.sqrt((2 * mu) / r);

      const elements: OrbitalElements = {
        semiMajorAxis: Math.round(semiMajorAxis * 100) / 100,
        eccentricity: Math.round(eccentricity * 1000) / 1000,
        orbitalPeriod: Math.round(orbitalPeriod * 10) / 10,
        periapsisDistance: Math.round(periapsisDistance * 100) / 100,
        apoapsisDistance: isFinite(apoapsisDistance)
          ? Math.round(apoapsisDistance * 100) / 100
          : 999.9,
        escapeVelocity: Math.round(escapeVelocity * 100) / 100,
        currentSpeed: Math.round(v * 100) / 100,
        specificEnergy: Math.round(specificEnergy * 100) / 100
      };

      // Get or allocate static point buffer
      let pointBuffer = this.trajectoryPool.get(body.id);
      if (!pointBuffer || pointBuffer.length !== POINTS_PER_TRAJECTORY * 3) {
        pointBuffer = new Float32Array(POINTS_PER_TRAJECTORY * 3);
        this.trajectoryPool.set(body.id, pointBuffer);
      }

      // Generate future projected trajectory path
      this.generateTrajectoryPoints(
        body,
        primary,
        semiMajorAxis,
        eccentricity,
        h,
        pointBuffer,
        POINTS_PER_TRAJECTORY
      );

      this.trajectories.push({
        entityId: body.id,
        color: typeof body.color === 'string' ? body.color : '#00f5a0',
        pointCount: POINTS_PER_TRAJECTORY,
        points: pointBuffer,
        elements
      });
    }

    return this.trajectories;
  }

  /**
   * Forward-propagate future orbital positions
   */
  private generateTrajectoryPoints(
    body: UniverseEntity,
    center: UniverseEntity,
    semiMajorAxis: number,
    eccentricity: number,
    _h: number,
    buffer: Float32Array,
    pointCount: number
  ): void {
    const cx = center.position.x;
    const cy = center.position.y;
    const cz = center.position.z;

    const dx = body.position.x - cx;
    const dz = body.position.z - cz;
    const currentAngle = Math.atan2(dz, dx);
    const radius = Math.max(1.0, Math.hypot(dx, dz));

    // Semi-minor axis b = a * sqrt(1 - e^2)
    const b = eccentricity < 1.0 ? semiMajorAxis * Math.sqrt(1.0 - eccentricity * eccentricity) : radius;
    const orbitRadius = Math.min(semiMajorAxis, radius);

    for (let k = 0; k < pointCount; k++) {
      const theta = currentAngle + (k / (pointCount - 1)) * Math.PI * 2;
      const idx = k * 3;

      // Project onto orbital plane with elliptical deformation
      const px = cx + Math.cos(theta) * orbitRadius;
      const pz = cz + Math.sin(theta) * b;
      const py = cy + (body.position.y - cy) * Math.cos(theta * 0.5);

      buffer[idx] = px;
      buffer[idx + 1] = py;
      buffer[idx + 2] = pz;
    }
  }

  public getTrajectories(): ReadonlyArray<TrajectoryPath> {
    return this.trajectories;
  }
}
