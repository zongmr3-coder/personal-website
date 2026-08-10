/* ============================================================
   模组开发 · 游戏与模组数据
   ------------------------------------------------------------
   新增游戏：在 MODS_GAMES 数组中新增一个对象
   新增模组：在对应游戏的 mods 数组中新增一个对象
   comingSoon: true 表示该游戏显示为「敬请期待」占位卡片
   ============================================================ */
(function () {
  "use strict";

  var MODS_GAMES = [
    {
      id: "terraria",
      name: "泰拉瑞亚",
      en: "Terraria",
      icon: "🌳",
      color: "#3AA17E",
      desc: "基于 tModLoader 与 C# 的模组开发",
      mods: [
        {
          name: "（旧）鸿蒙方舟",
          en: "Ark of the Cosmos",
          version: "v1.0.0",
          status: "已完成",
          statusType: "done",
          date: "2026.08",
          intro: "基于 tModLoader 与 C# 开发的泰拉瑞亚大型模组，复刻自灾厄（Calamity）经典设定，加入独立合成的武器、装备与道具体系，提供完整的模组体验。",
          progress: "已完成 1.0.0 版本核心内容，提供可直接安装的模组文件（.tmod），点击下方按钮下载体验。",
          stack: ["C#", "tModLoader", "Terraria 1.3.5.3", "CalamityMod", "GitHub"],
          links: [
            { label: "下载模组 v1.0.0", href: "downloads/HongmengArk_v1.0.0.tmod", type: "download" },
            { label: "查看源码", href: "https://github.com/zongmr3-coder/trmod-HM", type: "outline" }
          ]
        }
      ]
    },
    {
      id: "minecraft",
      name: "我的世界",
      en: "Minecraft",
      icon: "⛏️",
      color: "#5FA65A",
      desc: "新模组规划中，敬请期待",
      comingSoon: true,
      mods: []
    },
    {
      id: "stardew",
      name: "星露谷物语",
      en: "Stardew Valley",
      icon: "🌾",
      color: "#E8A33D",
      desc: "新模组规划中，敬请期待",
      comingSoon: true,
      mods: []
    },
    {
      id: "more",
      name: "更多游戏",
      en: "More Games",
      icon: "🕹️",
      color: "#8892B0",
      desc: "未来将支持更多游戏的模组",
      comingSoon: true,
      mods: []
    }
  ];

  var shell = document.getElementById("modsShell");
  if (!shell) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function gameIco(game) {
    var color = game.color || "#64FFDA";
    return '<span class="game-ico" style="background:' + color + "26;border-color:" + color + '73">' + (game.icon || "🎮") + "</span>";
  }

  function statusBadge(mod) {
    var cls = mod.statusType || "plan";
    return '<span class="mod-badge ' + cls + '">' + esc(mod.status || "规划中") + "</span>";
  }

  function renderGameGrid() {
    var cards = MODS_GAMES.map(function (game) {
      var soon = !!game.comingSoon;
      var count = (game.mods || []).length;
      var meta = soon
        ? '<span class="game-count">敬请期待</span>'
        : '<span class="game-count">' + count + " 个模组</span>";
      return (
        '<button type="button" class="mods-game-card' + (soon ? " is-soon" : "") + '" data-game="' + esc(game.id) + '"' + (soon ? " disabled" : "") + ">" +
          gameIco(game) +
          '<span class="game-name">' + esc(game.name) + "</span>" +
          '<span class="game-en">' + esc(game.en || "") + "</span>" +
          '<span class="game-desc">' + esc(game.desc || "") + "</span>" +
          meta +
        "</button>"
      );
    }).join("");

    return (
      '<p class="mods-intro">// 选择一款游戏，查看我已开发的模组</p>' +
      '<div class="mods-game-grid">' + cards + "</div>"
    );
  }

  function renderGameView(game) {
    var modsHtml = (game.mods || []).map(function (mod) {
      var tags = (mod.stack || []).map(function (t) {
        return '<span class="tag tag-solid">' + esc(t) + "</span>";
      }).join("");

      var links = (mod.links || []).map(function (link) {
        var cls = link.type === "download" ? "btn-sm btn-solid" : "btn-sm btn-outline";
        var icon = link.type === "download"
          ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> '
          : "";
        var extra = link.href.indexOf("http") === 0 ? ' target="_blank" rel="noopener"' : " download";
        return '<a class="' + cls + '" href="' + esc(link.href) + '"' + extra + ">" + icon + esc(link.label) + "</a>";
      }).join("");

      return (
        '<article class="mods-mod-card">' +
          '<header class="mods-mod-head">' +
            '<div class="mods-mod-name">' +
              "<h4>" + esc(mod.name) + "</h4>" +
              (mod.en ? '<span class="mod-en">' + esc(mod.en) + "</span>" : "") +
            "</div>" +
            '<div class="mods-mod-badges">' +
              (mod.version ? '<span class="mod-badge">' + esc(mod.version) + "</span>" : "") +
              (mod.date ? '<span class="mod-badge">' + esc(mod.date) + "</span>" : "") +
              statusBadge(mod) +
            "</div>" +
          "</header>" +
          '<div class="mods-mod-body">' +
            '<div class="meta-block"><h4>项目介绍</h4><p>' + esc(mod.intro) + "</p></div>" +
            '<div class="meta-block"><h4>当前进度</h4><p>' + esc(mod.progress) + "</p></div>" +
            '<div class="mods-mod-tags"><h4>技术栈</h4><div class="project-tags">' + tags + "</div></div>" +
          "</div>" +
          '<footer class="mods-mod-foot">' + links + "</footer>" +
        "</article>"
      );
    }).join("");

    var count = (game.mods || []).length;
    return (
      '<div class="mods-view">' +
        '<div class="mods-view-head">' +
          '<button type="button" class="mods-back" data-back="1" aria-label="返回选择游戏">← 返回选择游戏</button>' +
          '<div class="mods-game-title">' +
            gameIco(game) +
            "<div>" +
              '<h4 class="mods-game-name">' + esc(game.name) + "</h4>" +
              '<span class="mods-game-en">' + esc(game.en) + " · " + count + " 个模组</span>" +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="mods-mod-list">' + modsHtml + "</div>" +
      "</div>"
    );
  }

  var reducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animating = false;

  /* 带过渡动画的视图切换：打开游戏从右滑入、返回从左滑入 */
  function show(html, dir) {
    if (animating) return;
    if (reducedMotion || !dir) { shell.innerHTML = html; return; }
    animating = true;
    var leaveCls = dir === "back" ? "mods-leave-right" : "mods-leave-left";
    var enterCls = dir === "back" ? "mods-enter-left" : "mods-enter-right";
    shell.classList.add(leaveCls);
    setTimeout(function () {
      shell.innerHTML = html;
      shell.classList.remove("mods-leave-left", "mods-leave-right");
      void shell.offsetWidth;
      shell.classList.add(enterCls);
      function onEnd(ev) {
        if (ev.target === shell) end();
      }
      function end() {
        shell.classList.remove("mods-enter-left", "mods-enter-right");
        shell.removeEventListener("animationend", onEnd);
        animating = false;
      }
      shell.addEventListener("animationend", onEnd);
      setTimeout(end, 320);
    }, 140);
  }

  shell.addEventListener("click", function (e) {
    var back = e.target.closest("[data-back]");
    if (back) {
      show(renderGameGrid(), "back");
      return;
    }
    var card = e.target.closest(".mods-game-card");
    if (!card || card.classList.contains("is-soon")) return;
    var game = MODS_GAMES.find(function (g) {
      return g.id === card.getAttribute("data-game");
    });
    if (game) show(renderGameView(game), "open");
  });

  show(renderGameGrid());
})();