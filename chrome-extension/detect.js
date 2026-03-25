// LinkedCraft Helper — detect.js
// Runs on localhost pages (the LinkedCraft dashboard).
// 1. Signals the dashboard that the extension is installed.
// 2. Passes the logged-in JWT token to the extension storage so
//    the popup can sync without the user ever entering an API key.

const token = localStorage.getItem("linkedcraft_token");

// Tell the extension about the token (save it so popup can use it)
if (token) {
  chrome.storage.local.set({ linkedcraft_token: token });
}

// Signal to the dashboard React app that the extension is ready
window.dispatchEvent(
  new CustomEvent("linkedcraft-ext-ready", { detail: { version: "1.0", hasToken: !!token } })
);

// Also listen for future token updates (login after page load)
window.addEventListener("storage", (e) => {
  if (e.key === "linkedcraft_token") {
    if (e.newValue) {
      chrome.storage.local.set({ linkedcraft_token: e.newValue });
    } else {
      chrome.storage.local.remove("linkedcraft_token");
    }
  }
});
