/* ============================================================
   留言板脚本
   - 已配置 Supabase（js/config.js）：读写云端数据库，并实时接收新留言
   - 未配置 Supabase：本地兜底，用浏览器本地存储保存/读取留言
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = window.SITE_CONFIG || {};

  var form = document.getElementById("guestbookForm");
  if (!form) return; // 页面没有留言板时不执行

  var nameInput = document.getElementById("gbName");
  var contentInput = document.getElementById("gbContent");
  var emailInput = document.getElementById("gbEmail");
  var countEl = document.getElementById("gbCount");
  var tipEl = document.getElementById("gbTip");
  var messagesEl = document.getElementById("gbMessages");
  var totalEl = document.getElementById("gbTotal");
  var submitBtn = document.getElementById("gbSubmit");

  var DEMO_KEY = "guestbook_demo_messages_v1";

  /* ---------- 工具函数 ---------- */
  function isoAgo(days, hours) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(d.getHours() - (hours || 0));
    return d.toISOString();
  }

  function formatTime(iso) {
    if (!iso) return "";
    var t = new Date(iso);
    if (isNaN(t.getTime())) return "";
    var diff = (Date.now() - t.getTime()) / 1000;
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + " 天前";
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
  }

  function showTip(text, isError) {
    if (!tipEl) return;
    tipEl.textContent = text;
    tipEl.className = "form-tip" + (isError ? " error" : " ok");
  }

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? "发布中…" : "发布留言";
  }

  function markInvalid(el, invalid) {
    if (el) el.classList.toggle("invalid", invalid);
  }

  function updateTotal(n) {
    if (totalEl) totalEl.textContent = "共 " + n + " 条";
  }

  function setState(text) {
    if (!messagesEl) return;
    messagesEl.innerHTML = "";
    var div = document.createElement("div");
    div.className = "gb-state";
    div.textContent = text;
    messagesEl.appendChild(div);
  }

  /* ---------- 模式判断：云端 / 演示 ---------- */
  var usingCloud = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) &&
    typeof window.supabase !== "undefined";
  var client = null;
  if (usingCloud) {
    try {
      client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } catch (e) {
      client = null;
    }
  }
  usingCloud = !!client;


  /* ---------- 本地兜底：浏览器存储 + 测试数据 ---------- */
  function getLocalList() {
    try {
      var raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 忽略存储异常 */ }
    var seed = [
      { id: 1, name: "路过的小明", content: "第一次来，网站做得很清爽，留言板也安排上了 👍", email: "", created_at: isoAgo(3, 2) },
      { id: 2, name: "前端同学", content: "博主加油！期待分享更多项目～", email: "", created_at: isoAgo(1, 4) },
      { id: 3, name: "测试用户", content: "这是本地兜底的测试数据，正式留言保存在云端数据库。", email: "", created_at: isoAgo(0, 2) }
    ];
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(seed)); } catch (e) { /* 忽略存储异常 */ }
    return seed;
  }

  function saveLocalList(list) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); } catch (e) { /* 忽略存储异常 */ }
  }

  /* ---------- 渲染留言 ---------- */
  function buildMessage(msg) {
    var item = document.createElement("div");
    item.className = "gb-msg";
    if (msg.id != null) item.setAttribute("data-id", msg.id);

    var avatar = document.createElement("div");
    avatar.className = "gb-avatar";
    var nameText = String(msg.name || "匿名").trim() || "匿名";
    avatar.textContent = Array.from(nameText)[0] || "匿";

    var body = document.createElement("div");
    body.className = "gb-msg-body";

    var meta = document.createElement("div");
    meta.className = "gb-msg-meta";
    var nameEl = document.createElement("span");
    nameEl.className = "gb-name";
    nameEl.textContent = nameText;
    var timeEl = document.createElement("time");
    timeEl.className = "gb-time";
    timeEl.textContent = formatTime(msg.created_at);
    meta.appendChild(nameEl);
    meta.appendChild(timeEl);

    var textEl = document.createElement("p");
    textEl.className = "gb-text";
    textEl.textContent = msg.content || "";

    body.appendChild(meta);
    body.appendChild(textEl);
    item.appendChild(avatar);
    item.appendChild(body);
    return item;
  }

  function renderList(list) {
    if (!messagesEl) return;
    messagesEl.innerHTML = "";
    // 按时间倒序（新留言在前）
    var arr = (list || []).slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    if (!arr.length) {
      setState("还没有留言，来抢沙发吧～");
      updateTotal(0);
      return;
    }
    arr.forEach(function (msg) {
      messagesEl.appendChild(buildMessage(msg));
    });
    updateTotal(arr.length);
  }

  function prependMessage(msg) {
    if (!messagesEl || !msg) return;
    if (msg.id != null && messagesEl.querySelector('[data-id="' + msg.id + '"]')) return;
    var state = messagesEl.querySelector(".gb-state");
    if (state) messagesEl.innerHTML = "";
    var item = buildMessage(msg);
    messagesEl.insertBefore(item, messagesEl.firstChild);
    updateTotal(messagesEl.querySelectorAll(".gb-msg").length);
  }

  /* ---------- 读取留言 ---------- */
  function loadMessages() {
    setState("留言加载中…");
    if (usingCloud) {
      client
        .from("messages")
        .select("id, name, content, email, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
        .then(function (res) {
          if (res.error) {
            console.error("留言加载失败:", res.error);
            setState("云端留言加载失败，请稍后刷新重试。");
            return;
          }
          renderList(res.data || []);
        })
        .catch(function (err) {
          console.error("留言加载失败:", err);
          setState("云端留言加载失败，请稍后刷新重试。");
        });
    } else {
      renderList(getLocalList());
    }
  }

  /* ---------- 实时接收新留言（仅云端模式） ---------- */
  function subscribeRealtime() {
    if (!usingCloud) return;
    client
      .channel("guestbook-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, function (payload) {
        if (payload.new) prependMessage(payload.new);
      })
      .subscribe();
  }

  /* ---------- 表单校验 ---------- */
  function validate() {
    var ok = true;
    if (!nameInput.value.trim()) { markInvalid(nameInput, true); ok = false; } else { markInvalid(nameInput, false); }
    if (!contentInput.value.trim()) { markInvalid(contentInput, true); ok = false; } else { markInvalid(contentInput, false); }
    var email = emailInput.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markInvalid(emailInput, true); ok = false; } else { markInvalid(emailInput, false); }
    if (!ok) showTip("请检查：昵称和留言内容不能为空，邮箱格式需正确。", true);
    return ok;
  }

  function resetForm() {
    form.reset();
    if (countEl) countEl.textContent = "0";
    markInvalid(nameInput, false);
    markInvalid(contentInput, false);
    markInvalid(emailInput, false);
  }

  /* ---------- 发布留言 ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    var payload = {
      name: nameInput.value.trim(),
      content: contentInput.value.trim(),
      email: emailInput.value.trim() || null
    };
    setBusy(true);
    showTip("正在发布…", false);

    if (usingCloud) {
      client
        .from("messages")
        .insert(payload)
        .select()
        .then(function (res) {
          setBusy(false);
          if (res.error) {
            console.error("留言发布失败:", res.error);
            showTip("发布失败：" + (res.error.message || "请稍后重试"), true);
            return;
          }
          var row = res.data && res.data[0];
          if (row) prependMessage(row);
          resetForm();
          showTip("留言发布成功，已保存到云端 🎉", false);
        })
        .catch(function (err) {
          setBusy(false);
          console.error("留言发布失败:", err);
          showTip("发布失败：网络异常，请稍后重试", true);
        });
    } else {
      var list = getLocalList();
      var msg = {
        id: Date.now(),
        name: payload.name,
        content: payload.content,
        email: payload.email || "",
        created_at: new Date().toISOString()
      };
      list.unshift(msg);
      saveLocalList(list);
      prependMessage(msg);
      setBusy(false);
      resetForm();
      showTip("留言发布成功 🎉", false);
    }
  });

  /* ---------- 字数统计 ---------- */
  if (contentInput && countEl) {
    contentInput.addEventListener("input", function () {
      countEl.textContent = String(contentInput.value.length);
    });
  }

  /* ---------- 初始化 ---------- */
  loadMessages();
  subscribeRealtime();
})();