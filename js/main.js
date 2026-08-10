/* ============================================================
   仲子龙 · 个人主页 交互脚本（方向B · 暗色开发者）
   ============================================================ */
(function () {
  "use strict";

  var toTop = document.getElementById("toTop");
  var typedEl = document.getElementById("typedText");

  /* ---------- 滚动状态（rAF 节流，滚动事件只合并到每帧处理一次） ---------- */
  var scrollPending = false;
  function onScroll() {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(function () {
      scrollPending = false;
      if (toTop) {
        toTop.classList.toggle("show", window.scrollY > 500);
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0;
        document.documentElement.style.setProperty("--progress", pct + "%");
      }
      highlightNav();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 高亮当前区块 ---------- */
  var sections = document.querySelectorAll("section[id]");
  var navLinks = document.querySelectorAll(".sb-link");
  function highlightNav() {
    var pos = window.scrollY + 120;
    var currentId = "";
    sections.forEach(function (sec) {
      if (sec.offsetTop <= pos) currentId = sec.id;
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + currentId);
    });
  }

  /* ---------- 打字机效果 ---------- */
  var roles = ["自动化工程师", "Java / Python 开发者", "热衷钻研与创造的年轻人"];
  if (typedEl) {
    var roleIdx = 0, charIdx = 0, deleting = false, timer = null;
    function tick() {
      var word = roles[roleIdx];
      typedEl.textContent = word.slice(0, charIdx);
      if (!deleting) {
        if (charIdx < word.length) { charIdx++; timer = setTimeout(tick, 90); }
        else { deleting = true; timer = setTimeout(tick, 1800); }
      } else {
        if (charIdx > 0) { charIdx--; timer = setTimeout(tick, 40); }
        else { deleting = false; roleIdx = (roleIdx + 1) % roles.length; timer = setTimeout(tick, 350); }
      }
    }
    tick();
  }

  /* ---------- 滚动入场动画 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  var prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!prefersReduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- 项目折叠展开（默认收起） ---------- */
  var projectsList = document.querySelector(".projects-list");
  if (projectsList) {
    projectsList.addEventListener("click", function (e) {
      var toggle = e.target.closest(".project-toggle");
      if (!toggle) return;
      var item = toggle.closest(".project-item");
      if (!item) return;
      var open = item.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- 侧边栏收起 ---------- */
  var sbCollapse = document.getElementById("sbCollapse");
  if (sbCollapse) {
    function applyCollapsed(collapsed) {
      document.body.classList.toggle("sb-collapsed", collapsed);
      sbCollapse.innerHTML = collapsed
        ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>'
        : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
      sbCollapse.setAttribute("aria-expanded", String(!collapsed));
    }
    sbCollapse.addEventListener("click", function () {
      var collapsed = document.body.classList.toggle("sb-collapsed");
      applyCollapsed(collapsed);
      try { localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0"); } catch (e) {}
    });
    try {
      if (localStorage.getItem("sidebar_collapsed") === "1") applyCollapsed(true);
    } catch (e) {}
  }

  /* ---------- 移动端顶部导航：默认折叠 + 状态冻结 ---------- */
  var sbToggle = document.getElementById("sbToggle");
  if (sbToggle) {
    var HAM_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    var X_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    function applyMobileNav(open) {
      document.body.classList.toggle("sb-mobile-open", open);
      sbToggle.innerHTML = open ? X_ICON : HAM_ICON;
      sbToggle.setAttribute("aria-expanded", String(open));
      sbToggle.setAttribute("aria-label", open ? "收起导航" : "展开导航");
    }
    sbToggle.addEventListener("click", function () {
      var open = !document.body.classList.contains("sb-mobile-open");
      applyMobileNav(open);
      try { localStorage.setItem("mobile_nav_open", open ? "1" : "0"); } catch (e) {}
    });
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (document.body.classList.contains("sb-mobile-open")) {
          applyMobileNav(false);
          try { localStorage.setItem("mobile_nav_open", "0"); } catch (e) {}
        }
      });
    });
    var savedMobile;
    try { savedMobile = localStorage.getItem("mobile_nav_open"); } catch (e) {}
    if (savedMobile === "1") applyMobileNav(true);
  }

  /* ---------- 侧栏锚点兜底：确保导航点击一定能定位目标 ---------- */
  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      var target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - 30;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      try { history.replaceState(null, "", href); } catch (err) {}
    });
  });

  /* ---------- 回到顶部 ---------- */
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 页脚年份 ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  onScroll();
})();


/* ---------- 星海背景 v5：视口固定画布 + 文档坐标星星（严格参考「方向A-深空星海」）
   画布由 CSS 固定铺满整个视口（尺寸与视口永远一致，不会出现排版/覆盖问题）；
   星星与流星使用整页文档坐标生成与推进，绘制时按当前滚动偏移换算，
   因此无论页面多长、滚动到哪，星空背景始终完整铺满、跟随页面滚动。 */
