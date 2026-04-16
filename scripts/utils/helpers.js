export function uid(prefix = "layer") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function deepClone(value) {
  return structuredClone(value);
}

export function arrayMove(array, fromIndex, toIndex) {
  const copy = [...array];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

export function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

export function escapeHtml(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
