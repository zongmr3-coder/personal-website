/* ===================== 界面交互（依赖 logic.js） ===================== */
(function () {
  'use strict';
  var T48 = window.Twenty48;
  var SIZE = T48.SIZE;

  var boardEl = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var scoreBoxEl = document.getElementById('score-box');
  var bestEl = document.getElementById('best');
  var overlayEl = document.getElementById('overlay');
  var overlayTitleEl = document.getElementById('overlay-title');
  var overlayTextEl = document.getElementById('overlay-text');
  var keepGoingBtn = document.getElementById('keep-going');
  var againBtn = document.getElementById('again');
  var newGameBtn = document.getElementById('new-game');
  var confirmEl = document.getElementById('confirm');
  var confirmOkBtn = document.getElementById('confirm-ok');
  var confirmCancelBtn = document.getElementById('confirm-cancel');
  var confirmOpen = false;
  var confirmAction = null;

  var grid = T48.createGrid();
  var tiles = new Map(); // id -> { el, row, col, value }
  var score = 0;
  var best = 0;
  var won = false;
  var over = false;
  var busy = false;
  var cellPx = 0;
  var gapPx = 15;
  var MOVE_MS = 150; // 与 CSS .tile transition 保持一致
  var MAX_QUEUE = 5; // 输入缓冲上限：快速连按时最多缓存几步
  var pendingDirs = []; // 待执行的方向队列
  var gameSeq = 0; // 新游戏 +1，用来丢弃旧回合残留的动画回调

  /* ---------- 主题 ---------- */
  var savedTheme = localStorage.getItem('t2048-theme') || 'classic';
  document.body.dataset.theme = savedTheme;
  var themeBtns = document.querySelectorAll('[data-theme]');
  themeBtns.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.theme === savedTheme);
    btn.addEventListener('click', function () {
      document.body.dataset.theme = btn.dataset.theme;
      localStorage.setItem('t2048-theme', btn.dataset.theme);
      themeBtns.forEach(function (b) {
        b.classList.toggle('active', b.dataset.theme === btn.dataset.theme);
      });
    });
  });

  /* ---------- 棋盘骨架 ---------- */
  var cellEls = [];
  for (var i = 0; i < SIZE * SIZE; i++) {
    var c = document.createElement('div');
    c.className = 'bg-cell';
    boardEl.appendChild(c);
    cellEls.push(c);
  }

  function measure() {
    cellPx = cellEls[0].getBoundingClientRect().width;
    gapPx = parseFloat(getComputedStyle(boardEl).gap) || 15;
  }

  function posOf(row, col) {
    return 'translate(' + (col * (cellPx + gapPx)) + 'px,' + (row * (cellPx + gapPx)) + 'px)';
  }

  function applySize(el) {
    el.style.width = cellPx + 'px';
    el.style.height = cellPx + 'px';
    var num = el.querySelector('.tile-num');
    var digits = String(num.textContent).length;
    var ratio = digits <= 1 ? 0.48 : digits === 2 ? 0.43 : digits === 3 ? 0.33 : digits === 4 ? 0.28 : digits === 5 ? 0.23 : 0.19;
    num.style.fontSize = Math.round(cellPx * ratio) + 'px';
    num.style.letterSpacing = digits >= 5 ? '-0.5px' : '';
  }

  function tileClass(value) {
    return 'tile-' + (value > 2048 ? 'super' : value);
  }

  function addTile(tile, row, col, isNew) {
    var el = document.createElement('div');
    el.className = 'tile ' + tileClass(tile.value);
    var inner = document.createElement('div');
    inner.className = 'tile-inner';
    var num = document.createElement('div');
    num.className = 'tile-num';
    num.textContent = tile.value;
    inner.appendChild(num);
    el.appendChild(inner);
    boardEl.appendChild(el);
    applySize(el);
    tiles.set(tile.id, { el: el, row: row, col: col, value: tile.value });
    el.style.setProperty('--tx', (col * (cellPx + gapPx)) + 'px');
    el.style.setProperty('--ty', (row * (cellPx + gapPx)) + 'px');
    el.style.transform = posOf(row, col);
    if (isNew) {
      var cell = cellEls[row * SIZE + col];
      cell.classList.remove('flash');
      void cell.offsetWidth;
      cell.classList.add('flash');
      requestAnimationFrame(function () { inner.classList.add('tile-new'); });
    }
  }

  function findCell(tile) {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (grid[r][c] && grid[r][c].id === tile.id) return [r, c];
    return null;
  }

  function spawn() {
    var res = T48.addRandomTile(grid);
    grid = res.grid;
    if (res.tile) {
      var pos = findCell(res.tile);
      addTile(res.tile, pos[0], pos[1], true);
    }
  }

  /* ---------- 分数 ---------- */
  function updateScore(bump) {
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      localStorage.setItem('t2048-best', String(best));
    }
    bestEl.textContent = best;
    if (bump) {
      scoreBoxEl.classList.remove('bump');
      void scoreBoxEl.offsetWidth;
      scoreBoxEl.classList.add('bump');
    }
  }

  /* ---------- 存档 / 读档 ---------- */
  var SAVE_KEY = 't2048-save';

  function saveState() {
    try {
      var list = [];
      for (var r = 0; r < SIZE; r++)
        for (var c = 0; c < SIZE; c++)
          if (grid[r][c]) list.push({ id: grid[r][c].id, value: grid[r][c].value, row: r, col: c });
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, size: SIZE, list: list, score: score, won: won, over: over
      }));
    } catch (e) { /* 存储不可用时静默跳过 */ }
  }

  function loadSave() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    var state = null;
    try { state = JSON.parse(raw); } catch (e) { return false; }
    if (!state || state.v !== 1 || state.size !== SIZE || !Array.isArray(state.list)) return false;
    var list = [];
    for (var i = 0; i < state.list.length; i++) {
      var t = state.list[i];
      if (!t || typeof t.value !== 'number' || t.value < 2 ||
          !(t.row >= 0) || !(t.row < SIZE) || !(t.col >= 0) || !(t.col < SIZE)) return false;
      list.push({ id: t.id || 0, value: t.value, row: t.row, col: t.col });
    }
    if (!list.length) return false;
    tiles.forEach(function (entry) { entry.el.remove(); });
    tiles.clear();
    grid = T48.restoreGrid(list);
    list.forEach(function (t) {
      addTile(grid[t.row][t.col], t.row, t.col, false);
    });
    score = typeof state.score === 'number' ? state.score : 0;
    won = !!state.won;
    over = !!state.over;
    updateScore(false);
    if (over) endGame();
    else if (won) showOverlay('你赢了！', '成功合成 2048，太厉害了！', true);
    return true;
  }

  /* ---------- 移动 ---------- */
  function doMove(dir) {
    if (busy || over || overlayEl.classList.contains('show')) return;
    var res = T48.move(grid, dir);
    if (!res.moved) {
      processQueue();
      return;
    }
    var seq = gameSeq;
    busy = true;

    res.moves.forEach(function (m) {
      var entry = tiles.get(m.id);
      if (!entry) return;
      entry.row = m.tr;
      entry.col = m.tc;
      var inner = entry.el.querySelector('.tile-inner');
      inner.classList.remove('tile-new');
      entry.el.style.setProperty('--tx', (m.tc * (cellPx + gapPx)) + 'px');
      entry.el.style.setProperty('--ty', (m.tr * (cellPx + gapPx)) + 'px');
      entry.el.style.transform = posOf(m.tr, m.tc);
    });
    res.merges.forEach(function (m) {
      var entry = tiles.get(m.id);
      if (!entry) return;
      var inner = entry.el.querySelector('.tile-inner');
      inner.classList.remove('tile-new');
      entry.el.style.setProperty('--tx', (m.tc * (cellPx + gapPx)) + 'px');
      entry.el.style.setProperty('--ty', (m.tr * (cellPx + gapPx)) + 'px');
      entry.el.style.transform = posOf(m.tr, m.tc);
    });

    grid = res.grid;
    score += res.score;
    updateScore(res.score > 0);

    window.setTimeout(function () {
      if (seq !== gameSeq) return;
      res.merges.forEach(function (m) {
        var absorbed = tiles.get(m.id);
        var absorber = tiles.get(m.into);
        if (absorbed) {
          absorbed.el.remove();
          tiles.delete(m.id);
        }
        if (absorber) {
          absorber.value = m.value * 2;
          absorber.el.className = 'tile ' + tileClass(absorber.value);
          absorber.el.querySelector('.tile-num').textContent = absorber.value;
          applySize(absorber.el);
          var mergeInner = absorber.el.querySelector('.tile-inner');
          mergeInner.classList.remove('tile-merged');
          void mergeInner.offsetWidth;
          mergeInner.classList.add('tile-merged');
        }
      });

      spawn();
      busy = false;

      if (!won && T48.hasValue(grid, 2048)) {
        won = true;
        showOverlay('你赢了！', '成功合成 2048，太厉害了！', true);
      } else if (!T48.canMove(grid)) {
        endGame();
      }
      saveState();
      // 等新方块渲染一帧后再处理下一步，避免快速连按时跳帧
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          processQueue();
        });
      });
    }, MOVE_MS + 10);
  }

  /* ---------- 覆盖层 ---------- */
  function showOverlay(title, text, keepGoing) {
    overlayTitleEl.textContent = title;
    overlayTextEl.textContent = text;
    keepGoingBtn.style.display = keepGoing ? '' : 'none';
    overlayEl.classList.add('show');
  }

  function hideOverlay() {
    overlayEl.classList.remove('show');
    processQueue();
  }

  function endGame() {
    over = true;
    showOverlay('游戏结束', '棋盘已满，没有可移动的方块了', false);
  }

  /* ---------- 新游戏 ---------- */
  function newGame() {
    gameSeq++;
    pendingDirs.length = 0;
    cellEls.forEach(function (c) { c.classList.remove('flash'); });
    tiles.forEach(function (entry) { entry.el.remove(); });
    tiles.clear();
    grid = T48.createGrid();
    score = 0;
    won = false;
    over = false;
    busy = false;
    hideOverlay();
    updateScore(false);
    spawn();
    spawn();
    saveState();
  }

  /* ---------- 输入缓冲 ---------- */
  function processQueue() {
    if (busy || over || confirmOpen || overlayEl.classList.contains('show')) return;
    if (!pendingDirs.length) return;
    var dir = pendingDirs.shift();
    doMove(dir);
  }

  function requestMove(dir) {
    if (over || confirmOpen || overlayEl.classList.contains('show')) return;
    if (pendingDirs.length >= MAX_QUEUE) return;
    pendingDirs.push(dir);
    processQueue();
  }

  /* ---------- 确认弹窗 ---------- */
  function askConfirm(action) {
    confirmAction = action;
    confirmOpen = true;
    confirmEl.classList.add('show');
  }

  function closeConfirm() {
    confirmEl.classList.remove('show');
    confirmOpen = false;
    confirmAction = null;
    processQueue();
  }

  function requestNewGame() {
    if (over) { newGame(); return; }
    askConfirm(newGame);
  }

  /* ---------- 键盘 ---------- */
  var KEY_DIR = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  document.addEventListener('keydown', function (e) {
    if (confirmOpen) {
      if (e.key === 'Escape') { e.preventDefault(); closeConfirm(); }
      else if (e.key === 'Enter') { e.preventDefault(); confirmOkBtn.click(); }
      return;
    }
    var dir = KEY_DIR[e.key];
    if (dir) { e.preventDefault(); requestMove(dir); }
    else if (e.key === 'r' || e.key === 'R') { requestNewGame(); }
  });

  /* ---------- 触摸滑动 ---------- */
  var touchStart = null;
  boardEl.addEventListener('touchstart', function (e) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  boardEl.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  boardEl.addEventListener('touchend', function (e) {
    if (!touchStart) return;
    var dx = e.changedTouches[0].clientX - touchStart.x;
    var dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    var dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    requestMove(dir);
  }, { passive: true });

  /* ---------- 按钮 ---------- */
  document.querySelectorAll('[data-dir]').forEach(function (btn) {
    btn.addEventListener('click', function () { requestMove(btn.dataset.dir); });
  });
  newGameBtn.addEventListener('click', requestNewGame);
  confirmOkBtn.addEventListener('click', function () {
    var action = confirmAction;
    confirmEl.classList.remove('show');
    confirmOpen = false;
    confirmAction = null;
    if (action) action();
  });
  confirmCancelBtn.addEventListener('click', closeConfirm);
  confirmEl.addEventListener('click', function (e) {
    if (e.target === confirmEl) closeConfirm();
  });
  againBtn.addEventListener('click', newGame);
  keepGoingBtn.addEventListener('click', hideOverlay);
  overlayEl.addEventListener('click', function () {
    if (overlayEl.classList.contains('show') && keepGoingBtn.style.display !== 'none') {
      hideOverlay();
    }
  });

  /* ---------- 动画收尾 ---------- */
  boardEl.addEventListener('animationend', function (e) {
    if (e.target.classList.contains('tile-new') || e.target.classList.contains('tile-merged')) {
      e.target.classList.remove('tile-new');
      e.target.classList.remove('tile-merged');
    }
    if (e.target.classList.contains('flash')) {
      e.target.classList.remove('flash');
    }
  });

  /* ---------- 窗口尺寸变化 ---------- */
  var resizeTimer = null;
  function repositionAll() {
    boardEl.classList.add('no-anim');
    measure();
    tiles.forEach(function (entry) {
      applySize(entry.el);
      entry.el.style.setProperty('--tx', (entry.col * (cellPx + gapPx)) + 'px');
      entry.el.style.setProperty('--ty', (entry.row * (cellPx + gapPx)) + 'px');
      entry.el.style.transform = posOf(entry.row, entry.col);
    });
    requestAnimationFrame(function () { boardEl.classList.remove('no-anim'); });
  }
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(repositionAll, 120);
  });
  window.addEventListener('load', function () { repositionAll(); });

  /* ---------- 开局 ---------- */
  measure();
  best = parseInt(localStorage.getItem('t2048-best') || '0', 10) || 0;
  updateScore(false);
  if (!loadSave()) {
    spawn();
    spawn();
  }
})();
