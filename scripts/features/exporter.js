import {
  buildTextPatternDataUri,
  drawFittedImage,
  drawImageLayer,
  drawTextLayer,
  getStageFilter
} from "../core/scene.js";

export class Exporter {
  constructor() {
    this.cache = new Map();
  }

  async exportPng(state) {
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = state.meta.width;
    baseCanvas.height = state.meta.height;
    const ctx = baseCanvas.getContext("2d");

    if (state.background.src) {
      const backgroundImage = await this.loadImage(state.background.src);
      drawFittedImage(ctx, backgroundImage, state.meta.width, state.meta.height, state.background.fit);
    } else {
      ctx.fillStyle = "#f7f3ff";
      ctx.fillRect(0, 0, state.meta.width, state.meta.height);
    }

    for (const watermark of state.watermarks) {
      await this.drawLayer(ctx, watermark, state);
    }

    for (const layer of state.elements) {
      await this.drawLayer(ctx, layer, state);
    }

    if (state.frame.src) {
      const frameImage = await this.loadImage(state.frame.src);
      ctx.save();
      ctx.globalAlpha = state.frame.opacity;
      ctx.drawImage(frameImage, 0, 0, state.meta.width, state.meta.height);
      ctx.restore();
    }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = state.meta.width;
    finalCanvas.height = state.meta.height;
    const finalCtx = finalCanvas.getContext("2d");
    finalCtx.filter = getStageFilter(state.effects);
    finalCtx.drawImage(baseCanvas, 0, 0);

    if (state.effects.jpegNoise > 0) {
      this.applyJpegMess(finalCanvas, state.effects.jpegNoise);
    }

    const link = document.createElement("a");
    link.download = `jpegcore-${Date.now()}.png`;
    link.href = finalCanvas.toDataURL("image/png");
    link.click();
  }

  async drawLayer(ctx, layer, state) {
    if (layer.type === "sticker" || layer.type === "watermark-image") {
      if (layer.repeated) {
        await this.drawRepeatedImageWatermark(ctx, layer, state);
        return;
      }
      const image = await this.loadImage(layer.src);
      drawImageLayer(ctx, layer, image);
      return;
    }

    if (layer.type === "text" || layer.type === "watermark-text") {
      if (layer.repeated) {
        await this.drawRepeatedTextWatermark(ctx, layer, state);
        return;
      }
      drawTextLayer(ctx, layer);
    }
  }

  async drawRepeatedImageWatermark(ctx, layer, state) {
    const image = await this.loadImage(layer.src);
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = Math.max(32, Math.round(layer.width));
    patternCanvas.height = Math.max(32, Math.round(layer.height));
    const patternCtx = patternCanvas.getContext("2d");
    patternCtx.drawImage(image, 0, 0, patternCanvas.width, patternCanvas.height);

    ctx.save();
    ctx.translate(state.meta.width / 2, state.meta.height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-state.meta.width / 2, -state.meta.height / 2);
    const pattern = ctx.createPattern(patternCanvas, "repeat");
    ctx.globalAlpha = layer.opacity;
    if (pattern?.setTransform) {
      pattern.setTransform(new DOMMatrix().translateSelf(layer.x, layer.y));
    }
    ctx.fillStyle = pattern;
    ctx.fillRect(-state.meta.width * 0.5, -state.meta.height * 0.5, state.meta.width * 2, state.meta.height * 2);
    ctx.restore();
  }

  async drawRepeatedTextWatermark(ctx, layer, state) {
    const tile = await this.loadImage(buildTextPatternDataUri(layer));
    const pattern = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.translate(state.meta.width / 2, state.meta.height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-state.meta.width / 2, -state.meta.height / 2);
    ctx.globalAlpha = layer.opacity;
    if (pattern?.setTransform) {
      pattern.setTransform(new DOMMatrix().translateSelf(layer.x, layer.y));
    }
    ctx.fillStyle = pattern;
    ctx.fillRect(-state.meta.width * 0.5, -state.meta.height * 0.5, state.meta.width * 2, state.meta.height * 2);
    ctx.restore();
  }

  applyJpegMess(canvas, intensity) {
    const temp = document.createElement("canvas");
    const scale = Math.max(0.25, 1 - intensity * 0.08);
    temp.width = Math.max(80, Math.round(canvas.width * scale));
    temp.height = Math.max(80, Math.round(canvas.height * scale));

    const tempCtx = temp.getContext("2d");
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.drawImage(canvas, 0, 0, temp.width, temp.height);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);

    for (let i = 0; i < intensity * 90; i += 1) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.08)`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 22 + 6, Math.random() * 8 + 2);
    }
  }

  loadImage(src) {
    if (this.cache.has(src)) {
      return this.cache.get(src);
    }
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    this.cache.set(src, promise);
    return promise;
  }
}
