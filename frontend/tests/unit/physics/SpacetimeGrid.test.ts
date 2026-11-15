import { describe, it, expect } from 'vitest';
import { SpacetimeGridSystem } from '../../../src/universe/systems/SpacetimeGridSystem';
import { UniverseEntity } from '../../../src/types/entity';
import { DEFAULT_UNIVERSE_CONFIG } from '../../../src/universe/UniverseEngine';

describe('Spacetime Curvature Grid System', () => {
  it('initializes a symmetric 2D lattice buffer with zero height', () => {
    const gridSystem = new SpacetimeGridSystem(16, 32);
    const grid = gridSystem.getGridData();

    expect(grid.resolution).toBe(16);
    expect(grid.size).toBe(32);
    expect(grid.vertices.length).toBe(16 * 16 * 3);

    // Initial y should be 0
    for (let i = 0; i < 16 * 16; i++) {
      expect(grid.vertices[i * 3 + 1]).toBe(0);
    }
  });

  it('depresses spacetime height into a gravitational potential well near a black hole', () => {
    const gridSystem = new SpacetimeGridSystem(16, 32);

    const blackHole: UniverseEntity = {
      id: 'bh-singularity',
      type: 'BLACK_HOLE',
      name: 'Singularity Alpha',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 150.0,
      radius: 1.0,
      energy: 500,
      age: 0,
      lifetime: Infinity,
      isDead: false,
      color: '#000'
    };

    const grid = gridSystem.update([blackHole], DEFAULT_UNIVERSE_CONFIG, 1.0);

    expect(grid.centerMassCount).toBe(1);
    expect(grid.maxCurvatureDepth).toBeGreaterThan(0.5);

    // The center vertex should be depressed (negative y)
    let minHeight = 0;
    for (let i = 0; i < 16 * 16; i++) {
      const y = grid.vertices[i * 3 + 1];
      if (y < minHeight) minHeight = y;
    }
    expect(minHeight).toBeLessThan(-1.0);
  });
});
