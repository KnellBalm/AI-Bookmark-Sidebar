// sidepanel.js (안정화판)
// - DOMContentLoaded 보장
const providerConfig = {
  openai: {
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  google: {
    models: [
      "gemini-1.5-pro-latest",   // 최고 성능 (자동 업데이트)
      "gemini-1.5-flash-latest", // 최고 효율 (자동 업데이트)
      "gemini-pro",              // 안정 버전 (1.0)
    ],
  },
};

// - 요소 존재 체크 및 디버깅 로그
// - window.trackEvent, window.summarizeBookmarks 사용 (libs에서 전역 노출되어야 함)

console.log("[AI Bookmarker] sidepanel module loaded");

function el(id) {
  return document.getElementById(id);
}

function safeAddListener(element, event, handler, name = "") {
  if (!element) {
    console.warn(`[sidepanel] element not found for listener: ${name}`);
    return;
  }
  element.addEventListener(event, handler);
}

let currentGroupingData = null; // 그룹화 결과를 저장할 변수

function createBookmarkNode(node, isRoot = false) {
  const li = document.createElement("li");
  li.className = "bookmark-li";

  if (node.url) {
    // Leaf (bookmark)
    const wrapper = document.createElement("div");
    wrapper.className = "bookmark-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.bookmarkId = node.id;
    checkbox.dataset.url = node.url;
    checkbox.dataset.title = node.title || node.url;
    checkbox.className = "bookmark-checkbox";

    const label = document.createElement("label");
    label.textContent = node.title || node.url;
    label.className = "bookmark-label";

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    li.appendChild(wrapper);

  } else {
    // Folder (node.children)
    const folderHeader = document.createElement("div");
    folderHeader.className = "folder-header";
    folderHeader.textContent = node.title || "폴더";

    // 루트 폴더가 아니면 기본적으로 닫힌 상태로 설정
    if (!isRoot) {
      li.classList.add("collapsed");
    }

    // 폴더 클릭 시 접기/펴기 이벤트 추가
    folderHeader.addEventListener("click", (e) => {
      e.stopPropagation();
      li.classList.toggle("collapsed");
    });

    li.appendChild(folderHeader);

    if (node.children && node.children.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "folder-children";
      node.children.forEach((child) => {
        ul.appendChild(createBookmarkNode(child, false));
      });
      li.appendChild(ul);
    }
  }

  return li;
}

function renderBookmarkTree(tree) {
  const container = el("bookmark-tree");
  if (!container) {
    console.error("[sidepanel] #bookmark-tree 요소가 없습니다.");
    return;
  }
  container.innerHTML = "";

  const ul = document.createElement("ul");
  ul.className = "bookmark-root";
  tree.forEach((rootNode) => {
    ul.appendChild(createBookmarkNode(rootNode, true));
  });
  container.appendChild(ul);
}

async function loadConfigWarning() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["api_key"], ({ api_key }) => {
      const banner = el("config-warning");
      if (!banner) {
        console.warn("[sidepanel] config-warning 배너 DOM 없음");
      } else {
        if (!api_key) {
          banner.classList.remove("hidden");
          if (typeof window.trackEvent === "function") window.trackEvent("config_warning_shown");
        } else {
          banner.classList.add("hidden");
        }
      }
      resolve(!!api_key);
    });
  });
}

async function loadModelsForProvider() {
  const { api_provider } = await new Promise((resolve) =>
    chrome.storage.sync.get("api_provider", resolve)
  );
  const provider = api_provider || "openai";
  const models = providerConfig[provider]?.models || providerConfig.openai.models;

  const modelSelect = el("model-select");
  if (!modelSelect) return;

  modelSelect.innerHTML = "";
  models.forEach(modelName => {
    modelSelect.add(new Option(modelName, modelName));
  });
  // '직접 입력' 옵션 추가
  modelSelect.add(new Option("직접 입력...", "custom"));

  modelSelect.addEventListener('change', () => {
    const customInput = el('model-input-custom');
    if (modelSelect.value === 'custom') {
      customInput.classList.remove('hidden');
      customInput.focus();
    } else {
      customInput.classList.add('hidden');
    }
  });

}

async function collectSelectedBookmarks() {
  const checked = document.querySelectorAll('input.bookmark-checkbox:checked');
  const selected = [];
  checked.forEach((cb) => {
    selected.push({
      id: cb.dataset.bookmarkId,
      title: cb.dataset.title,
      url: cb.dataset.url,
    });
  });
  return selected;
}

function reloadBookmarkTree() {
  console.log("[sidepanel] reloading bookmark tree");
  const container = el("bookmark-tree");
  if (container) container.innerHTML = "<em>북마크 목록을 다시 불러옵니다...</em>";

  chrome.bookmarks.getTree((tree) => {
    renderBookmarkTree(tree);
  });
}

