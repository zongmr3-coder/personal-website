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