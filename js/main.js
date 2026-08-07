/* ============================================================
   仲子龙 · 个人主页 交互脚本（方向B · 暗色开发者）
   ============================================================ */
(function () {
  "use strict";

  var toTop = document.getElementById("toTop");
  var typedEl = document.getElementById("typedText");

  /* ---------- 滚动状态 ---------- */
  function onScroll() {
    if (toTop) toTop.classList.toggle("show", window.scrollY > 500);
    highlightNav();
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
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
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


/* ---------- 星海背景：闪烁星星 + 鼠标推开 + 滚动视差 ---------- */
(function () {
  "use strict";
  var canvas = document.createElement("canvas");
  canvas.className = "star-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");
  var stars = [], W = 0, H = 0, DOC_H = 0;
  var PUSH_R = 150, PUSH_MAX = 30, DENSITY = 4300, MAX_STARS = 2200;
  var lastRebalance = 0;

  function docH() {
    return Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, window.innerHeight);
  }
  function targetCount() {
    return Math.min(MAX_STARS, Math.round((W * docH()) / DENSITY));
  }
  function makeStar() {
    var big = Math.random() < 0.1;
    return {
      ox: Math.random() * W,
      oy: Math.random() * docH(),
      depth: Math.random() * 0.55 + 0.45,
      r: big ? (Math.random() * 0.9 + 1.5) : (Math.random() * 0.9 + 0.5),
      base: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.4 + 0.5,
      color: big ? "#64FFDA" : (Math.random() < 0.85 ? "#EAF6FF" : "#B9CFFF"),
      cx: 0, cy: 0
    };
  }
  function buildStars() {
    var n = targetCount();
    stars = [];
    for (var i = 0; i < n; i++) stars.push(makeStar());
  }
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
  }
  function rebalance() {
    var d = docH();
    if (d === DOC_H) return;
    DOC_H = d;
    var n = targetCount();
    while (stars.length < n) stars.push(makeStar());
    if (stars.length > n) stars.length = n;
  }

  var tx = -9999, ty = -9999, smx = -9999, smy = -9999;
  document.addEventListener("mousemove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
  document.addEventListener("mouseleave", function () { tx = -9999; ty = -9999; });
  window.addEventListener("resize", resize);

  function loop(t) {
    var time = t / 1000;
    if (t - lastRebalance > 400) { lastRebalance = t; rebalance(); }
    smx += (tx - smx) * 0.14;
    smy += (ty - smy) * 0.14;
    var sc = window.scrollY || window.pageYOffset || 0;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var vy = s.oy - sc * s.depth;
      if (vy < -12 || vy > H + 12) continue;
      var dx = s.ox - smx, dy = vy - smy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PUSH_R && dist > 0.01) {
        var k = 1 - dist / PUSH_R;
        s.cx += ((dx / dist) * PUSH_MAX * k - s.cx) * 0.055;
        s.cy += ((dy / dist) * PUSH_MAX * k - s.cy) * 0.055;
      } else {
        s.cx *= 0.95; s.cy *= 0.95;
      }
      var tw = Math.sin(time * s.speed + s.base) * 0.5 + 0.5;
      ctx.globalAlpha = 0.18 + tw * 0.75;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.ox + s.cx, vy + s.cy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  DOC_H = docH();
  resize();
  requestAnimationFrame(loop);
})();