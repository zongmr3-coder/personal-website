/* ============================================================
   星云预渲染：把 SVG 噪波滤镜一次性渲染成静态位图，
   之后漂移动画只移动位图（合成层），消除最昂贵的滤镜重算。
   任何环节失败都自动保留原始 SVG，视觉不受影响。
   ============================================================ */
(function () {
  "use strict";

  var glow = document.querySelector(".page-glow");
  var svg = document.querySelector("svg.nebula");
  if (!glow || !svg) return;

  var groups = [];
  var nodes = svg.querySelectorAll("g.neb-cloud");
  for (var i = 0; i < nodes.length; i++) groups.push(nodes[i]);
  if (!groups.length) return;

  var canvases = [];
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var timer = null;

  function detachCanvases() {
    for (var i = 0; i < canvases.length; i++) {
      var c = canvases[i];
      if (c.parentNode) c.parentNode.removeChild(c);
    }
    canvases = [];
  }

  function restoreGroups() {
    for (var i = 0; i < groups.length; i++) groups[i].style.display = "";
  }

  function toPx(val, ref) {
    var s = String(val == null ? "" : val).trim();
    if (s.charAt(s.length - 1) === "%") return (parseFloat(s) / 100) * ref;
    return parseFloat(s) || 0;
  }

  function buildStandalone(group, docW, docH) {
    var ns = "http://www.w3.org/2000/svg";
    var bbox = group.getBBox();
    /* 滤镜区域默认 -60%/-60%/220%/220%，再外扩 60px 兜住高斯模糊 */
    var pad = 60;
    var x = bbox.x - bbox.width * 0.6 - pad;
    var y = bbox.y - bbox.height * 0.6 - pad;
    var w = bbox.width * 2.2 + pad * 2;
    var h = bbox.height * 2.2 + pad * 2;
    w = Math.max(8, Math.ceil(w));
    h = Math.max(8, Math.ceil(h));

    var svgEl = document.createElementNS(ns, "svg");
    svgEl.setAttribute("xmlns", ns);
    svgEl.setAttribute("width", w);
    svgEl.setAttribute("height", h);
    svgEl.setAttribute("viewBox", x + " " + y + " " + w + " " + h);

    var defs = svg.querySelector("defs");
    if (defs) {
      var defsCopy = document.createElementNS(ns, "defs");
      defsCopy.innerHTML = defs.innerHTML;
      svgEl.appendChild(defsCopy);
    }

    var clone = group.cloneNode(true);
    clone.removeAttribute("class");
    /* 百分比坐标转绝对像素（独立 SVG 的视口尺寸与原全页不同） */
    var ellipses = clone.querySelectorAll("ellipse");
    for (var e = 0; e < ellipses.length; e++) {
      var el = ellipses[e];
      var cx = el.getAttribute("cx"), cy = el.getAttribute("cy");
      if (cx && cx.indexOf("%") > -1) el.setAttribute("cx", toPx(cx, docW));
      if (cy && cy.indexOf("%") > -1) el.setAttribute("cy", toPx(cy, docH));
    }
    svgEl.appendChild(clone);

    var xml = new XMLSerializer().serializeToString(svgEl);
    return {
      url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml),
      x: x, y: y, w: w, h: h
    };
  }

  function rasterize() {
    detachCanvases();
    restoreGroups();
    var docW = svg.clientWidth;
    var docH = svg.clientHeight;
    if (!docW || !docH) return;

    for (var i = 0; i < groups.length; i++) {
      (function (group, idx) {
        var info;
        try {
          info = buildStandalone(group, docW, docH);
        } catch (err) {
          return; /* 保留原始 SVG */
        }
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(info.w * DPR));
          canvas.height = Math.max(1, Math.round(info.h * DPR));
          var cctx = canvas.getContext("2d");
          cctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.style.position = "absolute";
          canvas.style.left = info.x + "px";
          canvas.style.top = info.y + "px";
          canvas.style.width = info.w + "px";
          canvas.style.height = info.h + "px";
          /* 保持原文档顺序的层级（后出现的云在上层） */
          canvas.style.zIndex = String(idx + 1);
          canvas.setAttribute("aria-hidden", "true");
          /* 保留漂移动画的 class（neb-cloud + nc-X） */
          var cls = "neb-cloud";
          var orig = group.getAttribute("class") || "";
          orig.split(/\s+/).forEach(function (c) {
            if (c && c !== "neb-cloud") cls += " " + c;
          });
          canvas.className = cls;
          glow.appendChild(canvas);
          group.style.display = "none";
          canvases.push(canvas);
        };
        img.onerror = function () {
          group.style.display = "";
        };
        img.src = info.url;
      })(groups[i], i);
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(rasterize, 300);
  }

  window.addEventListener("resize", schedule);
  if (typeof ResizeObserver === "function") {
    try {
      new ResizeObserver(schedule).observe(document.body);
    } catch (e) {}
  }

  /* 等布局稳定后渲染（错开首屏，避免抢占初始渲染） */
  setTimeout(rasterize, 120);
  setTimeout(rasterize, 900);
  setTimeout(rasterize, 2600);
})();