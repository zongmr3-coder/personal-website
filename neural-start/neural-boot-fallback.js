(function () {
  "use strict";

  var page = document.querySelector(".neural-page");
  var canvas = document.querySelector(".neural-field");
  var boot = document.querySelector(".boot");
  if (!page || !canvas) return;

  var timer = setTimeout(startFallback, 3500);
  var done = false;
  var pointer = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  var context;
  var points = [];

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    window.__neuralStartReady = true;
    page.classList.remove("loading");
    page.classList.add("is-ready");
    if (boot) boot.classList.add("done");
  }

  function makeCanvas() {
    context = canvas.getContext("2d");
    if (context) return true;
    var replacement = document.createElement("canvas");
    replacement.className = canvas.className;
    replacement.setAttribute("aria-hidden", "true");
    canvas.replaceWith(replacement);
    canvas = replacement;
    context = canvas.getContext("2d");
    return !!context;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    points = [];
    var count = Math.min(1800, Math.max(700, Math.round(window.innerWidth * window.innerHeight / 700)));
    for (var i = 0; i < count; i += 1) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: 0.25 + Math.random() * 0.95,
        r: 0.25 + Math.random() * 1.45,
        phase: Math.random() * Math.PI * 2,
        white: Math.random() > 0.91
      });
    }
  }

  function draw(time) {
    if (!context) return;
    var seconds = time * 0.001;
    context.fillStyle = "#020202";
    context.fillRect(0, 0, canvas.width, canvas.height);
    pointer.x += (target.x - pointer.x) * 0.06;
    pointer.y += (target.y - pointer.y) * 0.06;
    for (var i = 0; i < points.length; i += 1) {
      var point = points[i];
      var x = point.x + Math.sin(seconds * 0.12 + point.phase) * 18 * point.z;
      var y = point.y + Math.cos(seconds * 0.09 + point.phase) * 12 * point.z;
      var dx = x - pointer.x;
      var dy = y - pointer.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 150 && distance > 0.1) {
        var force = (150 - distance) / 150;
        x -= dx / distance * force * 22;
        y -= dy / distance * force * 22;
      }
      var alpha = 0.28 + Math.abs(Math.sin(seconds * 0.5 + point.phase)) * 0.5;
      context.fillStyle = point.white
        ? "rgba(245,242,255," + alpha.toFixed(3) + ")"
        : "rgba(139,92,246," + (alpha * 0.9).toFixed(3) + ")";
      context.beginPath();
      context.arc(x, y, point.r * (0.8 + point.z * 0.65), 0, Math.PI * 2);
      context.fill();
    }
    requestAnimationFrame(draw);
  }

  function startFallback() {
    if (done || !makeCanvas()) {
      finish();
      return;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", function (event) {
      target.x = event.clientX;
      target.y = event.clientY;
    }, { passive: true });
    requestAnimationFrame(draw);
    finish();
  }

  window.addEventListener("neural-start-ready", finish, { once: true });
}());
