(function () {
  "use strict";

  var THREE;
  var EffectComposer;
  var RenderPass;
  var UnrealBloomPass;

  var page = document.querySelector(".neural-page");
  var canvas = document.querySelector(".neural-field");
  var boot = document.querySelector(".boot");
  var transition = document.querySelector(".transition");
  var pager = document.querySelectorAll(".pager button");
  if (!page || !canvas) return;

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pointer = { x: 0, y: 0 };
  var targetPointer = { x: 0, y: 0 };
  var count = 120000;
  var state = { ready: false, transitioning: false, fade: 1, fadeTarget: 1, layout: 0 };
  var renderer;
  var scene;
  var camera;
  var particles;
  var geometry;
  var material;
  var composer;
  var bloomPass;
  var radiusStart = 0;

  function hash(value) {
    var x = Math.sin(value * 12.9898 + state.layout * 17.31) * 43758.5453;
    return x - Math.floor(x);
  }

  function createParticles() {
    var positions = new Float32Array(count * 3);
    var randoms = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var primary = new THREE.Color("#8b5cf6");
    var secondary = new THREE.Color("#6366f1");

    for (var i = 0; i < count; i += 1) {
      var i3 = i * 3;
      var radius = 18 * (0.5 + hash(i + 1) * 0.5);
      var theta = hash(i + 11) * Math.PI * 2;
      var phi = Math.acos(hash(i + 31) * 2 - 1);
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      randoms[i3] = hash(i + 71);
      randoms[i3 + 1] = hash(i + 101);
      randoms[i3 + 2] = hash(i + 131);

      var color = primary.clone().lerp(secondary, hash(i + 161));
      if (hash(i + 191) > 0.9) color.setHex(0xffffff);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    if (!geometry) {
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 3));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      return;
    }

    geometry.attributes.position.array.set(positions);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aRandom.array.set(randoms);
    geometry.attributes.aRandom.needsUpdate = true;
    geometry.attributes.aColor.array.set(colors);
    geometry.attributes.aColor.needsUpdate = true;
  }

  function createMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform float uRadius;
        uniform vec3 uMouse;
        uniform float uPixelRatio;

        attribute vec3 aRandom;
        attribute vec3 aColor;

        varying vec3 vColor;
        varying float vDist;

        vec3 curl(vec3 p) {
          float t = uTime * 0.2;
          vec3 result = vec3(0.0);
          result.x += sin(p.y * 0.5 + t + aRandom.x * 6.0);
          result.y += cos(p.z * 0.5 + t + aRandom.y * 6.0);
          result.z += sin(p.x * 0.5 + t + aRandom.z * 6.0);
          return result * 0.5;
        }

        void main() {
          vColor = aColor;
          vec3 pos = position * uRadius;
          vec3 noise = curl(pos * 0.2);
          pos += noise * 2.5;

          vec3 mousePos = vec3(uMouse.x * 15.0, uMouse.y * 10.0, 0.0);
          float distToMouse = distance(pos, mousePos);
          if (distToMouse < 8.0) {
            float strength = (8.0 - distToMouse) / 8.0;
            vec3 dir = normalize(mousePos - pos);
            pos += dir * strength * 2.0;
            float angle = strength * 2.0;
            float s = sin(angle);
            float c = cos(angle);
            vec3 rel = pos - mousePos;
            vec3 rotated = vec3(rel.x * c - rel.y * s, rel.x * s + rel.y * c, rel.z);
            pos = mousePos + rotated;
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 40.0 * (1.0 / -mvPosition.z) * uPixelRatio;
          vDist = distToMouse;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDist;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 2.0);
          vec3 finalColor = vColor;
          if (vDist < 8.0) finalColor += vec3(0.3, 0.2, 0.5) * (1.0 - vDist / 8.0);
          gl_FragColor = vec4(finalColor, alpha * 0.8);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: 3 },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  function initThree() {
    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020202);
      scene.fog = new THREE.FogExp2(0x020202, 0.02);
      camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 100);
      camera.position.z = 10;
      camera.position.y = 2;

      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        powerPreference: "high-performance",
        antialias: false,
        stencil: false,
        depth: false
      });
      renderer.setSize(innerWidth, innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      createParticles();
      material = createMaterial();
      particles = new THREE.Points(geometry, material);
      scene.add(particles);

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.5, 0.4, 0.85);
      bloomPass.threshold = 0.05;
      bloomPass.strength = 1.8;
      bloomPass.radius = 0.8;
      composer.addPass(bloomPass);
      radiusStart = performance.now();

      function resize() {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
        composer.setSize(innerWidth, innerHeight);
        material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
      }
      addEventListener("resize", resize, { passive: true });

      function draw(time) {
        requestAnimationFrame(draw);
        var seconds = time * 0.001;
        var pointerEase = reduced ? 0.12 : 0.05;
        pointer.x += (targetPointer.x - pointer.x) * pointerEase;
        pointer.y += (targetPointer.y - pointer.y) * pointerEase;
        state.fade += (state.fadeTarget - state.fade) * 0.065;
        var introProgress = reduced ? 1 : Math.min(1, (performance.now() - radiusStart - 500) / 2500);
        var eased = introProgress < 0.5 ? 4 * introProgress * introProgress * introProgress : 1 - Math.pow(-2 * introProgress + 2, 3) / 2;
        material.uniforms.uRadius.value = 3 - 2 * eased;
        material.uniforms.uTime.value = reduced ? 0 : seconds;
        material.uniforms.uMouse.value.set(pointer.x, pointer.y, 0);

        particles.rotation.y = reduced ? 0 : seconds * 0.1;
        particles.rotation.x = reduced ? 0 : Math.sin(seconds * 0.08) * 0.035;
        camera.position.x = reduced ? 0 : Math.sin(seconds * 0.1) * 2;
        camera.position.y = reduced ? 2 : 2 + Math.cos(seconds * 0.15) * 2;
        camera.lookAt(0, 0, 0);
        composer.render();
      }
      draw(0);
      return true;
    } catch (error) {
      console.error("NEURAL FIELD INIT FAILED", error);
      return false;
    }
  }

  function fallback() {
    var context = canvas.getContext("2d");
    if (!context) {
      var fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.className = canvas.className;
      fallbackCanvas.setAttribute("aria-hidden", "true");
      canvas.replaceWith(fallbackCanvas);
      canvas = fallbackCanvas;
      context = canvas.getContext("2d");
    }
    if (!context) return;
    var points = [];
    function resize() {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      points = [];
      for (var i = 0; i < 1800; i += 1) points.push({ a: Math.random() * Math.PI * 2, r: 0.25 + Math.random() * 0.75, s: Math.random() * 1.6 + 0.2 });
    }
    function draw(time) {
      requestAnimationFrame(draw);
      context.fillStyle = "#020202";
      context.fillRect(0, 0, innerWidth, innerHeight);
      points.forEach(function (point, index) {
        var radius = point.r * Math.min(innerWidth, innerHeight) * 0.62;
        var angle = point.a + time * 0.00003;
        var x = innerWidth * 0.5 + Math.cos(angle) * radius * 1.4;
        var y = innerHeight * 0.5 + Math.sin(angle) * radius * 0.72;
        context.fillStyle = index % 31 === 0 ? "rgba(239,235,255,.7)" : "rgba(139,92,246,.55)";
        context.beginPath();
        context.arc(x, y, point.s, 0, Math.PI * 2);
        context.fill();
      });
    }
    addEventListener("resize", resize, { passive: true });
    resize();
    draw(0);
  }

  function reseed() {
    state.layout += 1;
    if (geometry) createParticles();
  }

  addEventListener("pointermove", function (event) {
    targetPointer.x = event.clientX / innerWidth * 2 - 1;
    targetPointer.y = -(event.clientY / innerHeight * 2 - 1);
  }, { passive: true });

  function startTransition(button) {
    if (state.transitioning) return;
    state.transitioning = true;
    pager.forEach(function (item) { item.classList.remove("active"); });
    button.classList.add("active");
    state.fadeTarget = 0;
    transition.classList.add("active");
    setTimeout(function () {
      reseed();
      state.fadeTarget = 1;
    }, 620);
    setTimeout(function () {
      transition.classList.remove("active");
      state.transitioning = false;
    }, 1640);
  }

  function finishBoot() {
    window.__neuralStartReady = true;
    window.dispatchEvent(new Event("neural-start-ready"));
    page.classList.remove("loading");
    page.classList.add("is-ready");
    if (boot) boot.classList.add("done");
    state.ready = true;
  }

  async function bootScene() {
    try {
      var modules = await Promise.all([
        import("../js/vendor/three.module.js"),
        import("../js/vendor/three/examples/jsm/postprocessing/EffectComposer.js"),
        import("../js/vendor/three/examples/jsm/postprocessing/RenderPass.js"),
        import("../js/vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js")
      ]);
      THREE = modules[0];
      EffectComposer = modules[1].EffectComposer;
      RenderPass = modules[2].RenderPass;
      UnrealBloomPass = modules[3].UnrealBloomPass;
      if (!initThree()) fallback();
    } catch (error) {
      console.error("NEURAL FIELD MODULE LOAD FAILED", error);
      fallback();
    }
    setTimeout(finishBoot, reduced ? 120 : 920);
  }

  pager.forEach(function (button) { button.addEventListener("click", function () { startTransition(button); }); });
  bootScene();
}());
