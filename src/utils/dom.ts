/**
 * Safe typed DOM element selector and sanitization utilities
 */

export function getRequiredElement<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Required DOM element with id "${id}" was not found.`);
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
