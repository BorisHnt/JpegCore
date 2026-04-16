import { assetManifest } from "../data/asset-manifest.js";
import { starterTexts, watermarkTextPresets, worsenWords } from "../data/presets.js";
import {
  makeSticker,
  makeText,
  makeWatermarkImage,
  makeWatermarkText
} from "../state/store.js";
import { clamp, randomBetween, randomItem } from "../utils/helpers.js";

const LEVELS = {
  x1: [1, 2],
  x3: [3, 5],
  max: [5, 8]
};

export class WorsenEngine {
  mutate(state, level) {
    const [minOps, maxOps] = LEVELS[level] || LEVELS.x1;
    const operations = Math.floor(randomBetween(minOps, maxOps + 1));
    const effects = [
      () => this.addSticker(state),
      () => this.addWatermark(state),
      () => this.addOrMutateText(state),
      () => this.pushFilters(state),
      () => this.twistElement(state),
      () => this.addFrame(state),
      () => this.overDecorateText(state),
      () => this.addTinyDecoration(state)
    ];

    for (let index = 0; index < operations; index += 1) {
      randomItem(effects)();
    }

    state.lastWorsenLevel = level;
  }

  addSticker(state) {
    const asset = randomItem(assetManifest.stickers);
    const sticker = makeSticker({
      src: asset.src,
      name: asset.label,
      x: randomBetween(160, 740),
      y: randomBetween(160, 740),
      width: randomBetween(90, 260),
      height: randomBetween(90, 260)
    });
    sticker.rotation = randomBetween(-25, 25);
    sticker.opacity = randomBetween(0.72, 1);
    state.elements.push(sticker);
    state.selectionId = sticker.id;
  }

  addWatermark(state) {
    const useText = Math.random() > 0.45;
    const watermark = useText
      ? makeWatermarkText({
          text: randomItem(watermarkTextPresets),
          x: randomBetween(220, 680),
          y: randomBetween(220, 680)
        })
      : makeWatermarkImage({
          src: randomItem(assetManifest.watermarks).src,
          x: randomBetween(180, 520),
          y: randomBetween(180, 520)
        });
    watermark.repeated = Math.random() > 0.65;
    watermark.opacity = randomBetween(0.16, 0.38);
    watermark.rotation = randomBetween(-35, 35);
    state.watermarks.push(watermark);
    state.selectionId = watermark.id;
  }

  addOrMutateText(state) {
    const existingTexts = state.elements.filter((item) => item.type === "text");
    if (existingTexts.length === 0 || Math.random() > 0.55) {
      const textLayer = makeText({
        text: randomItem([...starterTexts, ...worsenWords]),
        x: randomBetween(180, 720),
        y: randomBetween(180, 720)
      });
      textLayer.rotation = randomBetween(-18, 18);
      textLayer.fontSize = randomBetween(42, 88);
      state.elements.push(textLayer);
      state.selectionId = textLayer.id;
      return;
    }

    const target = randomItem(existingTexts);
    target.text = `${target.text} ${randomItem(worsenWords)}`;
    target.rotation += randomBetween(-14, 14);
    target.fontSize = clamp(target.fontSize + randomBetween(-8, 18), 24, 140);
    target.glowStrength = clamp(target.glowStrength + randomBetween(4, 20), 0, 44);
    target.strokeWidth = clamp(target.strokeWidth + randomBetween(1, 4), 0, 18);
    target.color = randomItem(["#ffffff", "#fffb00", "#5bfffc", "#ff6adf", "#ff7f11"]);
    state.selectionId = target.id;
  }

  pushFilters(state) {
    state.effects.contrast = clamp(state.effects.contrast + randomBetween(6, 22), 80, 220);
    state.effects.saturate = clamp(state.effects.saturate + randomBetween(8, 28), 80, 260);
    state.effects.hueRotate = clamp(state.effects.hueRotate + randomBetween(-25, 25), -120, 120);
    state.effects.jpegNoise = clamp(state.effects.jpegNoise + randomBetween(0.2, 1.3), 0, 8);
  }

  twistElement(state) {
    const candidates = [...state.elements, ...state.watermarks];
    if (candidates.length === 0) {
      this.addSticker(state);
      return;
    }
    const target = randomItem(candidates);
    target.rotation += randomBetween(-32, 32);
    target.opacity = clamp(target.opacity + randomBetween(-0.12, 0.15), 0.18, 1);
    if ("width" in target) {
      target.width = clamp(target.width + randomBetween(-40, 70), 48, 760);
    }
    if ("height" in target) {
      target.height = clamp(target.height + randomBetween(-30, 60), 36, 760);
    }
    state.selectionId = target.id;
  }

  addFrame(state) {
    const frame = randomItem(assetManifest.frames);
    state.frame.src = frame.src;
    state.frame.name = frame.label;
    state.frame.opacity = randomBetween(0.82, 1);
    state.selectionId = "frame";
  }

  overDecorateText(state) {
    const texts = state.elements.filter((item) => item.type === "text");
    if (texts.length === 0) {
      this.addOrMutateText(state);
      return;
    }
    const target = randomItem(texts);
    target.shadowBlur = clamp(target.shadowBlur + randomBetween(2, 10), 0, 24);
    target.shadowOffsetX = clamp(target.shadowOffsetX + randomBetween(-3, 5), -12, 18);
    target.shadowOffsetY = clamp(target.shadowOffsetY + randomBetween(-3, 5), -12, 18);
    target.glowStrength = clamp(target.glowStrength + randomBetween(6, 16), 0, 44);
    target.strokeColor = randomItem(["#ff00cc", "#ffffff", "#ffe600", "#00f7ff", "#6200ff"]);
    target.glowColor = randomItem(["#fff65c", "#ff4ecb", "#00f7ff", "#ffffff"]);
    state.selectionId = target.id;
  }

  addTinyDecoration(state) {
    const asset = randomItem(assetManifest.stickers);
    const sticker = makeSticker({
      src: asset.src,
      name: `${asset.label} micro`,
      x: randomBetween(80, 820),
      y: randomBetween(80, 820),
      width: randomBetween(48, 112),
      height: randomBetween(48, 112)
    });
    sticker.rotation = randomBetween(-50, 50);
    state.elements.push(sticker);
    state.selectionId = sticker.id;
  }
}
