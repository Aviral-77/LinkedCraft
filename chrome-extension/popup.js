// LinkedCraft Helper — popup.js

const API = "http://localhost:8000";

const noAuthSection = document.getElementById("no-auth-section");
const mainSection = document.getElementById("main-section");
const syncBtn = document.getElementById("syncBtn");
const statusBox = document.getElementById("statusBox");

// ── Init: check if we have a token from the dashboard ──
chrome.storage.local.get(["linkedcraft_token"], ({ linkedcraft_token }) => {
  if (linkedcraft_token) {
    showMain();
  } else {
    showNoAuth();
  }
});

function showNoAuth() {
  noAuthSection.style.display = "block";
  mainSection.style.display = "none";
}

function showMain() {
  noAuthSection.style.display = "none";
  mainSection.style.display = "block";
}

function setStatus(msg, type = "info") {
  statusBox.textContent = msg;
  statusBox.className = `status ${type}`;
  statusBox.style.display = "block";
}

// ── Sync Posts ──
syncBtn.addEventListener("click", async () => {
  const { linkedcraft_token } = await storageGet(["linkedcraft_token"]);

  if (!linkedcraft_token) {
    showNoAuth();
    return;
  }

  syncBtn.disabled = true;
  setStatus("Opening your LinkedIn activity page…", "loading");

  try {
    const linkedinUrl = "https://www.linkedin.com/in/me/recent-activity/all/";
    const existingTabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });

    let tab;
    if (existingTabs.length > 0) {
      tab = existingTabs[0];
      await chrome.tabs.update(tab.id, { url: linkedinUrl, active: true });
    } else {
      tab = await chrome.tabs.create({ url: linkedinUrl, active: true });
    }

    setStatus("Waiting for LinkedIn to load…", "loading");
    await waitForTabLoad(tab.id, 15000);
    await sleep(2500);

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

    setStatus("Collecting your posts…", "loading");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const posts = [];
        const seen = new Set();

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
        "No posts found. Make sure you're logged in to LinkedIn and have posts in your activity feed.",
        "error"
      );
      syncBtn.disabled = false;
      return;
    }

    setStatus(`Syncing ${posts.length} posts to LinkedCraft…`, "loading");

    const res = await fetch(`${API}/linkedin/sync-posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${linkedcraft_token}`,
      },
      body: JSON.stringify({ posts }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      // Token may have expired — clear it so user re-logs in on dashboard
      if (res.status === 401) {
        chrome.storage.local.remove("linkedcraft_token");
        showNoAuth();
        setStatus("Session expired. Please log in to LinkedCraft and try again.", "error");
        syncBtn.disabled = false;
        return;
      }
      throw new Error(err.detail || `API error ${res.status}`);
    }

    const data = await res.json();
    setStatus(
      `✓ ${data.posts_analyzed} posts synced! Voice profile updated. Go back to LinkedCraft to see results.`,
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
      resolve();
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
