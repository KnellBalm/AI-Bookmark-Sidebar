// libs/gpt_client.js
// OpenAI API 호출을 담당하는 클라이언트

console.log("[gpt_client] loaded");

async function _callOpenAI(apiKey, model, messages) {
  if (!apiKey) {
    throw new Error("OpenAI API Key가 설정되지 않았습니다. 옵션 페이지에서 설정해주세요.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: messages,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function summarizeBookmarks(bookmarks, options = {}) {
  const { model } = options;

  const { openai_api_key } = await new Promise((resolve) =>
    chrome.storage.sync.get("openai_api_key", resolve)
  );

  const bookmarkList = bookmarks
    .map((bm) => `- ${bm.title} (ID: ${bm.id})`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant that summarizes a list of bookmarks into a concise Markdown format.",
    },
    {
      role: "user",
      content: `다음 북마크 목록을 전체적으로 요약해줘. 각 항목을 간단히 언급하고, 전체적인 주제나 목적을 한두 문장으로 요약해줘. 결과는 Markdown 형식으로 작성해줘.\n\n${bookmarkList}`,
    },
  ];

  return _callOpenAI(openai_api_key, model, messages);
}

async function groupBookmarks(bookmarks, options = {}) {
  const { model } = options;
  const { openai_api_key } = await new Promise((resolve) =>
    chrome.storage.sync.get("openai_api_key", resolve)
  );

  const bookmarkList = bookmarks
    .map((bm) => `{"id": "${bm.id}", "title": "${bm.title.replace(/"/g, "'")}"}`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content: `You are an expert at categorizing bookmarks. Group the given list of bookmarks based on their titles. Respond with a single JSON object. The JSON should have a key "groups", which is an array of group objects. Each group object must have a "group_name" (string) and a "bookmark_ids" (array of strings). Do not include any text outside of the JSON object.`,
    },
    {
      role: "user",
      content: `다음 북마크 목록을 내용의 유사성에 따라 그룹화하고, 결과를 지정된 JSON 형식으로만 응답해줘:\n\n${bookmarkList}`,
    },
  ];

  const rawResult = await _callOpenAI(openai_api_key, model, messages);

  // AI가 반환한 텍스트에서 JSON만 추출
  const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI 응답에서 유효한 JSON을 찾을 수 없습니다.");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const groups = parsed.groups || [];

  // 결과를 HTML로 변환
  let html = "";
  if (groups.length > 0) {
    groups.forEach(group => {
      html += `<h3>${group.group_name}</h3><ul>`;
      group.bookmark_ids.forEach(id => {
        const bookmark = bookmarks.find(bm => bm.id === id);
        if (bookmark) {
          html += `<li>${bookmark.title}</li>`;
        }
      });
      html += `</ul>`;
    });
  } else {
    html = "<p>적절한 그룹을 찾지 못했습니다.</p>";
  }

  return { html, data: groups };
}

// 전역 함수로 노출
window.summarizeBookmarks = summarizeBookmarks;
window.groupBookmarks = groupBookmarks;