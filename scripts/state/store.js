import { PROJECT_SIZE } from "../data/presets.js";
import { arrayMove, clamp, deepClone, uid } from "../utils/helpers.js";

export function createInitialState() {
  return {
    meta: {
      title: "Nouveau drame JPEG",
      width: PROJECT_SIZE.width,
      height: PROJECT_SIZE.height
    },
    background: {
      id: "background",
      type: "background",
      name: "Fond vide",
      src: null,
      fit: "cover"
    },
    watermarks: [],
    elements: [],
    frame: {
      id: "frame",
      type: "frame",
      name: "Aucun cadre",
      src: null,
      opacity: 1
    },
    effects: {
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      jpegNoise: 0
    },
    selectionId: null,
    lastWorsenLevel: null
  };
}

export class ProjectStore {
  constructor(initialState = createInitialState()) {
    this.state = deepClone(initialState);
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  mutate(mutator) {
    mutator(this.state);
    this.emit();
  }

  replace(nextState) {
    this.state = deepClone(nextState);
    this.emit();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export function makeSticker({ src, name = "Sticker perso", x = 450, y = 450, width = 220, height = 220 } = {}) {
  return {
    id: uid("sticker"),
    type: "sticker",
    name,
    src,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    flipX: false,
    locked: false
  };
}

export function makeText({
  text = "love 4ever",
  name = "Texte kitsch",
  x = 450,
  y = 450,
  width = 360,
  height = 120,
  fontFamily = "Comic Sans MS, Comic Sans, cursive",
  fontSize = 52,
  color = "#ffffff"
} = {}) {
  return {
    id: uid("text"),
    type: "text",
    name,
    text,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    locked: false,
    fontFamily,
    fontSize,
    color,
    fontWeight: "700",
    fontStyle: "normal",
    align: "center",
    strokeColor: "#ff00cc",
    strokeWidth: 5,
    shadowColor: "rgba(0, 0, 0, 0.65)",
    shadowBlur: 0,
    shadowOffsetX: 6,
    shadowOffsetY: 6,
    glowColor: "#fff45b",
    glowStrength: 0
  };
}

export function makeWatermarkImage({
  src,
  name = "Watermark image",
  x = 120,
  y = 120,
  width = 320,
  height = 120
} = {}) {
  return {
    id: uid("wm"),
    type: "watermark-image",
    name,
    src,
    x,
    y,
    width,
    height,
    rotation: -16,
    opacity: 0.32,
    repeated: false,
    locked: false
  };
}

export function makeWatermarkText({
  text = "PREVIEW",
  name = "Watermark texte",
  x = 450,
  y = 450,
  width = 520,
  height = 120,
  fontFamily = "Impact, Haettenschweiler, Arial Black, sans-serif"
} = {}) {
  return {
    ...makeText({
      text,
      name,
      x,
      y,
      width,
      height,
      fontFamily,
      fontSize: 76,
      color: "#ff3f92"
    }),
    type: "watermark-text",
    opacity: 0.28,
    rotation: -18,
    repeated: false,
    strokeColor: "#ffffff",
    strokeWidth: 6
  };
}

export function getLayerById(state, layerId) {
  if (layerId === "background") {
    return state.background;
  }
  if (layerId === "frame") {
    return state.frame;
  }
  return state.watermarks.find((item) => item.id === layerId) || state.elements.find((item) => item.id === layerId) || null;
}

export function getLayerSection(state, layerId) {
  if (layerId === "background") {
    return "background";
  }
  if (layerId === "frame") {
    return "frame";
  }
  if (state.watermarks.some((item) => item.id === layerId)) {
    return "watermarks";
  }
  if (state.elements.some((item) => item.id === layerId)) {
    return "elements";
  }
  return null;
}

export function getVisibleLayerList(state) {
  const layers = [{ id: "background", label: state.background.name, type: "background", locked: true }];
  for (const item of state.watermarks) {
    layers.push({ id: item.id, label: item.name || item.type, type: item.type, locked: item.locked });
  }
  for (const item of state.elements) {
    layers.push({ id: item.id, label: item.name || item.type, type: item.type, locked: item.locked });
  }
  if (state.frame.src) {
    layers.push({ id: "frame", label: state.frame.name, type: "frame", locked: true });
  }
  return layers;
}

export function removeLayer(state, layerId) {
  const section = getLayerSection(state, layerId);
  if (section === "watermarks") {
    state.watermarks = state.watermarks.filter((item) => item.id !== layerId);
  }
  if (section === "elements") {
    state.elements = state.elements.filter((item) => item.id !== layerId);
  }
  if (section === "frame") {
    state.frame.src = null;
    state.frame.name = "Aucun cadre";
  }
  if (state.selectionId === layerId) {
    state.selectionId = null;
  }
}

export function duplicateLayer(state, layerId) {
  const layer = getLayerById(state, layerId);
  const section = getLayerSection(state, layerId);
  if (!layer || section === "background" || section === "frame") {
    return null;
  }
  const clone = deepClone(layer);
  clone.id = uid(section === "watermarks" ? "wm" : layer.type);
  clone.name = `${layer.name} copy`;
  clone.x += 26;
  clone.y += 26;
  if (section === "watermarks") {
    const index = state.watermarks.findIndex((item) => item.id === layerId);
    state.watermarks.splice(index + 1, 0, clone);
  } else {
    const index = state.elements.findIndex((item) => item.id === layerId);
    state.elements.splice(index + 1, 0, clone);
  }
  state.selectionId = clone.id;
  return clone;
}

export function reorderLayer(state, layerId, direction) {
  const section = getLayerSection(state, layerId);
  if (!["watermarks", "elements"].includes(section)) {
    return;
  }
  const list = state[section];
  const index = list.findIndex((item) => item.id === layerId);
  if (index === -1) {
    return;
  }
  const target = clamp(index + direction, 0, list.length - 1);
  state[section] = arrayMove(list, index, target);
}
