import { assetManifest } from "./data/asset-manifest.js";
import { catastrophePresets, starterTexts, watermarkTextPresets } from "./data/presets.js";
import { StageInteractions } from "./core/interactions.js";
import { AppRenderer } from "./core/renderer.js";
import { AssetLoader } from "./features/asset-loader.js";
import { Exporter } from "./features/exporter.js";
import { installKeyboardShortcuts } from "./features/keyboard.js";
import { WorsenEngine } from "./features/worsen-engine.js";
import { HistoryManager } from "./state/history.js";
import {
  ProjectStore,
  createInitialState,
  duplicateLayer,
  getLayerById,
  getLayerSection,
  makeSticker,
  makeText,
  makeWatermarkImage,
  makeWatermarkText,
  removeLayer,
  reorderLayer
} from "./state/store.js";
import { randomItem } from "./utils/helpers.js";

class JpegCoreApp {
  constructor(refs) {
    this.refs = refs;
    this.store = new ProjectStore(createInitialState());
    this.history = new HistoryManager(this.store.getState());
    this.assetLoader = new AssetLoader(assetManifest);
    this.renderer = new AppRenderer(refs, assetManifest);
    this.interactions = new StageInteractions(refs.sceneStage, this);
    this.exporter = new Exporter();
    this.worsenEngine = new WorsenEngine();
  }

  get state() {
    return this.store.getState();
  }

  async init() {
    await this.assetLoader.loadFonts();
    this.renderer.renderLibraries();
    this.bindUi();
    this.interactions.bind();
    installKeyboardShortcuts(this);
    this.seedDemo();
    this.render();
    window.addEventListener("resize", () => this.renderer.updateStageScale(this.state));
    this.refs.loadingScreen.classList.add("is-hidden");
  }

  bindUi() {
    document.body.addEventListener("click", (event) => this.handleActionClick(event));
    this.refs.propertiesPanel.addEventListener("input", (event) => this.handlePropertyInput(event));
    this.refs.propertiesPanel.addEventListener("change", (event) => this.handlePropertyChange(event));
    this.refs.bgInput.addEventListener("change", (event) => this.handleFileImport(event, "background"));
    this.refs.stickerInput.addEventListener("change", (event) => this.handleFileImport(event, "sticker"));
  }

  render() {
    this.renderer.render(this.state, this.history);
  }

  renderStageOnly() {
    this.renderer.renderStage(this.state);
    this.renderer.renderLayers(this.state);
    this.renderer.updateStageScale(this.state);
  }

  previewMutation(mutator) {
    this.store.mutate(mutator);
    this.renderStageOnly();
  }

  commitHistory(label) {
    this.history.record(this.state, label);
    this.render();
  }

  applyMutation(label, mutator) {
    this.store.mutate(mutator);
    this.history.record(this.state, label);
    this.render();
  }

  setSelection(layerId) {
    this.store.mutate((state) => {
      state.selectionId = layerId;
    });
    this.render();
  }

  clearSelection() {
    if (!this.state.selectionId) {
      return;
    }
    this.store.mutate((state) => {
      state.selectionId = null;
    });
    this.render();
  }

  seedDemo() {
    this.applyMutation("Démo de départ", (state) => {
      const demoBackground = assetManifest.backgrounds[1] || assetManifest.backgrounds[0];
      const demoSticker = assetManifest.stickers[0];
      const demoWatermark = assetManifest.watermarks[0];

      state.background.src = demoBackground?.src || null;
      state.background.name = demoBackground?.label || "Fond vide";
      state.frame.src = assetManifest.frames[0]?.src || null;
      state.frame.name = assetManifest.frames[0]?.label || "Aucun cadre";
      state.watermarks.push(
        makeWatermarkText({
          text: "PREVIEW ONLY",
          x: 448,
          y: 274
        })
      );
      state.elements.push(
        makeText({
          text: "love 4ever",
          x: 460,
          y: 690
        })
      );
      state.elements.push(
        makeSticker({
          src: demoSticker?.src,
          name: demoSticker?.label || "Sticker",
          x: 210,
          y: 620,
          width: 180,
          height: 180
        })
      );
      state.watermarks.push(
        makeWatermarkImage({
          src: demoWatermark?.src,
          x: 66,
          y: 100,
          width: 260,
          height: 96
        })
      );
      state.selectionId = state.elements[0].id;
    });
  }

  async exportPng() {
    try {
      await this.exporter.exportPng(this.state);
    } catch (error) {
      window.alert("Export impossible. Lance plutôt le projet via un petit serveur statique si le navigateur bloque les fichiers locaux.");
      console.error(error);
    }
  }

