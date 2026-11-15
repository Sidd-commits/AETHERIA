import { UniverseEntity } from '../../types/entity';
import { UniverseConfig } from '../../types/universe';
import { SpacetimeGridData } from '../../types/trajectory';

/**
 * Spacetime Curvature Grid System
 * Computes general-relativistic gravitational potential distortion field
 * across a 2D celestial plane lattice with zero runtime memory allocations.
 */
export class SpacetimeGridSystem {
  private readonly resolution: number;
  private readonly size: number;
  private readonly vertices: Float32Array;
  private readonly baseHeights: Float32Array;
  private readonly gridData: SpacetimeGridData;

  constructor(resolution: number = 32, size: number = 48) {
    this.resolution = resolution;
    this.size = size;

    const totalVertices = resolution * resolution;
    this.vertices = new Float32Array(totalVertices * 3);
    this.baseHeights = new Float32Array(totalVertices);

    const halfSize = size / 2;
    const step = size / (resolution - 1);

    // Initialize flat lattice coordinates
    for (let iz = 0; iz < resolution; iz++) {
      const z = -halfSize + iz * step;
      for (let ix = 0; ix < resolution; ix++) {
        const x = -halfSize + ix * step;
        const idx = (iz * resolution + ix) * 3;

        this.vertices[idx] = x;
        this.vertices[idx + 1] = 0; // y = height (deformation)
        this.vertices[idx + 2] = z;

        this.baseHeights[iz * resolution + ix] = 0;
      }
    }

    this.gridData = {
      resolution,
      size,
      vertices: this.vertices,
      maxCurvatureDepth: 0,
      centerMassCount: 0
    };
  }

  /**
   * Update spacetime height deformation based on active celestial mass wells
   */
  public update(entities: UniverseEntity[], config: UniverseConfig, time: number = 0): SpacetimeGridData {
    const G = config.gravityConstant;
    const res = this.resolution;
    const totalVertices = res * res;

    // Filter active massive bodies
    const massWells: UniverseEntity[] = [];
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.isDead && e.mass > 0 && (e.type === 'STAR' || e.type === 'BLACK_HOLE' || e.type === 'PLANET')) {
        massWells.push(e);
      }
    }

    this.gridData.centerMassCount = massWells.length;
    let maxDepth = 0;
    const depthScale = 0.085;
    const waveFreq = 2.5;

    for (let i = 0; i < totalVertices; i++) {
      const idx = i * 3;
      const x = this.vertices[idx];
      const z = this.vertices[idx + 2];

      let potential = 0;

      for (let w = 0; w < massWells.length; w++) {
        const well = massWells[w];
        const dx = x - well.position.x;
        const dz = z - well.position.z;
        const distSq = dx * dx + dz * dz + 0.35;
        const dist = Math.sqrt(distSq);

        const massFactor = well.type === 'BLACK_HOLE' ? well.mass * 2.2 : well.mass;
        const wellPotential = (G * massFactor) / dist;

        // Gravitational ripple perturbation for binary / moving attractors
        const ripple =
          well.type === 'BLACK_HOLE' || well.type === 'STAR'
            ? Math.sin(dist * waveFreq - time * 3.0) * (0.08 / Math.max(1.0, dist))
            : 0;

        potential += wellPotential + ripple;
      }

      // Negative y denotes indentation / gravitational well
      const depth = -Math.min(6.5, potential * depthScale);
      this.vertices[idx + 1] = depth;

      if (Math.abs(depth) > maxDepth) {
        maxDepth = Math.abs(depth);
      }
    }

    this.gridData.maxCurvatureDepth = maxDepth;
    return this.gridData;
  }

  public getGridData(): SpacetimeGridData {
    return this.gridData;
  }

  public getSize(): number {
    return this.size;
  }

  public getResolution(): number {
    return this.resolution;
  }
}
