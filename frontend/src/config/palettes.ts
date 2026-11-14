/**
 * Color palettes configuration for finger counts [0..5]
 */

export interface PaletteConfig {
  name: string;
  count: number;
  colors: string[];
}

export const PALETTES: PaletteConfig[] = [
  {
    name: 'Void Ultraviolet',
    count: 0,
    colors: ['#6b11ff', '#9b51e0', '#d946ef', '#3b0764', '#c084fc']
  },
  {
    name: 'Cyber Cyan',
    count: 1,
    colors: ['#00f2fe', '#4facfe', '#00c6ff', '#0072ff', '#e0f2fe']
  },
  {
    name: 'Sunset Magenta',
    count: 2,
    colors: ['#ff0844', '#ffb199', '#f857a6', '#ff5858', '#fed6e3']
  },
  {
    name: 'Hyper Emerald',
    count: 3,
    colors: ['#00f5a0', '#00d9f5', '#10b981', '#34d399', '#d1fae5']
  },
  {
    name: 'Solar Flare',
    count: 4,
    colors: ['#fee140', '#fa709a', '#f59e0b', '#fbbf24', '#fef3c7']
  },
  {
    name: 'Prismatic Spectrum',
    count: 5,
    colors: ['#00f2fe', '#ff0844', '#00f5a0', '#fee140', '#a855f7']
  }
];