(function () {
  "use strict";

  var prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.createElement("canvas");
  canvas.className = "star-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  /* 流星独立画布：滚动时星空冻结，流星仍可继续运动 */
  var mcanvas = document.createElement("canvas");
  mcanvas.className = "meteor-bg";
  mcanvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(mcanvas);
  var mctx = mcanvas.getContext("2d");

  var W = 0, VW = 0, VH = 0, docH = 0, DPR = 1;
  var scrollX = 0, scrollY = 0, lastCX = -9999, lastCY = -9999;
  var stars = [], meteors = [];
  var running = true, nextMeteorAt = 2.5;
  var scrolling = false, scrollStopTimer = null;
  var mouse = { x: -9999, y: -9999 };

  function rand(min, max) { return min + Math.random() * (max - min); }

  /* 星空固定视口：每屏约 130 颗（1080p 基准），密度随面积缩放 */
  function targetCount() {
    return Math.max(60, Math.min(400, Math.round((W * VH) / 16000)));
  }

  /* ---- 参考版星星结构：整页文档坐标 ---- */
  function makeStar() {
    return {
      x: Math.random() * W,
      y: Math.random() * VH,
      r: Math.random() * 1.4 + 0.3,
      tw: Math.random() * Math.PI * 2,
      sp: 0.008 + Math.random() * 0.02,
      vy: 0.02 + Math.random() * 0.06,
      a: 0.75
    };
  }

  function buildStars() {
    var n = targetCount();
    stars = [];
    for (var i = 0; i < n; i++) stars.push(makeStar());
  }

  function syncScroll() {
    scrollX = window.scrollX || 0;
    scrollY = window.scrollY || 0;
  }

  function syncDocHeight() {
    var h = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      VH
    );
    if (h === docH) return;
    docH = h;
    /* 文档变长只补星、变短则重建，保证整页密度一致 */
    var n = targetCount();
    if (stars.length < n) {
      while (stars.length < n) stars.push(makeStar());
    } else if (stars.length > n) {
      stars.length = n;
    }
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = canvas.clientWidth || window.innerWidth;
    VW = document.documentElement.clientWidth || window.innerWidth;
    VH = document.documentElement.clientHeight || window.innerHeight;
    docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      VH
    );
    /* 缓冲 = 视口 × DPR；画布本身由 CSS 固定铺满视口 */
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(VH * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    mcanvas.width = Math.round(W * DPR);
    mcanvas.height = Math.round(VH * DPR);
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    syncScroll();
    buildStars();
  }

  function spawnMeteor() {
    var vx = rand(5.5, 9), vy = rand(2.8, 4.6);
    var x = rand(VW * 0.05, VW * 0.6);
    var y = rand(VH * 0.02, VH * 0.28);
    meteors.push({
      x: x, y: y, vx: vx, vy: vy,
      life: 0, len: rand(40, 80),
      appear: rand(32, 46)
    });
  }

  /* ---- 星星：固定视口的星空（不随页面滚动），闪烁 + 缓慢下落回卷 + 鼠标推开
     滚动中整块画布冻结，停止滚动后动画自动恢复，滚动零开销 ---- */
  var STAR_STYLES = [];
  for (var si = 0; si <= 40; si++) {
    STAR_STYLES.push("rgba(220,235,255," + (si / 40).toFixed(3) + ")");
  }
  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!scrolling) {
        s.y += s.vy;
        if (s.y > VH + 4) { s.y = -4; s.x = Math.random() * W; }
        s.tw += s.sp;
        s.a = 0.35 + 0.65 * Math.abs(Math.sin(s.tw));
        var dx = s.x - mouse.x, dy = s.y - mouse.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120 && d > 0.001) {
          var f = (120 - d) / 120;
          s.x += (dx / d) * f * 1.0;
          s.y += (dy / d) * f * 1.0;
        }
      }
      var ai = (s.a * 40) | 0;
      if (ai > 40) ai = 40;
      ctx.fillStyle = STAR_STYLES[ai];
      if (s.r < 1.2) {
        var sz = s.r * 1.7;
        ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---- 流星：柔和淡入，完整飞出可视界面后自然消失（独立画布，滚动时持续运动） ---- */
  function drawMeteors(time) {
    if (time > nextMeteorAt && meteors.length < 3) {
      spawnMeteor();
      nextMeteorAt = time + 2.5 + Math.random() * 3.5;
    }
    for (var m = 0; m < meteors.length; m++) {
      var mt = meteors[m];
      mt.life++;
      mt.x += mt.vx;
      mt.y += mt.vy;
      var inFade = mt.life < mt.appear ? mt.life / mt.appear : 1;
      inFade = inFade * inFade * (3 - 2 * inFade);
      var fade = inFade;
      /* 保持完整亮度，整条流星（含拖尾末端）完全飞出可视界面后才移除 */
      var tailEndX = mt.x - mt.vx * mt.len;
      var tailEndY = mt.y - mt.vy * mt.len;
      if (mt.life > 1500 || tailEndX > VW + 20 || tailEndY > VH + 20) {
        meteors.splice(m, 1); m--; continue;
      }
      var px = mt.x, py = mt.y;
      if (py < -120 || py > VH + 120) continue;
      var curLen = mt.len * (0.45 + 0.55 * inFade);
      var tailX = px - mt.vx * curLen, tailY = py - mt.vy * curLen;
      var headA = (0.95 * fade).toFixed(3);
      var glow = mctx.createLinearGradient(px, py, tailX, tailY);
      glow.addColorStop(0, "rgba(150,205,255," + (0.4 * fade).toFixed(3) + ")");
      glow.addColorStop(1, "rgba(150,205,255,0)");
      mctx.globalAlpha = 1;
      mctx.strokeStyle = glow;
      mctx.lineWidth = 5;
      mctx.lineCap = "round";
      mctx.beginPath();
      mctx.moveTo(px, py);
      mctx.lineTo(tailX, tailY);
      mctx.stroke();
      var core = mctx.createLinearGradient(px, py, tailX, tailY);
      core.addColorStop(0, "rgba(255,255,255," + headA + ")");
      core.addColorStop(0.25, "rgba(200,235,255," + (0.55 * fade).toFixed(3) + ")");
      core.addColorStop(1, "rgba(200,235,255,0)");
      mctx.strokeStyle = core;
      mctx.lineWidth = 1.6;
      mctx.beginPath();
      mctx.moveTo(px, py);
      mctx.lineTo(tailX, tailY);
      mctx.stroke();
      var hg = mctx.createRadialGradient(px, py, 0, px, py, 8);
      hg.addColorStop(0, "rgba(255,255,255," + headA + ")");
      hg.addColorStop(0.4, "rgba(180,225,255," + (0.35 * fade).toFixed(3) + ")");
      hg.addColorStop(1, "rgba(180,225,255,0)");
      mctx.fillStyle = hg;
      mctx.beginPath();
      mctx.arc(px, py, 8, 0, Math.PI * 2);
      mctx.fill();
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, VH);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "rgba(220,235,255,0.8)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var frameCount = 0;
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (scrolling) {
      /* 滚动中：星空冻结，流星继续运动 */
      mctx.clearRect(0, 0, W, VH);
      drawMeteors(t / 1000);
      mctx.globalAlpha = 1;
      return;
    }
    frameCount++;
    if ((frameCount % 30) === 0) syncDocHeight();
    /* 星星闪烁非常缓慢：隔帧重绘即可，观感无差别，开销减半 */
    if ((frameCount % 2) === 0) {
      ctx.clearRect(0, 0, W, VH);
      drawStars();
    }
    mctx.clearRect(0, 0, W, VH);
    drawMeteors(t / 1000);

    ctx.globalAlpha = 1;
    mctx.globalAlpha = 1;
  }

  function onVisibility() {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  }

  document.addEventListener("mousemove", function (e) {
    lastCX = e.clientX; lastCY = e.clientY;
    mouse.x = lastCX; mouse.y = lastCY;
  }, { passive: true });
  document.addEventListener("mouseleave", function () {
    lastCX = -9999; lastCY = -9999;
    mouse.x = -9999; mouse.y = -9999;
  });
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches[0]) {
      lastCX = e.touches[0].clientX; lastCY = e.touches[0].clientY;
      mouse.x = lastCX; mouse.y = lastCY;
    }
  }, { passive: true });
  document.addEventListener("touchend", function () {
    lastCX = -9999; lastCY = -9999;
    mouse.x = -9999; mouse.y = -9999;
  });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", function () {
    syncScroll();
    scrolling = true;
    clearTimeout(scrollStopTimer);
    scrollStopTimer = setTimeout(function () { scrolling = false; }, 150);
  }, { passive: true });
  window.addEventListener("load", function () { syncScroll(); syncDocHeight(); });
  setTimeout(syncDocHeight, 800);
  setTimeout(syncDocHeight, 2500);
  if (typeof ResizeObserver === "function") {
    try {
      new ResizeObserver(function () { syncDocHeight(); }).observe(document.body);
    } catch (e) {}
  }
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  if (prefersReduced) {
    drawStatic();
  } else {
    requestAnimationFrame(frame);
  }


})();