// Ghost aim line — traces bullet path with wall reflections

export function traceAimLine({ startX, startY, angle, screenW, balls, ballR, maxBounces = 2 }) {
  const pts = [{ x: startX, y: startY }];
  let x = startX, y = startY;
  let vx = Math.cos(angle), vy = Math.sin(angle);
  const STEP = ballR * 0.55;
  let bounces = 0, len = 0, maxLen = screenW * 3;

  while (len < maxLen && bounces <= maxBounces) {
    x += vx * STEP; y += vy * STEP; len += STEP;

    if (x - ballR < 0)        { x = ballR;         vx =  Math.abs(vx); bounces++; pts.push({ x, y }); continue; }
    if (x + ballR > screenW)  { x = screenW - ballR; vx = -Math.abs(vx); bounces++; pts.push({ x, y }); continue; }
    if (y < 100)              { pts.push({ x, y: 100 }); break; }

    const hit = balls.find(b => {
      if (b.popping || b.falling) return false;
      const dx = b.x - x, dy = b.y - y;
      return dx * dx + dy * dy < (ballR * 2) * (ballR * 2) * 0.8;
    });
    if (hit) { pts.push({ x, y }); break; }
  }
  if (pts.length < 2) pts.push({ x, y });
  return pts;
}

// Cluster shape generators — returns array of [col, row] hex offsets
export const SHAPES = [
  // compact hex block
  n => { const c = Math.ceil(Math.sqrt(n * 1.2)), r = []; for (let i = 0; i < n; i++) r.push([i % c, Math.floor(i / c)]); return r; },
  // diamond
  n => { const r = [], s = Math.ceil(Math.sqrt(n)); let placed = 0; for (let row = 0; row < s * 2 - 1 && placed < n; row++) { const w = row < s ? row + 1 : s * 2 - 1 - row; for (let c = 0; c < w && placed < n; c++) { r.push([c - Math.floor(w / 2), row - Math.floor((s * 2 - 2) / 2)]); placed++; } } return r; },
  // triangle up
  n => { const r = []; let row = 0, placed = 0; while (placed < n) { for (let c = 0; c < row + 1 && placed < n; c++) { r.push([c - Math.floor((row + 1) / 2), row]); placed++; } row++; } return r; },
  // hexagon ring
  n => { const r = [[0, 0]]; const dirs = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; let ring = 1; while (r.length < n) { let cx = ring, cy = 0; for (let d = 0; d < 6; d++) for (let s = 0; s < ring && r.length < n; s++) { cx += dirs[d][0]; cy += dirs[d][1]; r.push([cx, cy]); } ring++; } return r.slice(0, n); },
  // spiral
  n => { const r = [], dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; let x = 0, y = 0, d = 0, steps = 1, sc = 0, tc = 0; r.push([x, y]); while (r.length < n) { x += dirs[d % 4][0]; y += dirs[d % 4][1]; r.push([x, y]); sc++; if (sc === steps) { sc = 0; d++; tc++; if (tc === 2) { tc = 0; steps++; } } } return r.slice(0, n); },
];

export function buildCluster(letters, R, cx, cy) {
  const n = letters.length;
  const shp = SHAPES[Math.floor(Math.random() * SHAPES.length)](n);
  const avgC = shp.reduce((s, o) => s + o[0], 0) / n;
  const avgR = shp.reduce((s, o) => s + o[1], 0) / n;
  return letters.map((ch, i) => {
    const [dc, dr] = shp[i];
    return {
      ch,
      x: cx + (dc - avgC) * R * 2 + (Math.round(dr - avgR) % 2 !== 0 ? R : 0),
      y: cy + (dr - avgR) * R * 1.76,
    };
  });
}
