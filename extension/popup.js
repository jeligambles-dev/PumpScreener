const apiUrlInput = document.getElementById("apiUrl");
const saveBtn = document.getElementById("saveBtn");
const status = document.getElementById("status");

// Load saved URL
chrome.storage.local.get(["apiBaseUrl"], (result) => {
  if (result.apiBaseUrl) {
    apiUrlInput.value = result.apiBaseUrl;
  }
});

saveBtn.addEventListener("click", () => {
  const url = apiUrlInput.value.trim().replace(/\/+$/, "");
  chrome.storage.local.set({ apiBaseUrl: url }, () => {
    status.style.display = "block";
    setTimeout(() => {
      status.style.display = "none";
    }, 2000);
  });
});
