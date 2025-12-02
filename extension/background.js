chrome.action.onClicked.addListener((tab) => {
  console.log("[AI Bookmarker] Icon clicked");

  // 1. 먼저 사이드패널 활성화 + 오픈 (user gesture 유지)
  chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "sidepanel.html",
    enabled: true
  });

  chrome.sidePanel.open({ tabId: tab.id });

  // 2. 필요한 작업은 뒤에서 수행 (user gesture와 무관)
  setTimeout(() => {
    console.log("[AI Bookmarker] Side panel opened");
    // 여기서 북마크 로딩, 초기 트래킹 등 수행
  }, 50);
});
