export class AssetLoader {
  constructor(manifest) {
    this.manifest = manifest;
  }

  getManifest() {
    return this.manifest;
  }

  find(section, id) {
    return this.manifest[section]?.find((item) => item.id === id) || null;
  }

  async loadFonts() {
    const customFonts = this.manifest.fonts.filter((font) => font.type === "file" && font.src);
    await Promise.all(
      customFonts.map(async (font) => {
        const fontFace = new FontFace(font.label, `url(${font.src})`);
        const loaded = await fontFace.load();
        document.fonts.add(loaded);
      })
    );
  }
}
