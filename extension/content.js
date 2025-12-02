// 향후 페이지 본문 텍스트를 활용하고 싶을 때를 위한 hook
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extract_content") {
    const text = document.body ? document.body.innerText || "" : "";
    sendResponse({ text });
  }
});
