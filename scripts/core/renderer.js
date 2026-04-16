import { catastrophePresets, watermarkTextPresets } from "../data/presets.js";
import { getLayerById, getVisibleLayerList } from "../state/store.js";
import { buildTextPatternDataUri, getStageFilter, getTextMarkup, getTextShadowCss } from "./scene.js";

export class AppRenderer {
  constructor(refs, manifest) {
    this.refs = refs;
    this.manifest = manifest;
  }

  renderLibraries() {
    const { assetPanel } = this.refs;
    assetPanel.innerHTML = `
      <section class="library-section">
        <div class="section-ribbon">fonds acides</div>
        <div class="mini-actions">
          <button class="mini-button" data-action="remove-background">Fond vide</button>
          <button class="mini-button" data-action="import-background">Importer fond</button>
        </div>
        <div class="asset-grid asset-grid-backgrounds">
          ${this.manifest.backgrounds.map((asset) => this.renderAssetCard(asset, "pick-background")).join("")}
        </div>
      </section>

      <section class="library-section">
        <div class="section-ribbon">stickers maudits</div>
        <div class="mini-actions">
          <button class="mini-button" data-action="import-sticker">Importer PNG</button>
        </div>
        <div class="asset-grid">
          ${this.manifest.stickers.map((asset) => this.renderAssetCard(asset, "add-sticker")).join("")}
        </div>
      </section>

      <section class="library-section">
        <div class="section-ribbon">watermarks douteux</div>
        <div class="mini-actions">
          <button class="mini-button" data-action="add-watermark-text">Ajouter watermark texte</button>
        </div>
        <div class="asset-grid">
          ${this.manifest.watermarks.map((asset) => this.renderAssetCard(asset, "add-watermark-image")).join("")}
        </div>
        <div class="preset-chip-list">
          ${watermarkTextPresets
            .map(
              (preset) =>
                `<button class="preset-chip" data-action="add-watermark-text" data-text="${preset}">${preset}</button>`
            )
            .join("")}
        </div>
      </section>

      <section class="library-section">
        <div class="section-ribbon">cadres infects</div>
        <div class="mini-actions">
          <button class="mini-button" data-action="remove-frame">Retirer cadre</button>
        </div>
        <div class="asset-grid">
          ${this.manifest.frames.map((asset) => this.renderAssetCard(asset, "pick-frame")).join("")}
        </div>
      </section>

      <section class="library-section">
        <div class="section-ribbon">catastrophes prêtes</div>
        <div class="preset-stack">
          ${catastrophePresets
            .map(
              (preset) =>
                `<button class="catastrophe-button" data-action="apply-catastrophe" data-preset="${preset.label}">${preset.label}</button>`
            )
            .join("")}
        </div>
      </section>
    `;
  }

  renderAssetCard(asset, action) {
    return `
      <button class="asset-card" data-action="${action}" data-id="${asset.id}">
        <span class="asset-thumb" style="background-image:url('${asset.src}')"></span>
        <span class="asset-name">${asset.label}</span>
      </button>
    `;
  }

  render(state, history) {
    this.renderStage(state);
    this.renderProperties(state);
    this.renderLayers(state);
    this.renderHistory(history);
    this.updateStageScale(state);
  }

  renderStage(state) {
    const { sceneStage, sceneViewport } = this.refs;
    sceneStage.style.width = `${state.meta.width}px`;
    sceneStage.style.height = `${state.meta.height}px`;
    sceneStage.innerHTML = `
      <div class="scene-stage-body" style="filter:${getStageFilter(state.effects)}">
        ${this.renderBackground(state)}
        <div class="scene-watermark-layer">
          ${state.watermarks.map((item) => this.renderWatermark(item, state.selectionId)).join("")}
        </div>
        <div class="scene-element-layer">
          ${state.elements.map((item) => this.renderLayer(item, state.selectionId)).join("")}
        </div>
        ${state.frame.src ? this.renderFrame(state) : ""}
      </div>
      <div class="scene-empty-label ${state.background.src || state.elements.length || state.watermarks.length ? "is-hidden" : ""}">
        Dépose ici ton futur crime visuel
      </div>
    `;
    sceneViewport.dataset.hasContent = String(Boolean(state.background.src || state.elements.length || state.watermarks.length));
  }