async function main() {
  console.log("[sidepanel] main start");

  // 트래킹 (libs에서 window.trackEvent 존재)
  try {
    if (typeof window.trackEvent === "function") {
      window.trackEvent("app_opened", { panel_source: "sidepanel", version: "0.1.0" });
    } else {
      console.warn("[sidepanel] trackEvent 함수 없음");
    }
  } catch (e) {
    console.warn("[sidepanel] trackEvent 호출 실패", e);
  }

  const hasApiKey = await loadConfigWarning();
  await loadModelsForProvider();

  // 북마크 로드
  chrome.bookmarks.getTree((tree) => {
    try {
      renderBookmarkTree(tree);

      // 통계 트래킹
      let folders = 0;
      let links = 0;
      const walk = (node) => {
        if (node.url) links += 1;
        else {
          folders += 1;
          (node.children || []).forEach(walk);
        }
      };
      tree.forEach(walk);

      if (typeof window.trackEvent === "function") {
        window.trackEvent("bookmark_tree_loaded", { folders, links, has_api_key: hasApiKey });
      }
    } catch (e) {
      console.error("[sidepanel] bookmark render 실패", e);
    }
  });

  // 버튼 바인딩 (안전하게)
  const openOptionsBtn = el("open-options-btn");
  const openOptionsFromBanner = el("open-options-from-banner");

  const openOptionsHandler = (source) => {
    try {
      const width = 420;
      const height = 380;
      // 화면의 정중앙에 팝업이 위치하도록 좌표 계산
      const left = Math.round((window.screen.width - width) / 2);
      const top = Math.round((window.screen.height - height) / 2);

      chrome.windows.create({
        url: chrome.runtime.getURL("options.html"),
        type: "popup",
        width,
        height,
        left,
        top,
      });
      if (typeof window.trackEvent === "function") {
        window.trackEvent("options_opened", { source });
      }
    } catch (e) {
      console.error("open options failed", e);
    }
  };

  safeAddListener(openOptionsBtn, "click", () => openOptionsHandler("header_button"), "open-options-btn");
  safeAddListener(openOptionsFromBanner, "click", (e) => {
    e.preventDefault();
    openOptionsHandler("warning_banner");
  }, "open-options-from-banner");

  const executeBtn = el("execute-btn");
  safeAddListener(executeBtn, "click", async () => {
    const action = el("action-select").value;
    try {
      const summaryEl = el("summary-output");
      if (summaryEl) summaryEl.textContent = "요약 요청 중...";

      const { api_key, api_model, api_provider } = await new Promise((resolve) =>
        chrome.storage.sync.get(["api_key", "api_model", "api_provider"], resolve)
      );

      if (action === "summarize") {
        await handleSummarize();
      } else if (action === "group") {
        await handleGroup();
      }

    } catch (err) {
      console.error(err);
      if (typeof window.trackEvent === "function") {
        window.trackEvent("grouping_failed", { error: String(err) });
      }
      const summaryEl = el("summary-output");
      let errorMessage = "그룹화 중 오류가 발생했습니다.\n\n" + String(err);
      const errStr = String(err).toLowerCase();
      if (errStr.includes("401")) {
        errorMessage += "\n\n(API 키가 유효한지 확인해주세요.)";
      } else if (errStr.includes("429") || errStr.includes("insufficient_quota")) {
        errorMessage += "\n\n(API 크레딧이 부족합니다. API 제공사 대시보드에서 사용량 및 결제 정보를 확인해주세요.)";
      }
      if (summaryEl) summaryEl.textContent = errorMessage;
    }
  }, "execute-btn");

  async function handleSummarize() {
    const selected = await collectSelectedBookmarks();
    if (!selected.length) {
      alert("먼저 요약할 북마크를 선택하세요.");
      return;
    }

    const summaryEl = el("summary-output");
    if (summaryEl) summaryEl.textContent = "요약 요청 중...";

    let model = el("model-select").value;
    if (model === 'custom') {
      model = el('model-input-custom').value.trim();
      if (!model) {
        throw new Error("사용할 모델 이름을 직접 입력해주세요.");
      }
    }

    if (typeof window.trackEvent === "function") {
      window.trackEvent("summary_requested", { selected_count: selected.length, model });
    }

    if (typeof window.summarizeBookmarks !== "function") {
      throw new Error("summarizeBookmarks 함수가 없습니다. libs/ai_client.js 를 확인하세요.");
    }

    const result = await window.summarizeBookmarks(selected, { model });

    if (typeof window.trackEvent === "function") {
      window.trackEvent("summary_succeeded", {
        selected_count: selected.length,
        model: model,
        result_length: result.length
      });
    }

    if (summaryEl) summaryEl.textContent = result;
  }

  async function handleGroup() {
    const selected = await collectSelectedBookmarks();
    if (selected.length < 2) {
      alert("그룹화하려면 2개 이상의 북마크를 선택하세요.");
      return;
    }

    const summaryEl = el("summary-output");
    const groupingEl = el("grouping-output");
    if (summaryEl) summaryEl.textContent = "그룹화 요청 중...";
    if (groupingEl) {
      currentGroupingData = null; // 초기화
      groupingEl.innerHTML = "";
      groupingEl.classList.add("hidden");
    }
    const groupingActionsEl = el("grouping-actions");
    if (groupingActionsEl) {
      groupingActionsEl.innerHTML = "";
      groupingActionsEl.classList.add("hidden");
    }

    let model = el("model-select").value;
    if (model === 'custom') {
      model = el('model-input-custom').value.trim();
      if (!model) {
        throw new Error("사용할 모델 이름을 직접 입력해주세요.");
      }
    }

    if (typeof window.trackEvent === "function") {
      window.trackEvent("grouping_requested", { selected_count: selected.length, model });
    }

    if (typeof window.groupBookmarks !== "function") {
      throw new Error("groupBookmarks 함수가 없습니다. libs/ai_client.js 를 확인하세요.");
    }

    const { html, data } = await window.groupBookmarks(selected, { model });
    currentGroupingData = data; // 결과 데이터 저장

    if (typeof window.trackEvent === "function") {
      window.trackEvent("grouping_succeeded", {
        selected_count: selected.length,
        model: model,
        group_count: data.length
      });
    }

    if (summaryEl) summaryEl.textContent = "그룹화 결과가 생성되었습니다.";
    
    if (groupingEl) {
      groupingEl.innerHTML = html;
      groupingEl.classList.remove("hidden");
    }

    if (groupingActionsEl && currentGroupingData && currentGroupingData.length > 0) {
      const createFolderBtn = document.createElement("button");
      createFolderBtn.id = "create-folders-btn";
      createFolderBtn.className = "primary-btn";
      createFolderBtn.textContent = "이 그룹으로 폴더 만들기";
      groupingActionsEl.appendChild(createFolderBtn);
      groupingActionsEl.classList.remove("hidden");

      // 폴더 생성 버튼에 이벤트 리스너 추가
      safeAddListener(createFolderBtn, "click", handleCreateFolders, "create-folders-btn");
    } else {
      if (groupingActionsEl) groupingActionsEl.classList.add("hidden");
    }
  }

  async function handleCreateFolders() {
    if (!currentGroupingData || currentGroupingData.length === 0) {
      alert("폴더로 만들 그룹 데이터가 없습니다.");
      return;
    }

    if (!confirm(`${currentGroupingData.length}개의 새 폴더를 만들고 선택한 북마크들을 이동하시겠습니까?`)) {
      return;
    }

    const summaryEl = el("summary-output");
    if (summaryEl) summaryEl.textContent = "북마크 폴더를 생성하고 이동하는 중...";

    try {
      // GA4 이벤트: 폴더 생성 기능 사용 (Aha! Moment)
      if (typeof window.trackEvent === "function") {
        window.trackEvent("folders_created_from_group", {
          group_count: currentGroupingData.length,
          bookmark_count: currentGroupingData.reduce((sum, group) => sum + group.bookmark_ids.length, 0)
        });
      }

      for (const group of currentGroupingData) {
        // 1. 새 폴더 생성 (기본적으로 '기타 북마크'에 생성됨)
        const newFolder = await chrome.bookmarks.create({
          title: group.group_name,
        });

        // 2. 해당 그룹의 북마크들을 새 폴더로 이동
        for (const bookmarkId of group.bookmark_ids) {
          await chrome.bookmarks.move(bookmarkId, { parentId: newFolder.id });
        }
      }

      alert("폴더 생성이 완료되었습니다. 북마크 목록을 새로고침합니다.");
      reloadBookmarkTree(); // 북마크 트리 다시 로드
      if (summaryEl) summaryEl.textContent = "폴더 생성이 완료되었습니다.";

    } catch (error) {
      console.error("폴더 생성 중 오류 발생:", error);
      alert(`오류가 발생했습니다: ${error.message}`);
    }
  }

  const copyBtn = el("copy-md-btn");
  safeAddListener(copyBtn, "click", async () => {
    try {
      const summaryEl = el("summary-output");
      const text = summaryEl ? summaryEl.textContent || "" : "";
      if (!text.trim()) {
        alert("복사할 요약 내용이 없습니다.");
        return;
      }
      await navigator.clipboard.writeText(text);
      if (typeof window.trackEvent === "function") window.trackEvent("result_copied", { length: text.length });
      alert("Markdown이 클립보드에 복사되었습니다.");
    } catch (e) {
      console.error("copy failed", e);
      alert("복사에 실패했습니다. 브라우저 권한을 확인하세요.");
    }
  }, "copy-md-btn");

  console.log("[sidepanel] main end (listeners bound)");
}

// 설정이 변경되었을 때 모델 목록을 다시 로드하기 위한 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "settings_updated") {
    loadModelsForProvider();
  }
});

// DOMContentLoaded 보장
document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log("[sidepanel] DOMContentLoaded");
    main().catch((e) => console.error("[sidepanel] main() error:", e));
  } catch (e) {
    console.error("[sidepanel] DOMContentLoaded handler error:", e);
  }
});