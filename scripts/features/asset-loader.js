export class AssetLoader {
  constructor(manifest) {
    this.manifest = manifest;
    this.loadedFontStylesheets = new Set();
  }

  getManifest() {
    return this.manifest;
  }

  find(section, id) {
    return this.manifest[section]?.find((item) => item.id === id) || null;
  }

  async loadFonts() {
    const remoteFonts = this.manifest.fonts.filter((font) => font.type === "google" && font.href);
    for (const font of remoteFonts) {
      if (this.loadedFontStylesheets.has(font.href)) {
        continue;
      }
      await this.attachStylesheet(font.href);
      this.loadedFontStylesheets.add(font.href);
    }

    const customFonts = this.manifest.fonts.filter((font) => font.type === "file" && font.src);
    await Promise.all(
      customFonts.map(async (font) => {
        try {
          const fontFamily = font.fontFaceFamily || font.loadFamily || font.label;
          const fontFace = new FontFace(fontFamily, `url(${font.src})`);
          const loaded = await fontFace.load();
          document.fonts.add(loaded);
        } catch (error) {
          console.warn("Font file load skipped:", font.label, error);
        }
      })
    );

    await Promise.all(
      this.manifest.fonts
        .filter((font) => font.loadFamily)
        .map((font) =>
          document.fonts.load(`16px ${font.loadFamily}`).catch((error) => {
            console.warn("Font family preload skipped:", font.loadFamily, error);
          })
        )
    );

    await document.fonts.ready;
  }

  attachStylesheet(href) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`link[data-font-href="${href}"]`);
      if (existing) {
        resolve();
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.fontHref = href;
      link.onload = () => resolve();
      link.onerror = () => {
        console.warn("Remote font stylesheet failed:", href);
        resolve();
      };
      document.head.append(link);
    });
  }
}