  undo() {
    const snapshot = this.history.undo();
    if (!snapshot) {
      return;
    }
    this.store.replace(snapshot);
    this.render();
  }

  redo() {
    const snapshot = this.history.redo();
    if (!snapshot) {
      return;
    }
    this.store.replace(snapshot);
    this.render();
  }

  newProject() {
    if (!window.confirm("Repartir de zéro et effacer la catastrophe en cours ?")) {
      return;
    }
    const fresh = createInitialState();
    this.store.replace(fresh);
    this.history = new HistoryManager(fresh);
    this.render();
  }

  duplicateSelection() {
    if (!this.state.selectionId) {
      return;
    }
    this.applyMutation("Dupliquer calque", (state) => {
      duplicateLayer(state, state.selectionId);
    });
  }

  deleteSelection() {
    if (!this.state.selectionId) {
      return;
    }
    this.applyMutation("Supprimer calque", (state) => {
      removeLayer(state, state.selectionId);
    });
  }

  toggleLockSelection() {
    if (!this.state.selectionId) {
      return;
    }
    this.applyMutation("Verrouiller calque", (state) => {
      const layer = getLayerById(state, state.selectionId);
      if (!layer || layer.id === "background" || layer.id === "frame") {
        return;
      }
      layer.locked = !layer.locked;
    });
  }

  moveSelection(direction) {
    if (!this.state.selectionId) {
      return;
    }
    this.applyMutation(direction > 0 ? "Monter calque" : "Descendre calque", (state) => {
      reorderLayer(state, state.selectionId, direction);
    });
  }

  addText(text = randomItem(starterTexts)) {
    this.applyMutation("Ajouter texte", (state) => {
      const layer = makeText({
        text,
        x: 450,
        y: 450
      });
      state.elements.push(layer);
      state.selectionId = layer.id;
    });
  }

  addSticker(assetId) {
    const asset = this.assetLoader.find("stickers", assetId);
    if (!asset) {
      return;
    }
    this.applyMutation("Ajouter sticker", (state) => {
      const layer = makeSticker({
        src: asset.src,
        name: asset.label,
        x: 450,
        y: 450
      });
      state.elements.push(layer);
      state.selectionId = layer.id;
    });
  }

  addWatermarkImage(assetId) {
    const asset = this.assetLoader.find("watermarks", assetId);
    if (!asset) {
      return;
    }
    this.applyMutation("Ajouter watermark image", (state) => {
      const layer = makeWatermarkImage({
        src: asset.src,
        name: asset.label,
        x: 150,
        y: 120
      });
      state.watermarks.push(layer);
      state.selectionId = layer.id;
    });
  }

  addWatermarkText(text = randomItem(watermarkTextPresets)) {
    this.applyMutation("Ajouter watermark texte", (state) => {
      const layer = makeWatermarkText({
        text
      });
      state.watermarks.push(layer);
      state.selectionId = layer.id;
    });
  }

  setBackground(assetId) {
    const asset = this.assetLoader.find("backgrounds", assetId);
    if (!asset) {
      return;
    }
    this.applyMutation("Changer le fond", (state) => {
      state.background.src = asset.src;
      state.background.name = asset.label;
      state.selectionId = "background";
    });
  }

  removeBackground() {
    this.applyMutation("Supprimer le fond", (state) => {
      state.background.src = null;
      state.background.name = "Fond vide";
      state.selectionId = "background";
    });
  }

  setFrame(assetId) {
    const asset = this.assetLoader.find("frames", assetId);
    if (!asset) {
      return;
    }
    this.applyMutation("Changer le cadre", (state) => {
      state.frame.src = asset.src;
      state.frame.name = asset.label;
      state.selectionId = "frame";
    });
  }

  removeFrame() {
    this.applyMutation("Supprimer le cadre", (state) => {
      state.frame.src = null;
      state.frame.name = "Aucun cadre";
      state.selectionId = null;
    });
  }

  worsen(level) {
    this.applyMutation(`Rendre pire ${level.toUpperCase()}`, (state) => {
      this.worsenEngine.mutate(state, level);
    });
  }

  rerunWorsen() {
    this.worsen(this.state.lastWorsenLevel || "x1");
  }

  applyCatastrophe(label) {
    const preset = catastrophePresets.find((item) => item.label === label);
    if (!preset) {
      return;
    }
    this.applyMutation(`Preset ${label}`, (state) => {
      const background = this.assetLoader.find("backgrounds", preset.backgroundId);
      const frame = this.assetLoader.find("frames", preset.frameId);
      state.background.src = background?.src || null;
      state.background.name = background?.label || "Fond vide";
      state.frame.src = frame?.src || null;
      state.frame.name = frame?.label || "Aucun cadre";
      const textLayer = makeText({ text: preset.text, x: 450, y: 670 });
      state.elements.push(textLayer);
      state.selectionId = textLayer.id;
    });
  }

  handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    const { action, id, text, preset } = button.dataset;

    if (action === "new-project") this.newProject();
    if (action === "import-background") this.refs.bgInput.click();
    if (action === "import-sticker") this.refs.stickerInput.click();
    if (action === "add-text") this.addText();
    if (action === "undo") this.undo();
    if (action === "redo") this.redo();
    if (action === "worsen-x1") this.worsen("x1");
    if (action === "worsen-x3") this.worsen("x3");
    if (action === "worsen-max") this.worsen("max");
    if (action === "rerun-worsen") this.rerunWorsen();
    if (action === "export-png") this.exportPng();
    if (action === "pick-background") this.setBackground(id);
    if (action === "add-sticker") this.addSticker(id);
    if (action === "pick-frame") this.setFrame(id);
    if (action === "add-watermark-image") this.addWatermarkImage(id);
    if (action === "add-watermark-text") this.addWatermarkText(text);
    if (action === "remove-background") this.removeBackground();
    if (action === "remove-frame") this.removeFrame();
    if (action === "duplicate-selection") this.duplicateSelection();
    if (action === "delete-selection") this.deleteSelection();
    if (action === "toggle-lock") this.toggleLockSelection();
    if (action === "move-up") this.moveSelection(1);
    if (action === "move-down") this.moveSelection(-1);
    if (action === "select-layer") this.setSelection(id);
    if (action === "apply-catastrophe") this.applyCatastrophe(preset);
  }

  handlePropertyInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.dataset.projectEffect && target.type === "range") {
      const value = Number(target.value);
      this.previewMutation((state) => {
        state.effects[target.dataset.projectEffect] = value;
      });
      return;
    }

    if (target.dataset.selectionProp && target.type === "range") {
      const value = Number(target.value);
      this.previewMutation((state) => {
        this.assignSelectionProperty(state, target.dataset.selectionProp, value);
      });
    }
  }

  handlePropertyChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.dataset.projectProp) {
      this.applyMutation("Modifier projet", (state) => {
        state.meta[target.dataset.projectProp] = target.value;
      });
      return;
    }

    if (target.dataset.projectEffect) {
      if (target instanceof HTMLInputElement && target.type === "range") {
        this.commitHistory("Ajuster filtre global");
      }
      return;
    }

    if (target.dataset.selectionProp) {
      const prop = target.dataset.selectionProp;
      if (target instanceof HTMLInputElement && target.type === "range") {
        this.commitHistory("Ajuster propriété");
        return;
      }
      const value = this.readInputValue(target);
      this.applyMutation("Ajuster propriété", (state) => {
        this.assignSelectionProperty(state, prop, value);
      });
    }
  }

  assignSelectionProperty(state, prop, value) {
    const selection = state.selectionId ? getLayerById(state, state.selectionId) : null;
    if (!selection) {
      return;
    }

    if (selection.id === "background") {
      selection[prop] = value;
      return;
    }

    if (selection.id === "frame") {
      selection[prop] = value;
      return;
    }

    selection[prop] = value;
  }

  readInputValue(target) {
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      if (target.dataset.checkedValue) {
        return target.checked ? target.dataset.checkedValue : target.dataset.uncheckedValue;
      }
      return target.checked;
    }
    if (target instanceof HTMLInputElement && (target.type === "number" || target.type === "range")) {
      return Number(target.value);
    }
    return target.value;
  }

  async handleFileImport(event, type) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    if (type === "background") {
      this.applyMutation("Importer fond local", (state) => {
        state.background.src = dataUrl;
        state.background.name = file.name;
        state.selectionId = "background";
      });
    }
    if (type === "sticker") {
      this.applyMutation("Importer sticker local", (state) => {
        const layer = makeSticker({
          src: dataUrl,
          name: file.name
        });
        state.elements.push(layer);
        state.selectionId = layer.id;
      });
    }
    event.target.value = "";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const refs = {
  loadingScreen: document.querySelector("#loading-screen"),
  assetPanel: document.querySelector("#asset-panel"),
  sceneViewport: document.querySelector("#scene-viewport"),
  sceneStage: document.querySelector("#scene-stage"),
  propertiesPanel: document.querySelector("#properties-panel"),
  layersPanel: document.querySelector("#layers-panel"),
  historyPanel: document.querySelector("#history-panel"),
  bgInput: document.querySelector("#background-input"),
  stickerInput: document.querySelector("#sticker-input")
};

const app = new JpegCoreApp(refs);
window.jpegCore = app;
app.init();
