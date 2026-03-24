// LinkedCraft Helper — detect.js
// Runs on localhost pages (the LinkedCraft dashboard) to signal the extension is installed.

window.dispatchEvent(
  new CustomEvent("linkedcraft-ext-ready", { detail: { version: "1.0" } })
);
