// Slop Screener - Axiom.trade Integration
// Injects paid/unpaid status + banner into Axiom's token sidebar

(function () {
  "use strict";

  let injectedMint = null;
  let lastPageId = null;

  // Extract the page identifier from the URL (used to detect navigation)
  function getPageId() {
    const match = window.location.pathname.match(
      /\/meme\/([A-HJ-NP-Za-km-z1-9]{32,44})/
    );
    return match ? match[1] : null;
  }

  // Extract the REAL token mint (CA) from the page DOM
  // Reads directly from the CA: row's Solscan link
  function getMintFromPage() {
    // Find the "CA:" label, then grab the full address from the nearby Solscan link
    const spans = document.querySelectorAll("span");
    for (const s of spans) {
      if (s.textContent.trim() === "CA:") {
        // Walk up to find the container that holds both the CA label and the Solscan link
        let container = s.parentElement;
        for (let i = 0; i < 6; i++) {
          if (!container) break;
          const solLink = container.querySelector('a[href*="solscan.io/account/"]');
          if (solLink) {
            const match = solLink.href.match(/\/account\/([^/?&#]+)/);
            if (match) return match[1];
          }
          container = container.parentElement;
        }
      }
    }
    return null;
  }

  // Fetch paid status via background script (avoids mixed content block)
  async function fetchPaidStatus(mint) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "FETCH_PAID_STATUS", mint },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("[Slop Screener] Message failed:", chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            console.warn("[Slop Screener] API failed:", response?.error);
            resolve(null);
          }
        }
      );
    });
  }

  // Find a span by its exact text content
  function findSpanByText(text) {
    const spans = document.querySelectorAll("span");
    for (const s of spans) {
      if (s.textContent.trim() === text && s.children.length === 0) {
        return s;
      }
    }
    return null;
  }

  // Find Axiom's "Dex Paid" stat card by walking up from the label text
  function findDexPaidCard() {
    const label = findSpanByText("Dex Paid");
    if (!label) return null;

    // Walk up: span -> div.label-row -> div.card (the h-[55px] container)
    let el = label.parentElement;
    if (el) el = el.parentElement;
    return el;
  }

  // Find the Token Info content area
  function findTokenInfoContent() {
    const spans = document.querySelectorAll("span");
    for (const s of spans) {
      if (s.textContent.includes("Token Info") && !s.textContent.includes("{")) {
        let section = s;
        for (let i = 0; i < 8; i++) {
          section = section.parentElement;
          if (!section) break;
          const children = section.children;
          for (const child of children) {
            const cls = child.className || "";
            if (
              (cls.includes("min-h-") && cls.includes("flex-col")) ||
              (cls.includes("p-[16px]") && cls.includes("flex-col"))
            ) {
              return child;
            }
          }
        }
      }
    }
    return null;
  }

  // Create the banner element
  function createBanner(data) {
    const container = document.createElement("div");
    container.id = "slop-banner";
    container.style.cssText =
      "position:relative;width:100%;overflow:hidden;border-radius:4px;margin-bottom:8px;border:1px solid rgba(44,46,58,0.5);";

    if (data.isPaid && data.bannerUrl) {
      const img = document.createElement("img");
      img.src = data.bannerUrl;
      img.alt = (data.symbol || "Token") + " banner";
      img.style.cssText = "width:100%;height:80px;object-fit:cover;display:block;";
      img.onerror = function () {
        container.innerHTML = "";
        const ph = document.createElement("div");
        ph.style.cssText =
          "width:100%;height:80px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(44,46,58,0.3),rgba(29,29,37,0.8));";
        ph.innerHTML =
          '<span style="font-size:13px;font-weight:600;color:rgb(242,84,97);">NOT PAID</span>';
        container.appendChild(ph);
      };
      container.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.style.cssText =
        "width:100%;height:80px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(44,46,58,0.3),rgba(29,29,37,0.8));";
      ph.innerHTML =
        '<span style="font-size:13px;font-weight:600;color:rgb(242,84,97);">NOT PAID</span>';
      container.appendChild(ph);
    }

    return container;
  }

  // Update Axiom's existing Dex Paid card in-place
  function updateDexPaidCard(card, data) {
    if (!card) return;

    const valueRow = card.querySelector("div");
    if (!valueRow) return;

    const valueSpan = valueRow.querySelector('span[class*="text-[14px]"]');
    const icon = valueRow.querySelector("i");

    if (data.isPaid) {
      if (valueRow.className) {
        valueRow.className = valueRow.className
          .replace("text-primaryRed", "text-primaryGreen")
          .replace("text-textSecondary", "text-primaryGreen");
      }
      if (valueSpan) valueSpan.textContent = data.symbol || "Paid";
      if (icon) icon.style.color = "rgb(var(--primary-green))";
    } else {
      if (valueRow.className) {
        valueRow.className = valueRow.className
          .replace("text-primaryGreen", "text-primaryRed")
          .replace("text-textSecondary", "text-primaryRed");
      }
      if (valueSpan) valueSpan.textContent = "Unpaid";
    }

    card.id = "slop-dex-paid";
  }

  // Cleanup previous injections
  function cleanup() {
    const b = document.getElementById("slop-banner");
    if (b) b.remove();
    const c = document.getElementById("slop-dex-paid");
    if (c) c.removeAttribute("id");
  }

  // Main injection logic
  async function checkAndInject() {
    const pageId = getPageId();
    if (!pageId) return;

    // Get the real mint from the page DOM
    const mint = getMintFromPage();
    if (!mint) {
      console.warn("[Slop Screener] Could not find CA on page");
      return;
    }

    if (mint === injectedMint) return;

    console.log("[Slop Screener] Found CA:", mint);

    cleanup();

    const data = await fetchPaidStatus(mint);
    if (!data) {
      console.warn("[Slop Screener] No data returned for", mint);
      return;
    }

    // Verify still on same page
    if (getPageId() !== pageId) return;

    console.log("[Slop Screener] Got data for", mint, data);

    // 1. Update the Dex Paid card
    const card = findDexPaidCard();
    if (card) {
      updateDexPaidCard(card, data);
      console.log("[Slop Screener] Updated Dex Paid card");
    } else {
      console.warn("[Slop Screener] Could not find Dex Paid card");
    }

    // 2. Inject banner into Token Info content area
    const contentArea = findTokenInfoContent();
    if (contentArea) {
      const banner = createBanner(data);
      contentArea.insertBefore(banner, contentArea.firstChild);
      console.log("[Slop Screener] Injected banner");
    } else {
      console.warn("[Slop Screener] Could not find Token Info content area");
    }

    injectedMint = mint;
  }

  // Observe DOM + URL changes
  let currentUrl = window.location.href;
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      injectedMint = null;
    }

    const pageId = getPageId();
    if (pageId && injectedMint === null) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const dexPaid = findSpanByText("Dex Paid");
        const ca = getMintFromPage();
        if (dexPaid && ca) {
          checkAndInject();
        }
      }, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial check with retries
  let retries = 0;
  function initialCheck() {
    const pageId = getPageId();
    if (!pageId) return;

    const dexPaid = findSpanByText("Dex Paid");
    const ca = getMintFromPage();
    if (dexPaid && ca) {
      checkAndInject();
    } else if (retries < 15) {
      retries++;
      setTimeout(initialCheck, 1000);
    }
  }
  setTimeout(initialCheck, 1500);
})();
