// Thin wrapper around localStorage. Keys are namespaced and versioned so the
// data format can change later without colliding with old saves.
const PREFIX = 'focusboard:v1:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Focus Board: could not save "${key}"`, err);
  }
}
