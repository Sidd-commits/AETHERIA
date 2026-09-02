/**
 * Safe typed DOM element selector utilities
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
