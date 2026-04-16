import { getLayerById } from "../state/store.js";
import { clamp, degreesToRadians } from "../utils/helpers.js";

const HANDLE_META = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  sw: { x: -1, y: 1 },
  se: { x: 1, y: 1 }
};

export class StageInteractions {
  constructor(sceneStage, app) {
    this.sceneStage = sceneStage;
    this.app = app;
    this.active = null;
  }

  bind() {
    this.sceneStage.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    window.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerup", () => this.onPointerUp());
    window.addEventListener("pointercancel", () => this.onPointerUp());
  }

  onPointerDown(event) {
    const handle = event.target.closest("[data-handle]");
    const layerNode = event.target.closest("[data-layer-id]");
    if (handle && layerNode) {
      const layerId = layerNode.dataset.layerId;
      const layer = getLayerById(this.app.state, layerId);
      if (!layer || layer.locked || layer.id === "background" || layer.id === "frame") {
        return;
      }
      this.active = {
        mode: handle.dataset.handle === "rotate" ? "rotate" : "resize",
        handle: handle.dataset.handle,
        layerId,
        startPoint: this.getPoint(event),
        startLayer: { ...layer }
      };
      event.preventDefault();
      return;
    }

    if (layerNode) {
      const layerId = layerNode.dataset.layerId;
      this.app.setSelection(layerId);
      const layer = getLayerById(this.app.state, layerId);
      if (!layer || layer.locked || layer.id === "background" || layer.id === "frame") {
        return;
      }
      this.active = {
        mode: "move",
        layerId,
        startPoint: this.getPoint(event),
        startLayer: { ...layer }
      };
      event.preventDefault();
      return;
    }

    this.app.clearSelection();
  }

  onPointerMove(event) {
    if (!this.active) {
      return;
    }

    const point = this.getPoint(event);
    const dx = point.x - this.active.startPoint.x;
    const dy = point.y - this.active.startPoint.y;

    if (this.active.mode === "move") {
      this.app.previewMutation((state) => {
        const layer = getLayerById(state, this.active.layerId);
        layer.x = this.active.startLayer.x + dx;
        layer.y = this.active.startLayer.y + dy;
      });
      return;
    }

    if (this.active.mode === "rotate") {
      const startAngle = Math.atan2(
        this.active.startPoint.y - this.active.startLayer.y,
        this.active.startPoint.x - this.active.startLayer.x
      );
      const nextAngle = Math.atan2(point.y - this.active.startLayer.y, point.x - this.active.startLayer.x);
      const delta = ((nextAngle - startAngle) * 180) / Math.PI;
      this.app.previewMutation((state) => {
        const layer = getLayerById(state, this.active.layerId);
        layer.rotation = this.active.startLayer.rotation + delta;
      });
      return;
    }

    if (this.active.mode === "resize") {
      const handleMeta = HANDLE_META[this.active.handle];
      const angle = degreesToRadians(this.active.startLayer.rotation);
      const localDx = Math.cos(angle) * dx + Math.sin(angle) * dy;
      const localDy = -Math.sin(angle) * dx + Math.cos(angle) * dy;

      let nextWidth = clamp(this.active.startLayer.width + localDx * handleMeta.x, 42, 860);
      let nextHeight = clamp(this.active.startLayer.height + localDy * handleMeta.y, 32, 860);
      const widthDelta = nextWidth - this.active.startLayer.width;
      const heightDelta = nextHeight - this.active.startLayer.height;

      const shiftLocalX = (widthDelta / 2) * handleMeta.x;
      const shiftLocalY = (heightDelta / 2) * handleMeta.y;
      const shiftX = Math.cos(angle) * shiftLocalX - Math.sin(angle) * shiftLocalY;
      const shiftY = Math.sin(angle) * shiftLocalX + Math.cos(angle) * shiftLocalY;

      this.app.previewMutation((state) => {
        const layer = getLayerById(state, this.active.layerId);
        layer.width = nextWidth;
        layer.height = nextHeight;
        layer.x = this.active.startLayer.x + shiftX;
        layer.y = this.active.startLayer.y + shiftY;
        if (layer.type.includes("text")) {
          layer.fontSize = clamp((this.active.startLayer.fontSize * nextWidth) / this.active.startLayer.width, 16, 220);
        }
      });
    }
  }

  onPointerUp() {
    if (!this.active) {
      return;
    }
    const labels = {
      move: "Déplacer calque",
      resize: "Redimensionner calque",
      rotate: "Pivoter calque"
    };
    this.app.commitHistory(labels[this.active.mode] || "Modifier calque");
    this.active = null;
  }

  getPoint(event) {
    const rect = this.sceneStage.getBoundingClientRect();
    const scale = rect.width / this.app.state.meta.width;
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    };
  }
}
