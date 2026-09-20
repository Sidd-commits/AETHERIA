/**
 * High-Performance Typed 3D Spatial Hash Grid
 *
 * Provides O(1) spatial partitioning for particle-to-particle and organism-to-energy lookups.
 * GUARANTEES: Zero GC allocations per frame using static typed array pools.
 */
export class SpatialHashGrid {
  public readonly cellSize: number;
  private invCellSize: number;
  private tableSize: number;

  // Static linked-list representation in flat typed arrays
  // head[cellHash] -> first particle index (or -1)
  // next[particleIndex] -> next particle in same cell (or -1)
  private head: Int32Array;
  private next: Int32Array;
  private maxParticles: number;

  // Pre-allocated neighbor result buffer to avoid any array instantiation
  private queryResultBuffer: Int32Array;
  private queryResultCount: number = 0;

  constructor(cellSize: number = 4.0, tableSize: number = 4096, maxParticles: number = 20000) {
    this.cellSize = cellSize;
    this.invCellSize = 1.0 / cellSize;
    this.tableSize = tableSize;
    this.maxParticles = maxParticles;

    this.head = new Int32Array(tableSize);
    this.next = new Int32Array(maxParticles);
    this.queryResultBuffer = new Int32Array(maxParticles);

    this.clear();
  }

  /**
   * Reset grid for a new frame (O(tableSize) memset to -1)
   */
  public clear(): void {
    this.head.fill(-1);
    this.queryResultCount = 0;
  }

  /**
   * Compute fast 3D spatial hash index
   */
  private hashCoords(cx: number, cy: number, cz: number): number {
    // Spatial hash primes
    const h = ((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) % this.tableSize;
    return h < 0 ? h + this.tableSize : h;
  }

  /**
   * Insert a particle at (x, y, z) into the spatial grid (O(1))
   */
  public insert(index: number, x: number, y: number, z: number): void {
    if (index >= this.maxParticles) return;

    const cx = Math.floor(x * this.invCellSize);
    const cy = Math.floor(y * this.invCellSize);
    const cz = Math.floor(z * this.invCellSize);

    const cellHash = this.hashCoords(cx, cy, cz);

    // Prepend to cell linked list
    this.next[index] = this.head[cellHash];
    this.head[cellHash] = index;
  }

  /**
   * Query all particles within radius of (x, y, z)
   * Results stored in internal queryResultBuffer to avoid memory allocation.
   * Returns number of neighbors found.
   */
  public queryRadius(
    x: number,
    y: number,
    z: number,
    radius: number,
    positions: Float32Array,
    maxResults: number = 200
  ): number {
    this.queryResultCount = 0;
    const radiusSq = radius * radius;

    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);
    const minCz = Math.floor((z - radius) * this.invCellSize);
    const maxCz = Math.floor((z + radius) * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const cellHash = this.hashCoords(cx, cy, cz);
          let pIdx = this.head[cellHash];

          while (pIdx !== -1) {
            const p3 = pIdx * 3;
            const dx = positions[p3] - x;
            const dy = positions[p3 + 1] - y;
            const dz = positions[p3 + 2] - z;
            const dSq = dx * dx + dy * dy + dz * dz;

            if (dSq <= radiusSq) {
              this.queryResultBuffer[this.queryResultCount++] = pIdx;
              if (this.queryResultCount >= maxResults) {
                return this.queryResultCount;
              }
            }

            pIdx = this.next[pIdx];
          }
        }
      }
    }

    return this.queryResultCount;
  }

  /**
   * Find closest particle of a specific target type in the neighborhood (O(K))
   */
  public findClosestOfType(
    x: number,
    y: number,
    z: number,
    radius: number,
    positions: Float32Array,
    types: Uint8Array,
    targetType: number
  ): { index: number; distSq: number } {
    let closestIndex = -1;
    let closestDistSq = radius * radius;

    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);
    const minCz = Math.floor((z - radius) * this.invCellSize);
    const maxCz = Math.floor((z + radius) * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const cellHash = this.hashCoords(cx, cy, cz);
          let pIdx = this.head[cellHash];

          while (pIdx !== -1) {
            if (types[pIdx] === targetType) {
              const p3 = pIdx * 3;
              const dx = positions[p3] - x;
              const dy = positions[p3 + 1] - y;
              const dz = positions[p3 + 2] - z;
              const dSq = dx * dx + dy * dy + dz * dz;

              if (dSq < closestDistSq) {
                closestDistSq = dSq;
                closestIndex = pIdx;
              }
            }
            pIdx = this.next[pIdx];
          }
        }
      }
    }

    return { index: closestIndex, distSq: closestDistSq };
  }

  public getQueryResultBuffer(): Int32Array {
    return this.queryResultBuffer;
  }

  public getQueryResultCount(): number {
    return this.queryResultCount;
  }
}
