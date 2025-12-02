document.addEventListener("DOMContentLoaded", () => {
  const providerSelect = document.getElementById("api_provider");
  const saveBtn = document.getElementById("save-btn");
  const clearApiKeyBtn = document.getElementById("clear_api_key_btn");

  providerSelect.addEventListener("change", () => {
    const provider = providerSelect.value;
    document.getElementById("api_key").placeholder = provider === 'google' ? 'AIza...' : 'sk-...';
  });
  saveBtn.addEventListener("click", saveSettings);
  clearApiKeyBtn.addEventListener("click", clearApiKey);

  // 페이지 로드 시 자동으로 설정 불러오기
  loadSettings();
});

function showApiKeyStatus(isSaved) {
  const statusDiv = document.getElementById("api_key_status");
  const keyInput = document.getElementById("api_key");
  if (isSaved) {
    statusDiv.classList.remove("hidden");
    keyInput.classList.add("hidden");
  } else {
    statusDiv.classList.add("hidden");
    keyInput.classList.remove("hidden");
    keyInput.value = ""; // Clear input field
  }
}

function loadSettings() {
  chrome.storage.sync.get(["api_provider", "api_key"], (res) => {
    const provider = res.api_provider || "openai";
    document.getElementById("api_provider").value = provider;
    document.getElementById("api_key").placeholder = provider === 'google' ? 'AIza...' : 'sk-...';
    showApiKeyStatus(!!res.api_key);
    console.log("설정을 불러왔습니다.");
  });
}

function saveSettings() {
  const apiKeyInput = document.getElementById("api_key");
  const newApiKey = apiKeyInput.value.trim();

  const data = { api_provider: document.getElementById("api_provider").value };

  // 새 API 키가 입력된 경우에만 저장
  if (newApiKey) data.api_key = newApiKey;

  chrome.storage.sync.get("api_key", (existing) => {
    // 새 키가 없으면 기존 키를 유지
    if (!data.api_key && existing.api_key) data.api_key = existing.api_key;

    chrome.storage.sync.set(data, () => {
      alert("설정이 저장되었습니다.");
      chrome.runtime.sendMessage({ action: "settings_updated" });
      window.close();
    });
  });
}

function clearApiKey() {
  if (!confirm("저장된 API 키를 삭제하시겠습니까?")) return;
  chrome.storage.sync.remove("api_key", () => {
    showApiKeyStatus(false);
    console.log("API 키가 삭제되었습니다.");
  });
}
