import { catastrophePresets, watermarkTextPresets } from "../data/presets.js";
import { getLayerById, getVisibleLayerList } from "../state/store.js";
import { buildTextPatternDataUri, getStageFilter, getTextMarkup, getTextShadowCss } from "./scene.js";

export class AppRenderer {
  constructor(refs, manifest) {
    this.refs = refs;
    this.manifest = manifest;
  }

  renderLibraries(libraryUi = {}) {
    const { assetPanel } = this.refs;
    const query = (libraryUi.query || "").trim().toLowerCase();
    const category = libraryUi.category || "all";
    const stickerGroup = libraryUi.stickerGroup || "all";
    const collapsed = libraryUi.collapsed || {};

    const filteredBackgrounds = this.filterAssets(this.manifest.backgrounds, query);
    const filteredFrames = this.filterAssets(this.manifest.frames, query);
    const filteredWatermarks = this.filterAssets(this.manifest.watermarks, query);
    const stickerBuckets = this.groupStickers(this.filterAssets(this.manifest.stickers, query));

    const visibleStickerBuckets =
      stickerGroup === "all"
        ? stickerBuckets.filter((bucket) => bucket.items.length)
        : stickerBuckets.filter((bucket) => bucket.key === stickerGroup && bucket.items.length);

    const visibleStickerCount = visibleStickerBuckets.reduce((count, bucket) => count + bucket.items.length, 0);
    const totals = {
      all:
        filteredBackgrounds.length +
        filteredFrames.length +
        filteredWatermarks.length +
        visibleStickerCount +
        catastrophePresets.length,
      backgrounds: filteredBackgrounds.length,
      stickers: visibleStickerCount,
      watermarks: filteredWatermarks.length,
      frames: filteredFrames.length,
      presets: catastrophePresets.length
    };

    assetPanel.innerHTML = `
      <section class="library-toolbar">
        <div class="section-ribbon">jukebox des assets</div>
        <div class="library-search-row">
          <input
            class="library-search"
            type="search"
            placeholder="chercher dolphin, vip, glitter, preview..."
            value="${escapeAttribute(libraryUi.query || "")}"
            data-library-input="query"
          >
          <button class="mini-button" data-library-action="clear-query">Vider</button>
        </div>
        <div class="library-tabs">
          ${this.renderLibraryTab("all", "Tout", totals.all, category)}
          ${this.renderLibraryTab("backgrounds", "Fonds", totals.backgrounds, category)}
          ${this.renderLibraryTab("stickers", "Stickers", totals.stickers, category)}
          ${this.renderLibraryTab("watermarks", "Watermarks", totals.watermarks, category)}
          ${this.renderLibraryTab("frames", "Cadres", totals.frames, category)}
          ${this.renderLibraryTab("presets", "Presets", totals.presets, category)}
        </div>
        ${(category === "all" || category === "stickers") ? `
          <div class="library-subtabs">
            ${this.renderStickerTab("all", "tout le zoo", visibleStickerCount, stickerGroup)}
            ${this.renderStickerTab("animals", "animaux", stickerBuckets.find((item) => item.key === "animals")?.items.length || 0, stickerGroup)}
            ${this.renderStickerTab("love", "love/glitter", stickerBuckets.find((item) => item.key === "love")?.items.length || 0, stickerGroup)}
            ${this.renderStickerTab("text", "textes/badges", stickerBuckets.find((item) => item.key === "text")?.items.length || 0, stickerGroup)}
            ${this.renderStickerTab("web", "emo/webcore", stickerBuckets.find((item) => item.key === "web")?.items.length || 0, stickerGroup)}
          </div>
        ` : ""}
        <div class="library-stats">
          <span>${totals.all} trucs visibles</span>
          <span>${query ? `filtre: ${escapeHtml(query)}` : "aucun filtre"}</span>
        </div>
      </section>

      ${category === "all" || category === "backgrounds" ? `
      <section class="library-section">
        ${this.renderSectionHeader("backgrounds", "fonds acides", filteredBackgrounds.length, collapsed.backgrounds)}
        <div class="library-section-body ${collapsed.backgrounds ? "is-collapsed" : ""}">
          <div class="mini-actions">
            <button class="mini-button" data-action="remove-background">Fond vide</button>
            <button class="mini-button" data-action="import-background">Importer fond</button>
          </div>
          <div class="asset-grid asset-grid-backgrounds">
            ${filteredBackgrounds.map((asset) => this.renderAssetCard(asset, "pick-background")).join("") || this.renderNoResult()}
          </div>
        </div>
      </section>` : ""}

      ${category === "all" || category === "stickers" ? `
      <section class="library-section">
        ${this.renderSectionHeader("stickers", "stickers maudits", visibleStickerCount, collapsed.stickers)}
        <div class="library-section-body ${collapsed.stickers ? "is-collapsed" : ""}">
          <div class="mini-actions">
            <button class="mini-button" data-action="import-sticker">Importer PNG</button>
          </div>
          ${visibleStickerBuckets.map((bucket) => this.renderStickerBucket(bucket)).join("") || this.renderNoResult("Rien ne matche ce filtre.")}
        </div>
      </section>` : ""}

      ${category === "all" || category === "watermarks" ? `
      <section class="library-section">
        ${this.renderSectionHeader("watermarks", "watermarks douteux", filteredWatermarks.length, collapsed.watermarks)}
        <div class="library-section-body ${collapsed.watermarks ? "is-collapsed" : ""}">
          <div class="mini-actions">
            <button class="mini-button" data-action="add-watermark-text">Ajouter watermark texte</button>
          </div>
          <div class="asset-grid">
            ${filteredWatermarks.map((asset) => this.renderAssetCard(asset, "add-watermark-image")).join("") || this.renderNoResult()}
          </div>
          <div class="preset-chip-list">
            ${watermarkTextPresets
              .filter((preset) => preset.toLowerCase().includes(query) || !query)
              .map(
                (preset) =>
                  `<button class="preset-chip" data-action="add-watermark-text" data-text="${preset}">${preset}</button>`
              )
              .join("")}
          </div>
        </div>
      </section>` : ""}

      ${category === "all" || category === "frames" ? `
      <section class="library-section">
        ${this.renderSectionHeader("frames", "cadres infects", filteredFrames.length, collapsed.frames)}
        <div class="library-section-body ${collapsed.frames ? "is-collapsed" : ""}">
          <div class="mini-actions">
            <button class="mini-button" data-action="remove-frame">Retirer cadre</button>
          </div>
          <div class="asset-grid">
            ${filteredFrames.map((asset) => this.renderAssetCard(asset, "pick-frame")).join("") || this.renderNoResult()}
          </div>
        </div>
      </section>` : ""}

      ${category === "all" || category === "presets" ? `
      <section class="library-section">
        ${this.renderSectionHeader("presets", "catastrophes prêtes", catastrophePresets.length, collapsed.presets)}
        <div class="library-section-body ${collapsed.presets ? "is-collapsed" : ""}">
          <div class="preset-stack">
            ${catastrophePresets
              .filter((preset) => preset.label.toLowerCase().includes(query) || !query)
              .map(
                (preset) =>
                  `<button class="catastrophe-button" data-action="apply-catastrophe" data-preset="${preset.label}">${preset.label}</button>`
              )
              .join("") || this.renderNoResult()}
          </div>
        </div>
      </section>` : ""}
    `;
  }

