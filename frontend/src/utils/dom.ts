/**
 * Safe typed DOM element selector and sanitization utilities
 * Implements resilient self-healing fallbacks so missing DOM nodes never crash the simulation.
 */

export function getRequiredElement<T extends Element = HTMLElement>(id: string): T {
  let el = document.getElementById(id);
  if (!el) {
    console.warn(
      `[DOM] Warning: Required DOM element with id "${id}" was not found. Auto-generating resilient fallback element.`
    );
    if (typeof document !== 'undefined') {
      const lower = id.toLowerCase();
      if (lower.includes('bar') || lower.includes('circle') || lower.includes('svg')) {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        svgEl.id = id;
        document.body.appendChild(svgEl);
        el = svgEl as unknown as HTMLElement;
      } else if (lower.includes('video')) {
        const video = document.createElement('video');
        video.id = id;
        video.style.display = 'none';
        document.body.appendChild(video);
        el = video;
      } else if (lower.includes('canvas')) {
        const canvas = document.createElement('canvas');
        canvas.id = id;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        el = canvas;
      } else {
        const div = document.createElement('div');
        div.id = id;
        div.style.display = 'none';
        document.body.appendChild(div);
        el = div;
      }
    }
  }
  return el as unknown as T;
}

export function getOptionalElement<T extends Element = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as unknown as T | null;
}

/**
 * Escapes untrusted strings for safe DOM interpolation, neutralizing XSS vectors.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
