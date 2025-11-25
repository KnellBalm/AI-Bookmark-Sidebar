const SERVER = "http://192.168.101.224:18182";

const treeBox = document.getElementById("bookmarkTree");
const selectedBox = document.getElementById("selectedBox");
const summaryBox = document.getElementById("summaryBox");

const btnIngest = document.getElementById("btnIngest");
const btnSummary = document.getElementById("btnSummary");

let selected = new Map(); // url → title

function renderNode(node, indent = 0) {
  const div = document.createElement("div");
  div.style.marginLeft = indent + "px";

  if (!node.url) {
    const f = document.createElement("div");
    f.className = "folder";
    f.textContent = "📁 " + (node.title || "(폴더)");
    f.addEventListener("click", () => {
      div.isCollapsed = !div.isCollapsed;
      childrenBox.style.display = div.isCollapsed ? "none" : "block";
    });
    div.appendChild(f);

    const childrenBox = document.createElement("div");
    if (node.children) {
      node.children.forEach(c => childrenBox.appendChild(renderNode(c, indent + 16)));
    }
    div.appendChild(childrenBox);

  } else {
    const wrap = document.createElement("div");
    wrap.className = "item";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.addEventListener("change", () => {
      if (cb.checked) selected.set(node.url, node.title);
      else selected.delete(node.url);
      updateSelectedBox();
    });
    wrap.appendChild(cb);

    const label = document.createElement("span");
    label.textContent = node.title || node.url;
    label.style.marginLeft = "6px";
    wrap.appendChild(label);
    div.appendChild(wrap);
  }

  return div;
}

function updateSelectedBox() {
  selectedBox.innerHTML = "";
  [...selected.entries()].forEach(([url, title]) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = title;
    selectedBox.appendChild(tag);
  });
}

// 북마크 불러오기
chrome.bookmarks.getTree(nodes => {
  nodes.forEach(n => treeBox.appendChild(renderNode(n)));
});

// Ingest 버튼
btnIngest.addEventListener("click", async () => {
  summaryBox.textContent = "";
  if (selected.size === 0) return alert("선택된 북마크가 없습니다.");

  for (const [url, title] of selected.entries()) {
    const res = await fetch(`${SERVER}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!res.ok) continue;
  }

  alert("Ingest 완료");
});

// 요약 생성 버튼
btnSummary.addEventListener("click", async () => {
  summaryBox.textContent = "요약 생성 중...\n";
  if (selected.size === 0) return alert("선택된 북마크가 없습니다.");

  let collected = [];

  // ① 각 문서를 요약
  for (const [url] of selected.entries()) {
    try {
      const resIngest = await fetch(`${SERVER}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: url, limit: 1 })
      });
      const result = await resIngest.json();
      const id = result.results?.[0]?.id;
      if (!id) continue;

      const resSum = await fetch(`${SERVER}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      const data = await resSum.json();
      collected.push(data.summary);
    } catch {}
  }

  if (collected.length === 0) {
    summaryBox.textContent = "요약할 내용이 없습니다.";
    return;
  }

  // ② 최종 요약(요약들의 요약)
  const superPrompt = collected.join("\n\n---\n\n");
  const final = await fetch(`${SERVER}/summarize`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ id: null, text: superPrompt })
  }).then(r => r.json()).catch(() => null);

  summaryBox.textContent = final?.summary || collected.join("\n\n");
});