  renderLibraryTab(key, label, count, activeKey) {
    return `
      <button class="library-tab ${key === activeKey ? "is-active" : ""}" data-library-category="${key}">
        <span>${label}</span>
        <b>${count}</b>
      </button>
    `;
  }

  renderStickerTab(key, label, count, activeKey) {
    return `
      <button class="library-subtab ${key === activeKey ? "is-active" : ""}" data-library-sticker-group="${key}">
        <span>${label}</span>
        <b>${count}</b>
      </button>
    `;
  }

  renderSectionHeader(key, label, count, collapsed) {
    return `
      <div class="library-section-head">
        <div class="section-ribbon">${label}</div>
        <button class="library-collapse-toggle" data-library-toggle="${key}">
          <span>${count}</span>
          <b>${collapsed ? "ouvrir" : "plier"}</b>
        </button>
      </div>
    `;
  }

  renderStickerBucket(bucket) {
    return `
      <div class="sticker-bucket">
        <div class="sticker-bucket-title">${bucket.label} <span>${bucket.items.length}</span></div>
        <div class="asset-grid">
          ${bucket.items.map((asset) => this.renderAssetCard(asset, "add-sticker")).join("")}
        </div>
      </div>
    `;
  }

  renderAssetCard(asset, action) {
    return `
      <button class="asset-card" data-action="${action}" data-id="${asset.id}" title="${asset.label}">
        <span class="asset-thumb" style="background-image:url('${asset.src}')"></span>
        <span class="asset-name">${asset.label}</span>
      </button>
    `;
  }

  renderNoResult(text = "Aucun asset ici pour l'instant.") {
    return `<div class="library-empty">${text}</div>`;
  }

  filterAssets(assets, query) {
    if (!query) {
      return assets;
    }
    return assets.filter((asset) => `${asset.label} ${asset.id}`.toLowerCase().includes(query));
  }

  groupStickers(stickers) {
    const buckets = [
      { key: "animals", label: "animaux glitter", items: [] },
      { key: "love", label: "love & deco", items: [] },
      { key: "text", label: "textes & badges", items: [] },
      { key: "web", label: "emo & vieux web", items: [] }
    ];

    for (const asset of stickers) {
      const bucket = buckets.find((item) => item.key === this.getStickerBucketKey(asset)) || buckets[1];
      bucket.items.push(asset);
    }

    return buckets;
  }

  getStickerBucketKey(asset) {
    const token = `${asset.id} ${asset.label}`.toLowerCase();
    if (/(dolphin|kitty|cat|bunny|teddy|paw|tiger|angel|unicorn|butterfly|bear)/.test(token)) {
      return "animals";
    }
    if (/(vip|badge|best|friend|asv|babe|cute|lol|mdr|tkt|love|kiss|miss|princess|scene|hot|so glam|do not copy|bg 2)/.test(token)) {
      return "text";
    }
    if (/(emo|broken|emoji|blinkie|xd|wink|shock|smile|hater)/.test(token)) {
      return "web";
    }
    return "love";
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

function escapeAttribute(text = "") {
  return text.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;");
}

function escapeHtml(text = "") {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