  renderBackground(state) {
    if (!state.background.src) {
      return `
        <div class="scene-background empty-bg">
          <div class="empty-bg-grid"></div>
          <div class="empty-bg-copy">fond vide mais déjà inquiétant</div>
        </div>
      `;
    }
    return `
      <div
        class="scene-background"
        data-layer-id="background"
        style="background-image:url('${state.background.src}'); background-size:${state.background.fit};"
      ></div>
    `;
  }

  renderFrame(state) {
    return `
      <div class="scene-frame-layer ${state.selectionId === "frame" ? "is-selected" : ""}" data-layer-id="frame" style="opacity:${state.frame.opacity}">
        <img src="${state.frame.src}" alt="${state.frame.name}" draggable="false">
      </div>
    `;
  }

  renderWatermark(layer, selectionId) {
    const overlay = layer.repeated ? this.renderRepeatedOverlay(layer) : "";
    return `${overlay}${this.renderLayer(layer, selectionId, { proxy: layer.repeated })}`;
  }

  renderRepeatedOverlay(layer) {
    const backgroundImage = layer.type === "watermark-text" ? buildTextPatternDataUri(layer) : layer.src;
    return `
      <div
        class="scene-repeat-overlay"
        style="
          opacity:${layer.opacity};
          background-image:url('${backgroundImage}');
          background-size:${layer.width}px ${layer.height}px;
          background-position:${layer.x}px ${layer.y}px;
          transform:rotate(${layer.rotation}deg) scale(1.5);
        "
      ></div>
    `;
  }

  renderLayer(layer, selectionId, options = {}) {
    const selected = layer.id === selectionId;
    const classes = ["scene-item", `type-${layer.type}`];
    if (selected) {
      classes.push("is-selected");
    }
    if (layer.locked) {
      classes.push("is-locked");
    }
    if (options.proxy) {
      classes.push("is-proxy");
    }

    return `
      <div
        class="${classes.join(" ")}"
        data-layer-id="${layer.id}"
        style="
          left:${layer.x}px;
          top:${layer.y}px;
          width:${layer.width}px;
          height:${layer.height}px;
          opacity:${layer.opacity};
          transform:translate(-50%, -50%) rotate(${layer.rotation}deg) scaleX(${layer.flipX ? -1 : 1});
        "
      >
        ${layer.type.includes("text") ? this.renderTextLayer(layer, options.proxy) : this.renderImageLayer(layer, options.proxy)}
        ${options.proxy ? `<span class="repeat-badge">repeat</span>` : ""}
        ${selected && !layer.locked ? this.renderHandles() : ""}
      </div>
    `;
  }

  renderImageLayer(layer, proxy) {
    return `<img class="scene-image" src="${layer.src}" alt="${layer.name}" draggable="false">${proxy ? "<span class='proxy-grid'></span>" : ""}`;
  }

  renderTextLayer(layer, proxy) {
    const weight = layer.fontWeight === "700" ? "700" : "400";
    const textShadow = getTextShadowCss(layer);
    return `
      <div
        class="scene-text"
        style="
          font-family:${layer.fontFamily};
          font-size:${layer.fontSize}px;
          color:${layer.color};
          font-weight:${weight};
          font-style:${layer.fontStyle};
          text-align:${layer.align};
          -webkit-text-stroke:${layer.strokeWidth}px ${layer.strokeColor};
          text-shadow:${textShadow || "none"};
        "
      >
        ${getTextMarkup(layer.text)}
      </div>
      ${proxy ? "<span class='proxy-grid'></span>" : ""}
    `;
  }

  renderHandles() {
    return `
      <span class="handle handle-nw" data-handle="nw"></span>
      <span class="handle handle-ne" data-handle="ne"></span>
      <span class="handle handle-sw" data-handle="sw"></span>
      <span class="handle handle-se" data-handle="se"></span>
      <span class="handle handle-rotate" data-handle="rotate"></span>
    `;
  }

