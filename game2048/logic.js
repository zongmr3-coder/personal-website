/* ===================== 核心逻辑（无 DOM 依赖，可独立测试） ===================== */
(function (global) {
  'use strict';

  var SIZE = 4;
  var idCounter = 0;

  function createGrid() {
    var g = [];
    for (var r = 0; r < SIZE; r++) g.push(new Array(SIZE).fill(null));
    return g;
  }

  function emptyCells(grid) {
    var cells = [];
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (!grid[r][c]) cells.push([r, c]);
    return cells;
  }

  // 在随机空格生成新方块，90% 是 2，10% 是 4
  function addRandomTile(grid) {
    var cells = emptyCells(grid);
    if (!cells.length) return { grid: grid, tile: null };
    var pick = cells[Math.floor(Math.random() * cells.length)];
    var tile = { id: ++idCounter, value: Math.random() < 0.9 ? 2 : 4 };
    grid[pick[0]][pick[1]] = tile;
    return { grid: grid, tile: tile };
  }

  function rotateCW(g) {
    var out = createGrid();
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        out[c][SIZE - 1 - r] = g[r][c];
    return out;
  }

  function rotateCCW(g) {
    var out = createGrid();
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        out[SIZE - 1 - c][r] = g[r][c];
    return out;
  }

  // 把旋转后的坐标还原为原始坐标
  function unrotate(r, c, times) {
    for (var i = 0; i < times; i++) {
      var nr = SIZE - 1 - c;
      var nc = r;
      r = nr;
      c = nc;
    }
    return [r, c];
  }

  /**
   * 执行一次移动
   * dir: 'left' | 'right' | 'up' | 'down'
   * 返回 { grid, moved, moves, merges, score }
   *  - moves:  移动但未合并的方块 [{id, fr, fc, tr, tc}]
   *  - merges: 被合并的方块  [{id, value, fr, fc, tr, tc, into}]
   */
  function move(grid, dir) {
    var rotMap = { left: 0, up: 3, right: 2, down: 1 };
    var rot = rotMap[dir];
    if (rot === undefined) return { grid: grid, moved: false, moves: [], merges: [], score: 0 };

    var g = grid;
    for (var i = 0; i < rot; i++) g = rotateCW(g);

    var ng = createGrid();
    var moves = [];
    var merges = [];
    var score = 0;
    var moved = false;

    for (var r = 0; r < SIZE; r++) {
      var write = 0;
      for (var c = 0; c < SIZE; c++) {
        var t = g[r][c];
        if (!t) continue;
        var prev = ng[r][write - 1];
        if (prev && prev.value === t.value && !prev.merged) {
          prev.merged = true;
          prev.value *= 2;
          merges.push({ id: t.id, value: t.value, fr: r, fc: c, tr: r, tc: write - 1, into: prev.id });
          score += prev.value;
          moved = true;
        } else {
          if (c !== write) moved = true;
          moves.push({ id: t.id, fr: r, fc: c, tr: r, tc: write });
          ng[r][write] = t;
          write++;
        }
      }
    }

    if (!moved) return { grid: grid, moved: false, moves: [], merges: [], score: 0 };

    // 坐标还原
    moves.forEach(function (m) {
      var a = unrotate(m.fr, m.fc, rot);
      var b = unrotate(m.tr, m.tc, rot);
      m.fr = a[0]; m.fc = a[1]; m.tr = b[0]; m.tc = b[1];
    });
    merges.forEach(function (m) {
      var a = unrotate(m.fr, m.fc, rot);
      var b = unrotate(m.tr, m.tc, rot);
      m.fr = a[0]; m.fc = a[1]; m.tr = b[0]; m.tc = b[1];
    });

    var result = ng;
    for (var j = 0; j < rot; j++) result = rotateCCW(result);
    for (var r2 = 0; r2 < SIZE; r2++)
      for (var c2 = 0; c2 < SIZE; c2++)
        if (result[r2][c2]) delete result[r2][c2].merged;

    return { grid: result, moved: true, moves: moves, merges: merges, score: score };
  }

  // 是否还有可移动的余地（有空格或相邻相同）
  function canMove(grid) {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++) {
        var t = grid[r][c];
        if (!t) return true;
        var right = grid[r][c + 1];
        if (right && t.value === right.value) return true;
        var below = r + 1 < SIZE ? grid[r + 1][c] : null;
        if (below && t.value === below.value) return true;
      }
    return false;
  }

  function hasValue(grid, v) {
    for (var r = 0; r < SIZE; r++)
      for (var c = 0; c < SIZE; c++)
        if (grid[r][c] && grid[r][c].value === v) return true;
    return false;
  }

  // 从存档数据恢复棋盘，并保证新生成的方块 id 不与存档冲突
  function restoreGrid(list) {
    var g = createGrid();
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.id > idCounter) idCounter = t.id;
      g[t.row][t.col] = { id: t.id, value: t.value };
    }
    return g;
  }

  global.Twenty48 = {
    SIZE: SIZE,
    createGrid: createGrid,
    addRandomTile: addRandomTile,
    move: move,
    canMove: canMove,
    hasValue: hasValue,
    restoreGrid: restoreGrid
  };
})(typeof window !== 'undefined' ? window : globalThis);
