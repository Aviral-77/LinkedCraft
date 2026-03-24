// LinkedCraft Helper — popup.js

const API = "http://localhost:8000";

const setupSection = document.getElementById("setup-section");
const mainSection = document.getElementById("main-section");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const syncBtn = document.getElementById("syncBtn");
const changeKeyBtn = document.getElementById("changeKeyBtn");
const statusBox = document.getElementById("statusBox");

// ── Init ──
chrome.storage.local.get(["apiKey"], ({ apiKey }) => {
  if (apiKey) showMain();
  else showSetup();
});

function showSetup() {
  setupSection.style.display = "block";
  mainSection.style.display = "none";
}

function showMain() {
  setupSection.style.display = "none";
  mainSection.style.display = "block";
}

function setStatus(msg, type = "info") {
  statusBox.textContent = msg;
  statusBox.className = `status ${type}`;
}

function clearStatus() {
  statusBox.className = "status";
  statusBox.textContent = "";
}

// ── Save API key ──
saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  chrome.storage.local.set({ apiKey: key }, showMain);
});

apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveKeyBtn.click();
});

// ── Change key ──
changeKeyBtn.addEventListener("click", () => {
  chrome.storage.local.remove(["apiKey"], () => {
    apiKeyInput.value = "";
    clearStatus();
    showSetup();
  });
});

// ── Sync Posts ──
syncBtn.addEventListener("click", async () => {
  const { apiKey } = await storageGet(["apiKey"]);
  if (!apiKey) {
    showSetup();
    return;
  }

  syncBtn.disabled = true;
  setStatus("Opening your LinkedIn activity page…", "loading");

  try {
    // Open (or reuse) a LinkedIn tab pointing at the user's activity
    const linkedinUrl = "https://www.linkedin.com/in/me/recent-activity/all/";
    const existingTabs = await chrome.tabs.query({
      url: "https://www.linkedin.com/*",
    });

    let tab;
    if (existingTabs.length > 0) {
      tab = existingTabs[0];
      await chrome.tabs.update(tab.id, { url: linkedinUrl, active: true });
    } else {
      tab = await chrome.tabs.create({ url: linkedinUrl, active: true });
    }

    // Wait for LinkedIn to load
    setStatus("Waiting for LinkedIn to load…", "loading");
    await waitForTabLoad(tab.id, 15000);
    await sleep(2500);

    // Scroll down to load more posts
    setStatus("Scrolling through your posts…", "loading");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        for (let i = 0; i < 7; i++) {
          window.scrollBy(0, 900);
          await new Promise((r) => setTimeout(r, 900));
        }
      },
    });
    await sleep(1500);

    // ── Scrape posts ──
    setStatus("Collecting your posts…", "loading");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const posts = [];
        const seen = new Set();

        // Multiple selectors to handle LinkedIn's evolving DOM
        const selectors = [
          '.update-components-text span[dir="ltr"]',
          '.feed-shared-update-v2 .feed-shared-text span[dir="ltr"]',
          ".update-components-text .break-words",
          '[data-urn] .update-components-text span',
          '.feed-shared-text span[dir="ltr"]',
          ".update-components-text",
        ];

        for (const sel of selectors) {
          document.querySelectorAll(sel).forEach((el) => {
            const text = el.innerText?.trim();
            // Filter: must look like a real post (not a UI label or short snippet)
            if (text && text.length > 60 && text.length < 12000) {
              const key = text.substring(0, 120);
              if (!seen.has(key)) {
                seen.add(key);
                posts.push(text);
              }
            }
          });
          if (posts.length >= 5) break;
        }

        return posts.slice(0, 50);
      },
    });

    const posts = results[0]?.result || [];

    if (posts.length === 0) {
      setStatus(
        "No posts found. Make sure you're logged in to LinkedIn and have posts visible in your activity feed.",
        "error"
      );
      syncBtn.disabled = false;
      return;
    }

    // ── POST to LinkedCraft API ──
    setStatus(`Syncing ${posts.length} posts to LinkedCraft…`, "loading");

    const res = await fetch(`${API}/linkedin/sync-posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({ posts }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail || `API error ${res.status}`);
    }

    const data = await res.json();
    setStatus(
      `✓ ${data.posts_analyzed} posts synced! Voice profile updated. Return to LinkedCraft to see results.`,
      "success"
    );
  } catch (e) {
    setStatus(`Error: ${e.message}`, "error");
  }

  syncBtn.disabled = false;
});

// ── Helpers ──

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabLoad(tabId, timeout = 12000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(); // Resolve anyway so we don't hang forever
    }, timeout);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || tab?.status === "complete") {
        clearTimeout(timer);
        resolve();
        return;
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}
