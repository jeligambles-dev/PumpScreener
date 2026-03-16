// Background service worker - handles API fetches to avoid mixed content issues

const DEFAULT_API = "http://localhost:3000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "FETCH_PAID_STATUS") return;

  (async () => {
    try {
      const storage = await chrome.storage.local.get(["apiBaseUrl"]);
      const baseUrl = storage.apiBaseUrl || DEFAULT_API;
      const url = `${baseUrl}/api/paid-status?mint=${encodeURIComponent(message.mint)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sendResponse({ success: true, data });
    } catch (err) {
      console.warn("[Slop Screener BG] Fetch failed:", err.message);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});
