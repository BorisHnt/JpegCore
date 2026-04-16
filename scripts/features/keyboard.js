export function installKeyboardShortcuts(app) {
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const typingField = target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable);

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        app.redo();
      } else {
        app.undo();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      app.redo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && !typingField) {
      event.preventDefault();
      app.duplicateSelection();
      return;
    }

    if (event.key === "Delete" && !typingField) {
      event.preventDefault();
      app.deleteSelection();
    }
  });
}
