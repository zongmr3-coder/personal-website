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
      sbCollapse.textContent = collapsed ? "»" : "«";
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

/* ---------- 星海背景：闪烁星星 + 鼠标推开（方向A升级） ---------- */
(function () {
  "use strict";
  var canvas = document.createElement("canvas");
  canvas.className = "star-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");
  var stars = [], W = 0, H = 0;
  var PUSH_R = 150, PUSH_MAX = 30;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    var count = Math.min(170, Math.round((W * H) / 7800));
    stars = [];
    for (var i = 0; i < count; i++) {
      var big = Math.random() < 0.12;
      stars.push({
        ox: Math.random() * W,
        oy: Math.random() * H,
        r: big ? (Math.random() * 0.9 + 1.5) : (Math.random() * 0.9 + 0.5),
        base: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.4 + 0.5,
        color: big ? "#64FFDA" : (Math.random() < 0.85 ? "#EAF6FF" : "#B9CFFF"),
        cx: 0, cy: 0
      });
    }
  }
  var tx = -9999, ty = -9999, smx = -9999, smy = -9999;
  document.addEventListener("mousemove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
  document.addEventListener("mouseleave", function () { tx = -9999; ty = -9999; });
  window.addEventListener("resize", resize);
  function loop(t) {
    var time = t / 1000;
    smx += (tx - smx) * 0.14;
    smy += (ty - smy) * 0.14;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var dx = s.ox - smx, dy = s.oy - smy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PUSH_R && dist > 0.01) {
        var k = 1 - dist / PUSH_R;
        var gx = (dx / dist) * PUSH_MAX * k;
        var gy = (dy / dist) * PUSH_MAX * k;
        s.cx += (gx - s.cx) * 0.055;
        s.cy += (gy - s.cy) * 0.055;
      } else {
        s.cx *= 0.95; s.cy *= 0.95;
      }
      var tw = Math.sin(time * s.speed + s.base) * 0.5 + 0.5;
      ctx.globalAlpha = 0.18 + tw * 0.75;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.ox + s.cx, s.oy + s.cy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);
})();