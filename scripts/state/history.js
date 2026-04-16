import { deepClone } from "../utils/helpers.js";

export class HistoryManager {
  constructor(initialState, limit = 80) {
    this.limit = limit;
    this.entries = [{ label: "Projet neuf", snapshot: deepClone(initialState) }];
    this.index = 0;
  }

  current() {
    return deepClone(this.entries[this.index].snapshot);
  }

  record(state, label) {
    const snapshot = deepClone(state);
    const currentText = JSON.stringify(this.entries[this.index].snapshot);
    const nextText = JSON.stringify(snapshot);

    if (currentText === nextText) {
      return false;
    }

    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push({ label, snapshot });
    if (this.entries.length > this.limit) {
      this.entries.shift();
    } else {
      this.index += 1;
    }
    if (this.entries.length > this.limit) {
      this.index = this.entries.length - 1;
    }
    return true;
  }

  undo() {
    if (!this.canUndo()) {
      return null;
    }
    this.index -= 1;
    return this.current();
  }

  redo() {
    if (!this.canRedo()) {
      return null;
    }
    this.index += 1;
    return this.current();
  }

  canUndo() {
    return this.index > 0;
  }

  canRedo() {
    return this.index < this.entries.length - 1;
  }

  getTimeline() {
    return this.entries.map((entry, index) => ({
      label: entry.label,
      current: index === this.index
    }));
  }
}