  renderProperties(state) {
    const { propertiesPanel } = this.refs;
    const selection = state.selectionId ? getLayerById(state, state.selectionId) : null;

    if (!selection) {
      propertiesPanel.innerHTML = `
        <div class="panel-block">
          <div class="inspector-ribbon">projet</div>
          <p class="tiny-copy">Desktop first, mauvais goût volontaire, crime lisible.</p>
          <div class="field-row">
            <label>Titre</label>
            <input data-project-prop="title" value="${state.meta.title}">
          </div>
        </div>
        <div class="panel-block">
          <div class="inspector-ribbon">filtres globaux</div>
          ${this.rangeField("contrast", "Contraste", state.effects.contrast, 80, 220)}
          ${this.rangeField("saturate", "Saturation", state.effects.saturate, 80, 260)}
          ${this.rangeField("hueRotate", "Hue Rotate", state.effects.hueRotate, -120, 120)}
          ${this.rangeField("jpegNoise", "JPEG sale", state.effects.jpegNoise, 0, 8, 0.1)}
        </div>
        <div class="panel-block">
          <div class="inspector-ribbon">raccourcis</div>
          <div class="shortcut-list">
            <span><b>Ctrl/Cmd+Z</b> annuler</span>
            <span><b>Ctrl/Cmd+Y</b> refaire</span>
            <span><b>Delete</b> supprimer</span>
            <span><b>Ctrl/Cmd+D</b> dupliquer</span>
          </div>
        </div>
      `;
      return;
    }

    if (selection.id === "background") {
      propertiesPanel.innerHTML = `
        <div class="panel-block">
          <div class="inspector-ribbon">fond principal</div>
          <div class="field-row"><label>Nom</label><div class="value-pill">${state.background.name}</div></div>
          <div class="field-row">
            <label>Mode</label>
            <select data-selection-prop="fit">
              <option value="cover" ${state.background.fit === "cover" ? "selected" : ""}>cover</option>
              <option value="contain" ${state.background.fit === "contain" ? "selected" : ""}>contain</option>
            </select>
          </div>
          <div class="button-row">
            <button class="mini-button" data-action="remove-background">Supprimer le fond</button>
          </div>
        </div>
      `;
      return;
    }

    if (selection.id === "frame") {
      propertiesPanel.innerHTML = `
        <div class="panel-block">
          <div class="inspector-ribbon">cadre du haut</div>
          ${this.rangeField("opacity", "Opacité", state.frame.opacity, 0.1, 1, 0.01, true)}
          <div class="button-row">
            <button class="mini-button" data-action="remove-frame">Supprimer</button>
          </div>
        </div>
      `;
      return;
    }

    propertiesPanel.innerHTML = `
      <div class="panel-block">
        <div class="inspector-ribbon">${selection.type}</div>
        <div class="field-grid two-cols">
          ${this.numberField("x", "X", selection.x)}
          ${this.numberField("y", "Y", selection.y)}
          ${this.numberField("width", "Largeur", selection.width)}
          ${this.numberField("height", "Hauteur", selection.height)}
          ${this.numberField("rotation", "Rotation", selection.rotation)}
          ${this.rangeField("opacity", "Opacité", selection.opacity, 0.05, 1, 0.01, true)}
        </div>
        <div class="button-row">
          <button class="mini-button" data-action="duplicate-selection">Dupliquer</button>
          <button class="mini-button" data-action="delete-selection">Supprimer</button>
          <button class="mini-button" data-action="move-up">Monter</button>
          <button class="mini-button" data-action="move-down">Descendre</button>
          <button class="mini-button" data-action="toggle-lock">${selection.locked ? "Déverrouiller" : "Verrouiller"}</button>
        </div>
      </div>
      ${this.renderSpecificFields(selection)}
    `;
  }

