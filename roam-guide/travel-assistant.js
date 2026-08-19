/* Dify-ready client shell. Keep the Dify API key in a server-side proxy. */
(function () {
  const config = Object.assign({
    mode: "mock",
    endpoint: "/api/dify/chat",
    user: "roam-demo-user"
  }, window.ROAM_ASSISTANT_CONFIG || {});

  const state = { busy: false, conversationId: "", currentPlace: "长野 · 日本", requestId: 0, abortController: null };
  const chat = document.querySelector("#assistant-messages");
  const input = document.querySelector("#assistant-input");
  const form = document.querySelector("#assistant-form");
  const status = document.querySelector("#assistant-status");
  const briefDestination = document.querySelector("#brief-destination");
  const briefMeta = document.querySelector("#brief-meta");
  const briefNote = document.querySelector("#brief-note");
  const timeline = document.querySelector("#brief-timeline");
  const newChatButton = document.querySelector("#new-chat");
  const initialChatMarkup = chat.innerHTML;
  const initialBrief = {
    destination: briefDestination.textContent,
    meta: briefMeta.textContent,
    note: briefNote.textContent,
    timeline: timeline.innerHTML
  };

  function setStatus(text, active) {
    status.textContent = text;
    status.classList.toggle("is-active", Boolean(active));
  }

  function scrollChat() {
    chat.scrollTop = chat.scrollHeight;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cleanAssistantText(value) {
    const text = String(value || "").replace(/\r\n?/g, "\n").trim();
    if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
      return text.slice(1, -1).trim();
    }
    return text;
  }

  function renderInlineMarkdown(value) {
    let html = escapeHtml(value);
    const protectedTokens = [];
    const protect = (content) => {
      const token = `@@ROAM_TOKEN_${protectedTokens.length}@@`;
      protectedTokens.push(content);
      return token;
    };

    html = html.replace(/`([^`\n]+)`/g, (_, content) => protect(`<code>${content}</code>`));
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
    html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    html = html.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");

    protectedTokens.forEach((content, index) => {
      html = html.replace(`@@ROAM_TOKEN_${index}@@`, content);
    });
    return html;
  }

  function renderAssistantMarkdown(value) {
    const lines = cleanAssistantText(value).split("\n");
    const html = [];
    let paragraph = [];
    let listType = "";
    let listItems = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    };

    const flushList = () => {
      if (!listItems.length) return;
      html.push(`<${listType}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${listType}>`);
      listType = "";
      listItems = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);

      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }
      if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) {
        flushParagraph();
        flushList();
        html.push("<hr />");
        return;
      }
      if (heading) {
        flushParagraph();
        flushList();
        const tag = heading[1].length <= 3 ? "h3" : "h4";
        html.push(`<${tag}>${renderInlineMarkdown(heading[2])}</${tag}>`);
        return;
      }
      if (unordered || ordered) {
        flushParagraph();
        const nextType = unordered ? "ul" : "ol";
        if (listType && listType !== nextType) flushList();
        listType = nextType;
        listItems.push((unordered || ordered)[1]);
        return;
      }

      flushList();
      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();
    return html.join("") || "<p>我已经收到你的需求。</p>";
  }

  function addMessage(role, text) {
    const item = document.createElement("div");
    item.className = `assistant-message ${role}`;
    if (role === "assistant") {
      item.innerHTML = '<div class="assistant-avatar">R</div><div class="message-bubble"></div>';
    } else {
      item.innerHTML = '<div class="message-bubble"></div>';
    }
    const bubble = item.querySelector(".message-bubble");
    if (role === "assistant") {
      bubble.classList.add("assistant-rich");
      bubble.innerHTML = renderAssistantMarkdown(text);
    } else {
      bubble.textContent = text;
    }
    chat.appendChild(item);
    scrollChat();
    return item;
  }

  function addTyping() {
    const item = document.createElement("div");
    item.className = "assistant-message assistant typing-message";
    item.innerHTML = '<div class="assistant-avatar">R</div><div class="message-bubble typing"><span></span><span></span><span></span></div>';
    chat.appendChild(item);
    scrollChat();
    return item;
  }

  function resetBrief() {
    state.currentPlace = initialBrief.destination;
    briefDestination.textContent = initialBrief.destination;
    briefMeta.textContent = initialBrief.meta;
    briefNote.textContent = initialBrief.note;
    timeline.innerHTML = initialBrief.timeline;
  }

  function startNewConversation() {
    state.requestId += 1;
    state.abortController?.abort();
    state.abortController = null;
    state.busy = false;
    state.conversationId = "";
    chat.innerHTML = initialChatMarkup;
    resetBrief();
    input.value = "";
    setStatus("新对话已开启 · 等待你的旅行想法", false);
    scrollChat();
    input.focus();
  }

  function updateBrief(query) {
    const text = query.toLowerCase();
    if (text.includes("温泉") || text.includes("泡汤")) {
      state.currentPlace = "箱根 · 日本";
      briefMeta.textContent = "03 DAYS / HOT SPRING / SLOW";
      briefNote.textContent = "把节奏放慢，给身体留一晚热气。";
      timeline.innerHTML = "<li><b>01</b><span>抵达小田原 · 住进山间温泉</span></li><li><b>02</b><span>箱根神社 · 美术馆 · 怀石晚餐</span></li><li><b>03</b><span>早起泡汤 · 午后返程</span></li>";
    } else if (text.includes("海边") || text.includes("海岛") || text.includes("海岸")) {
      state.currentPlace = "舟山群岛 · 中国";
      briefMeta.textContent = "02 DAYS / COAST / EASY";
      briefNote.textContent = "海风、渔火和一段不被打扰的留白。";
      timeline.innerHTML = "<li><b>01</b><span>抵达东沙 · 海边民宿入住</span></li><li><b>02</b><span>看日出 · 吃海鲜 · 傍晚返程</span></li>";
    }
    briefDestination.textContent = state.currentPlace;
  }

  function mockReply(query) {
    const text = query.toLowerCase();
    if (text.includes("温泉") || text.includes("泡汤")) {
      return "可以。按你想放松一点的需求，我先把草案切到箱根：3 天 2 夜、温泉旅馆住 1 晚，第二天安排神社和美术馆，预算先按每人 ¥4,500—6,500 估算。右侧已经同步更新。";
    }
    if (text.includes("海边") || text.includes("海岛") || text.includes("海岸")) {
      return "收到，我把方向改成舟山群岛的两天一夜：第一天住海边，第二天看日出、吃海鲜，再留出下午返程。整体会比长途海岛更轻松，适合这个周末直接出发。";
    }
    if (text.includes("预算") || text.includes("便宜")) {
      return "我会优先压缩交通和住宿成本，保留一顿值得吃的饭。当前草案先按每人 ¥1,800—2,500 控制，住宿选交通方便的设计旅店或民宿。";
    }
    return "我先记下这个想法。你可以继续告诉我目的地、出发天数、预算或同行人，我会把它们逐步整理成一份能直接出发的旅行草案。";
  }

  function collectInputs() {
    return {
      destination: state.currentPlace,
      trip_days: "3",
      budget: "未设置",
      travel_style: "松弛、少换酒店、有一顿值得吃的饭"
    };
  }

  async function readDifyResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      const data = await response.json();
      state.conversationId = data.conversation_id || state.conversationId;
      return data.answer || data.text || data.outputs?.answer || data.outputs?.text || "我已经收到你的需求。";
    }

    let answer = "";

    function consumeEvent(event) {
      if (!event || typeof event !== "object") return;
      state.conversationId = event.conversation_id || state.conversationId;

      if (event.event === "message" || event.event === "agent_message") {
        answer += event.answer || event.text || "";
      }

      // Chatflow applications often expose the final answer on workflow_finished
      // instead of emitting a message event.
      if (event.event === "workflow_finished" && event.data?.outputs?.answer) {
        answer = event.data.outputs.answer;
      }

      if (event.event === "node_finished" && event.data?.outputs?.answer) {
        answer = event.data.outputs.answer;
      }
    }

    function consumeLine(line) {
      if (!line.startsWith("data:")) return;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") return;
      try {
        consumeEvent(JSON.parse(payload));
      } catch (error) {
        // Ignore incomplete SSE frames; the next chunk will complete them.
      }
    }

    const raw = await response.text();
    raw.split(/\r?\n/).forEach(consumeLine);

    // Keep a tolerant fallback for proxies or browser environments that normalize
    // the SSE frames before they reach the parser.
    if (!answer) {
      const matches = [...raw.matchAll(/"answer"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
      const last = matches.at(-1);
      if (last) {
        try {
          answer = JSON.parse(`"${last[1]}"`);
        } catch (error) {
          // Keep the generic acknowledgement below when the payload is malformed.
        }
      }
    }
    return answer || "我已经收到你的需求。";
  }

  async function askDify(query, signal) {
    if (config.mode === "mock") {
      await new Promise((resolve) => setTimeout(resolve, 680));
      return mockReply(query);
    }
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        query,
        inputs: collectInputs(),
        user: config.user,
        response_mode: "streaming",
        conversation_id: state.conversationId
      })
    });
    if (!response.ok) throw new Error(`Dify request failed: ${response.status}`);
    const data = await response.json();
    state.conversationId = data.conversation_id || state.conversationId;
    return data.answer || data.text || data.outputs?.answer || data.outputs?.text || "我已经收到你的需求。";
  }

  async function submit(query) {
    const text = query.trim();
    if (!text || state.busy) return;
    state.busy = true;
    const requestId = ++state.requestId;
    state.abortController = new AbortController();
    input.value = "";
    addMessage("user", text);
    const typing = addTyping();
    setStatus("ROAM GUIDE 正在整理你的想法", true);
    updateBrief(text);
    try {
      const reply = await askDify(text, state.abortController.signal);
      if (requestId !== state.requestId) return;
      typing.remove();
      addMessage("assistant", reply);
      setStatus(config.mode === "mock" ? "演示模式 · 接入 Dify 后将使用真实回答" : "DIFY CONNECTED · 已同步当前旅行草案", false);
    } catch (error) {
      if (requestId !== state.requestId || error.name === "AbortError") return;
      typing.remove();
      addMessage("assistant", "这次连接没有完成。我先保留当前草案，你可以稍后再试。" );
      setStatus("连接暂时不可用", false);
    } finally {
      if (requestId === state.requestId) {
        state.busy = false;
        state.abortController = null;
      }
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });

  document.querySelectorAll("[data-assistant-prompt]").forEach((button) => {
    button.addEventListener("click", () => submit(button.dataset.assistantPrompt));
  });

  newChatButton.addEventListener("click", startNewConversation);

  document.querySelector("#generate-plan").addEventListener("click", () => {
    submit("请基于当前旅行草案，生成一份完整的行程，包含交通、住宿、餐厅和每日预算。");
  });
})();
