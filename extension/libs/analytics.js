// ----------------------------------------------
// GA4 Measurement Protocol for Chrome Extension
// 안정 & 단일 책임 버전
// ----------------------------------------------

const GA4_MEASUREMENT_ID = "G-L1KDDBYZ0Y";
const GA4_API_SECRET = "r8gjs6eiRQ6EjOR2puAW9Q";
const GA4_ENDPOINT =
  `https://www.google-analytics.com/mp/collect?` +
  `measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

// libs/analytics.js
// non-module 버전 — 전역으로 trackEvent 제공

const GA4_DEBUG = true; // 디버그 모드: true면 debug endpoint로 전송 및 콘솔 출력

function _getClientId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["client_id"], (res) => {
      if (res.client_id) resolve(res.client_id);
      else {
        const newId = crypto.randomUUID();
        chrome.storage.local.set({ client_id: newId }, () => resolve(newId));
      }
    });
  });
}

async function _sendToGa4(measurementId, apiSecret, payload, debug = false) {
  const base = debug
    ? "https://www.google-analytics.com/debug/mp/collect"
    : "https://www.google-analytics.com/mp/collect";

  const url = `${base}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (GA4_DEBUG) console.log("[GA4] sent", { url, payload, status: resp.status });
    if (debug) {
      try {
        const data = await resp.json();
        if (GA4_DEBUG) console.log("[GA4 debug response]", data);
        return { ok: resp.ok, status: resp.status, data };
      } catch (e) {
        return { ok: resp.ok, status: resp.status };
      }
    }
    return { ok: resp.ok, status: resp.status };
  } catch (e) {
    console.error("[GA4] send failed:", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * 전역으로 호출할 trackEvent(name, params)
 * - GA 설정(Measurement ID, API Secret)은 options 페이지에서 chrome.storage.sync에 저장되어 있어야 함
 */
async function trackEvent(name, params = {}) {
  // 이제 하드코딩된 값을 직접 사용합니다.
  const measurementId = GA4_MEASUREMENT_ID;
  const apiSecret = GA4_API_SECRET;

  const clientId = await _getClientId();
  const body = {
    client_id: clientId,
    events: [
      {
        name,
        params: { ...params },
      },
    ],
  };

  // debug=true 로 먼저 보내보고 결과 확인 가능
  const res = await _sendToGa4(measurementId, apiSecret, body, /*debug=*/ GA4_DEBUG);
  return res;
}

// 전역에 노출
window.trackEvent = trackEvent;
console.log("[analytics] loaded - trackEvent available on window");