  renderSpecificFields(selection) {
    if (selection.type === "sticker" || selection.type === "watermark-image") {
      return `
        <div class="panel-block">
          <div class="inspector-ribbon">image</div>
          <div class="field-row checkbox-row">
            <label><input type="checkbox" data-selection-prop="flipX" ${selection.flipX ? "checked" : ""}> Flip horizontal</label>
          </div>
          ${
            selection.type === "watermark-image"
              ? `<div class="field-row checkbox-row">
                  <label><input type="checkbox" data-selection-prop="repeated" ${selection.repeated ? "checked" : ""}> Répéter sur toute la scène</label>
                </div>`
              : ""
          }
        </div>
      `;
    }

    if (selection.type === "text" || selection.type === "watermark-text") {
      return `
        <div class="panel-block">
          <div class="inspector-ribbon">texte</div>
          <div class="field-row stack-row">
            <label>Contenu</label>
            <textarea rows="4" data-selection-prop="text">${selection.text}</textarea>
          </div>
          <div class="field-row">
            <label>Police</label>
            <select data-selection-prop="fontFamily">
              ${this.manifest.fonts
                .map(
                  (font) =>
                    `<option value="${font.family}" ${font.family === selection.fontFamily ? "selected" : ""}>${font.label}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="field-grid two-cols">
            ${this.numberField("fontSize", "Taille", selection.fontSize)}
            <div class="field-row">
              <label>Alignement</label>
              <select data-selection-prop="align">
                <option value="left" ${selection.align === "left" ? "selected" : ""}>left</option>
                <option value="center" ${selection.align === "center" ? "selected" : ""}>center</option>
                <option value="right" ${selection.align === "right" ? "selected" : ""}>right</option>
              </select>
            </div>
            ${this.colorField("color", "Couleur", selection.color)}
            ${this.colorField("strokeColor", "Contour", selection.strokeColor)}
            ${this.numberField("strokeWidth", "Épais", selection.strokeWidth)}
            ${this.numberField("shadowBlur", "Ombre", selection.shadowBlur)}
            ${this.numberField("glowStrength", "Glow", selection.glowStrength)}
            ${this.colorField("glowColor", "Couleur glow", selection.glowColor)}
            ${this.colorField("shadowColor", "Couleur ombre", normalizeColorValue(selection.shadowColor))}
          </div>
          <div class="field-row checkbox-row">
            <label><input type="checkbox" data-selection-prop="fontWeight" data-checked-value="700" data-unchecked-value="400" ${selection.fontWeight === "700" ? "checked" : ""}> Gras</label>
            <label><input type="checkbox" data-selection-prop="fontStyle" data-checked-value="italic" data-unchecked-value="normal" ${selection.fontStyle === "italic" ? "checked" : ""}> Italique</label>
            ${
              selection.type === "watermark-text"
                ? `<label><input type="checkbox" data-selection-prop="repeated" ${selection.repeated ? "checked" : ""}> Répéter</label>`
                : ""
            }
          </div>
        </div>
      `;
    }

    return "";
  }

  numberField(prop, label, value) {
    return `
      <div class="field-row">
        <label>${label}</label>
        <input type="number" data-selection-prop="${prop}" value="${Math.round(value * 100) / 100}">
      </div>
    `;
  }

  colorField(prop, label, value) {
    return `
      <div class="field-row">
        <label>${label}</label>
        <input type="color" data-selection-prop="${prop}" value="${normalizeColorValue(value)}">
      </div>
    `;
  }

  rangeField(prop, label, value, min, max, step = 1, project = false) {
    const attribute = project ? "data-selection-prop" : "data-project-effect";
    return `
      <div class="field-row slider-row">
        <label>${label}</label>
        <input type="range" ${attribute}="${prop}" min="${min}" max="${max}" step="${step}" value="${value}">
        <span class="slider-value">${Math.round(value * 100) / 100}</span>
      </div>
    `;
  }

  renderLayers(state) {
    const { layersPanel } = this.refs;
    const layers = getVisibleLayerList(state);
    layersPanel.innerHTML = `
      <div class="panel-block">
        <div class="inspector-ribbon">calques</div>
        <div class="layer-list">
          ${layers
            .map(
              (layer) => `
                <button class="layer-row ${layer.id === state.selectionId ? "is-selected" : ""}" data-action="select-layer" data-id="${layer.id}">
                  <span class="layer-tag">${layer.type}</span>
                  <span class="layer-label">${layer.label}</span>
                  ${layer.locked ? "<span class='lock-indicator'>lock</span>" : ""}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  renderHistory(history) {
    const { historyPanel } = this.refs;
    const entries = history.getTimeline().slice(-8).reverse();
    historyPanel.innerHTML = `
      <div class="panel-block">
        <div class="inspector-ribbon">historique du drame</div>
        <div class="history-list">
          ${entries
            .map(
              (entry) => `
                <div class="history-row ${entry.current ? "is-current" : ""}">
                  ${entry.label}
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  updateStageScale(state) {
    const { sceneViewport, sceneStage } = this.refs;
    const rect = sceneViewport.getBoundingClientRect();
    const scale = Math.min((rect.width - 40) / state.meta.width, (rect.height - 40) / state.meta.height, 1);
    sceneStage.style.transform = `scale(${Math.max(scale, 0.25)})`;
  }
}

function normalizeColorValue(value) {
  if (!value) {
    return "#ffffff";
  }
  if (value.startsWith("#")) {
    return value;
  }
  const rgba = value.match(/\d+/g);
  if (!rgba) {
    return "#ffffff";
  }
  const [r, g, b] = rgba.map((channel) => Number(channel).toString(16).padStart(2, "0"));
  return `#${r}${g}${b}`;
}
