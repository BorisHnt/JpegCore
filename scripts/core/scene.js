import { degreesToRadians, escapeHtml } from "../utils/helpers.js";

const measureCanvas = document.createElement("canvas");
const measureContext = measureCanvas.getContext("2d");

export function getStageFilter(effects) {
  return `contrast(${effects.contrast}%) saturate(${effects.saturate}%) hue-rotate(${effects.hueRotate}deg)`;
}

export function getTextShadowCss(layer) {
  const shadows = [];
  if (layer.shadowBlur > 0 || layer.shadowOffsetX || layer.shadowOffsetY) {
    shadows.push(
      `${layer.shadowOffsetX || 0}px ${layer.shadowOffsetY || 0}px ${Math.max(layer.shadowBlur || 0, 1)}px ${layer.shadowColor || "rgba(0,0,0,0.45)"}`
    );
  }
  if (layer.glowStrength > 0) {
    shadows.push(`0 0 ${layer.glowStrength}px ${layer.glowColor || "#fff"}`);
    shadows.push(`0 0 ${Math.round(layer.glowStrength * 1.8)}px ${layer.glowColor || "#fff"}`);
  }
  return shadows.join(", ");
}

export function getTextMarkup(layer) {
  return getTextLines(layer).map((line) => escapeHtml(line)).join("<br>");
}

export function buildTextPatternDataUri(layer) {
  const textSpans = getTextLines(layer)
    .map(
      (line, index) => `
        <tspan x="50%" dy="${index === 0 ? "0" : "1.05em"}">${escapeXml(line)}</tspan>
      `
    )
    .join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(60, Math.round(layer.width))}" height="${Math.max(40, Math.round(layer.height))}" viewBox="0 0 ${Math.max(60, Math.round(layer.width))} ${Math.max(40, Math.round(layer.height))}">
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="${layer.fontFamily.replaceAll("\"", "'")}"
        font-size="${Math.round(layer.fontSize)}"
        font-weight="${layer.fontWeight}"
        font-style="${layer.fontStyle}"
        fill="${layer.color}"
        stroke="${layer.strokeColor || "transparent"}"
        stroke-width="${layer.strokeWidth || 0}"
      >${textSpans}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

export function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || current === "") {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines.filter((line, index, arr) => !(line === "" && index === arr.length - 1));
}

export function getTextLines(layer) {
  const fontToken = `${layer.fontStyle === "italic" ? "italic " : ""}${layer.fontWeight === "700" ? "700 " : ""}${layer.fontSize}px ${layer.fontFamily}`;
  measureContext.font = fontToken;
  const maxWidth = Math.max(layer.width - 12, 40);
  const forcedLineCount = Math.max(0, Math.round(Number(layer.lineCount) || 0));

  if (forcedLineCount <= 0) {
    return wrapText(measureContext, layer.text, maxWidth);
  }

  return splitIntoForcedLines(measureContext, layer.text, maxWidth, forcedLineCount);
}

function splitIntoForcedLines(ctx, text, maxWidth, requestedCount) {
  const words = text.replaceAll("\n", " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const targetCount = Math.min(requestedCount, words.length);
  if (targetCount === 1) {
    return [words.join(" ")];
  }

  const totalWidth = ctx.measureText(words.join(" ")).width;
  const idealWidth = Math.min(maxWidth, totalWidth / targetCount || maxWidth);
  const remaining = [...words];
  const lines = [];

  for (let index = 0; index < targetCount; index += 1) {
    const lineSlotsLeft = targetCount - index;
    if (lineSlotsLeft === 1) {
      lines.push(remaining.join(" "));
      break;
    }

    let current = remaining.shift() || "";
    while (remaining.length >= lineSlotsLeft - 1) {
      const candidate = `${current} ${remaining[0]}`;
      const currentWidth = ctx.measureText(current).width;
      const candidateWidth = ctx.measureText(candidate).width;
      const tooWideForBox = candidateWidth > maxWidth && currentWidth <= maxWidth;
      const tooWideForBalance = candidateWidth > idealWidth * 1.1 && currentWidth >= idealWidth * 0.55;

      if (tooWideForBox || tooWideForBalance) {
        break;
      }

      current = candidate;
      remaining.shift();
    }
    lines.push(current);
  }

  return lines;
}

export function drawFittedImage(ctx, image, targetWidth, targetHeight, fit = "cover") {
  const imageRatio = image.width / image.height;
  const targetRatio = targetWidth / targetHeight;

  if (fit === "contain") {
    let drawWidth = targetWidth;
    let drawHeight = targetHeight;
    if (imageRatio > targetRatio) {
      drawHeight = targetWidth / imageRatio;
    } else {
      drawWidth = targetHeight * imageRatio;
    }
    const offsetX = (targetWidth - drawWidth) / 2;
    const offsetY = (targetHeight - drawHeight) / 2;
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    return;
  }

  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
}

export function drawImageLayer(ctx, layer, image) {
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate(degreesToRadians(layer.rotation));
  ctx.scale(layer.flipX ? -1 : 1, 1);
  ctx.globalAlpha = layer.opacity;
  ctx.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
  ctx.restore();
}

export function drawTextLayer(ctx, layer) {
  const fontToken = `${layer.fontStyle === "italic" ? "italic " : ""}${layer.fontWeight === "700" ? "700 " : ""}${layer.fontSize}px ${layer.fontFamily}`;

  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate(degreesToRadians(layer.rotation));
  ctx.globalAlpha = layer.opacity;
  ctx.font = fontToken;
  const lines = getTextLines(layer);
  const lineHeight = layer.fontSize * 1.05;
  const totalHeight = lineHeight * lines.length;
  ctx.textBaseline = "middle";
  ctx.textAlign = layer.align;
  ctx.shadowColor = layer.glowStrength > 0 ? layer.glowColor : layer.shadowColor;
  ctx.shadowBlur = (layer.shadowBlur || 0) + (layer.glowStrength || 0);
  ctx.shadowOffsetX = layer.shadowOffsetX || 0;
  ctx.shadowOffsetY = layer.shadowOffsetY || 0;
  ctx.lineJoin = "round";
  ctx.lineWidth = layer.strokeWidth || 0;
  ctx.strokeStyle = layer.strokeColor || "transparent";
  ctx.fillStyle = layer.color;

  let anchorX = 0;
  if (layer.align === "left") {
    anchorX = -layer.width / 2;
  }
  if (layer.align === "right") {
    anchorX = layer.width / 2;
  }

  lines.forEach((line, index) => {
    const y = -totalHeight / 2 + lineHeight / 2 + index * lineHeight;
    if (layer.strokeWidth > 0) {
      ctx.strokeText(line, anchorX, y);
    }
    ctx.fillText(line, anchorX, y);
  });

  ctx.restore();
}
