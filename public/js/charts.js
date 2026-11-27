/* Ooz Marks — 3D charts drawn as SVG (no library, works offline): bars standing on a floor, a tilted ring,
   split bars, level cubes and a ribbon for two terms. Every chart scales to its box (viewBox, width 100%). */
(function (root) {
'use strict';
let uid = 0;
const id = p => p + (++uid);
const X = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function shade(h, f) { let [r, g, b] = rgb(h); const m = c => Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f)); return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
const fmt = v => (Math.round(v * 10) / 10).toString();
/** Theme colours: read from the page, or fixed light ones for export. */
function theme(light) {
  if (light || typeof getComputedStyle !== 'function') return { ink: '#2A2826', mute: '#6B6055', line: '#EADFCF', floor: '#F3EADC', hole: '#FBF6EF', avg: '#B9AE9F' };
  const s = getComputedStyle(document.documentElement), v = k => s.getPropertyValue(k).trim();
  return { ink: v('--ink') || '#2A2826', mute: v('--mute') || '#6B6055', line: v('--line') || '#EADFCF', floor: v('--soft') || '#F3EADC', hole: v('--card') || '#FFFFFF', avg: '#B9AE9F' };
}
const svgOpen = (W, H, label) => '<svg class="ch3" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + X(label) + '" style="width:100%;height:auto;max-width:' + W + 'px;display:block;margin:auto;overflow:visible">';
const FONT = 'font-family="S,A,sans-serif"';
function box(x, y0, w, h, col, delay, dx = 14, dy = -9) {
  const g = id('g'), top = y0 - h;
  return '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(col, 0.18) + '"/><stop offset="1" stop-color="' + shade(col, -0.08) + '"/></linearGradient></defs>' +
    '<g class="rise" style="animation-delay:' + delay.toFixed(2) + 's">' +
    '<path d="M' + (x + w) + ',' + top + ' L' + (x + w + dx) + ',' + (top + dy) + ' L' + (x + w + dx) + ',' + (y0 + dy) + ' L' + (x + w) + ',' + y0 + ' Z" fill="' + shade(col, -0.28) + '"/>' +
    '<rect x="' + x + '" y="' + top + '" width="' + w + '" height="' + Math.max(0, h) + '" fill="url(#' + g + ')"/>' +
    '<path d="M' + x + ',' + top + ' L' + (x + w) + ',' + top + ' L' + (x + w + dx) + ',' + (top + dy) + ' L' + (x + dx) + ',' + (top + dy) + ' Z" fill="' + shade(col, 0.38) + '"/>' +
    (h > 8 ? '<rect x="' + (x + 3) + '" y="' + (top + 3) + '" width="' + Math.max(1, w * 0.18) + '" height="' + (h - 6) + '" fill="#fff" opacity=".16"/>' : '') + '</g>';
}
/** items: [{label, sub, value, color}] or with pair: [{label, value, other}]. Drawn right to left (first item on the right). */
function bars(items, o) {
  o = Object.assign({ W: 560, H: 300, max: 100, unit: '%', pair: false, avg: null, avgLabel: '', base: '#E8A93A', light: false, label: '' }, o || {});
  const T = theme(o.light), n = Math.max(1, items.length), x0 = 20, x1 = o.W - 46, y0 = o.H - 46, top = 34, sc = (y0 - top) / (o.max || 1), Y = v => y0 - Math.max(0, Math.min(o.max, v)) * sc;
  let s = svgOpen(o.W, o.H, o.label);
  s += '<path d="M' + x0 + ',' + y0 + ' L' + x1 + ',' + y0 + ' L' + (x1 + 14) + ',' + (y0 - 9) + ' L' + (x0 + 14) + ',' + (y0 - 9) + ' Z" fill="' + T.floor + '"/>';
  for (let i = 1; i <= 4; i++) { const v = o.max * i / 4, y = Y(v) - 9; s += '<line x1="' + (x0 + 14) + '" y1="' + y + '" x2="' + (x1 + 14) + '" y2="' + y + '" stroke="' + T.line + '" stroke-dasharray="3 4"/><text x="' + (x1 + 22) + '" y="' + (y + 4) + '" font-size="11" fill="' + T.mute + '" ' + FONT + '>' + fmt(v) + o.unit + '</text>'; }
  const slot = (x1 - x0) / n, w = o.bw || Math.min(64, slot * (o.pair ? 0.36 : 0.5));
  items.forEach((it, i) => {
    const cx = x1 - slot * (i + 0.5);
    if (o.pair) {
      s += box(cx - w - 3, y0, w, (it.other || 0) * sc, T.avg, 0.08 * i) + box(cx + 3, y0, w, (it.value || 0) * sc, it.color || o.base, 0.08 * i + 0.05);
      s += '<text x="' + (cx + 3 + w / 2 + 7) + '" y="' + (Y(it.value) - 18) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + T.ink + '" ' + FONT + '>' + fmt(it.value) + '</text>';
      s += '<text x="' + (cx - 3 - w / 2 + 7) + '" y="' + (Y(it.other) - 18) + '" text-anchor="middle" font-size="11" fill="' + T.mute + '" ' + FONT + '>' + fmt(it.other) + '</text>';
    } else {
      s += box(cx - w / 2, y0, w, (it.value || 0) * sc, it.color || o.base, 0.08 * i);
      s += '<text x="' + (cx + 7) + '" y="' + (Y(it.value) - 17) + '" text-anchor="middle" font-size="14" font-weight="700" fill="' + T.ink + '" ' + FONT + '>' + fmt(it.value) + o.unit + '</text>';
    }
    const lab = String(it.label), small = lab.length > 12 || n > 6;
    s += '<text x="' + (cx + 5) + '" y="' + (y0 + 20) + '" text-anchor="middle" font-size="' + (small ? 11 : 13) + '" font-weight="700" fill="' + T.ink + '" ' + FONT + '>' + X(lab.length > 18 ? lab.slice(0, 17) + '…' : lab) + '</text>';
    if (it.sub) s += '<text x="' + (cx + 5) + '" y="' + (y0 + 37) + '" text-anchor="middle" font-size="11" fill="' + T.mute + '" ' + FONT + '>' + X(it.sub) + '</text>';
  });
  if (o.avg != null) { const y = Y(o.avg); s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + (x1 + 14) + '" y2="' + (y - 9) + '" stroke="' + T.ink + '" stroke-width="1.5" stroke-dasharray="6 5" opacity=".55"/><text x="' + x0 + '" y="' + (y - 8) + '" font-size="11" fill="' + T.ink + '" ' + FONT + '>' + X(o.avgLabel) + ' \u2066' + fmt(o.avg) + o.unit + '\u2069' + '</text>'; }
  return s + '</svg>';
}
/** slices: [{value, color}] — a tilted ring with a wall and a number in the middle. */
function donut(slices, o) {
  o = Object.assign({ W: 330, H: 230, big: '', small: '', depth: 22, inner: 0.56, light: false, label: '' }, o || {});
  const T = theme(o.light), rx = o.rx || Math.min(o.W, o.H * 1.6) / 2 - 14, ry = rx * 0.56, cx = o.W / 2, cy = o.H / 2 - o.depth / 2;
  const tot = slices.reduce((a, b) => a + b.value, 0); let s = svgOpen(o.W, o.H, o.label) + '<g class="spin">';
  s += '<ellipse cx="' + cx + '" cy="' + (cy + o.depth + 8) + '" rx="' + (rx * 0.95) + '" ry="' + (ry * 0.8) + '" fill="#000" opacity=".08"/>';
  if (!tot) { s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + T.floor + '"/>'; }
  const P = (a, r) => [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  const arc = (a0, a1, r, dy) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * 24)), out = []; for (let i = 0; i <= n; i++) { const [x, y] = P(a0 + (a1 - a0) * i / n, r); out.push(x.toFixed(1) + ',' + (y + (dy || 0)).toFixed(1)); } return out; };
  let a = -Math.PI / 2; const segs = [];
  for (const sl of slices) { if (!sl.value) continue; const b = a + 2 * Math.PI * sl.value / tot; segs.push([a, b, sl.color]); a = b; }
  const walls = [];
  for (const [a0, b0, c] of segs) {
    for (const off of [0, 2 * Math.PI]) { const l = Math.max(a0, off), h = Math.min(b0, off + Math.PI); if (h > l) walls.push([l, h, c, 1]); }
    for (const off of [-Math.PI, Math.PI]) { const l = Math.max(a0, off), h = Math.min(b0, off + Math.PI); if (h > l) walls.push([l, h, c, 0]); }
  }
  walls.sort((p, q) => p[3] - q[3]).forEach(([l, h, c, outer]) => { const r = outer ? 1 : o.inner; s += '<path d="M' + arc(l, h, r).concat(arc(h, l, r, o.depth)).join(' L') + ' Z" fill="' + shade(c, outer ? -0.3 : -0.42) + '"/>'; });
  segs.forEach(([a0, b0, c], i) => { s += '<path class="pop" style="animation-delay:' + (0.1 * i).toFixed(2) + 's" d="M' + arc(a0, b0, 1).concat(arc(b0, a0, o.inner)).join(' L') + ' Z" fill="' + shade(c, 0.08) + '" stroke="' + T.hole + '" stroke-width="1.5"/>'; });
  s += '</g><text x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" font-size="26" font-weight="700" fill="' + T.ink + '" ' + FONT + '>' + X(o.big) + '</text>';
  s += '<text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle" font-size="12" fill="' + T.mute + '" ' + FONT + '>' + X(o.small) + '</text>';
  return s + '</svg>';
}
/** rows: [{label, segs:[{value,color}], right}] — horizontal split bars, from the right. */
function stack(rows, o) {
  o = Object.assign({ W: 620, rowh: 38, gap: 20, lw: 130, light: false, label: '' }, o || {});
  const T = theme(o.light), H = rows.length * (o.rowh + o.gap) + 10, x1 = o.W - o.lw, x0 = 64, dx = 12, dy = -8;
  let s = svgOpen(o.W, H, o.label);
  rows.forEach((r, i) => {
    const y = i * (o.rowh + o.gap) + 18, tot = r.segs.reduce((a, b) => a + b.value, 0) || 1; let x = x1, first = true;
    s += '<text x="' + (o.W - 6) + '" y="' + (y + o.rowh / 2 + 5) + '" text-anchor="end" font-size="13" font-weight="700" fill="' + T.ink + '" ' + FONT + '>' + X(r.label) + '</text><g class="grow" style="animation-delay:' + (0.1 * i).toFixed(2) + 's">';
    if (!r.segs.some(g => g.value)) s += '<rect x="' + x0 + '" y="' + y + '" width="' + (x1 - x0) + '" height="' + o.rowh + '" fill="' + T.floor + '"/>';
    for (const g of r.segs) {
      const w = (x1 - x0) * g.value / tot; if (w <= 0) continue; const xa = x - w;
      s += '<path d="M' + xa + ',' + y + ' L' + x + ',' + y + ' L' + (x + dx) + ',' + (y + dy) + ' L' + (xa + dx) + ',' + (y + dy) + ' Z" fill="' + shade(g.color, 0.35) + '"/><rect x="' + xa + '" y="' + y + '" width="' + w + '" height="' + o.rowh + '" fill="' + g.color + '"/>';
      if (first) { s += '<path d="M' + x + ',' + y + ' L' + (x + dx) + ',' + (y + dy) + ' L' + (x + dx) + ',' + (y + o.rowh + dy) + ' L' + x + ',' + (y + o.rowh) + ' Z" fill="' + shade(g.color, -0.3) + '"/>'; first = false; }
      if (w > 24) s += '<text x="' + (xa + w / 2) + '" y="' + (y + o.rowh / 2 + 5) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" ' + FONT + '>' + g.value + '</text>';
      x = xa;
    }
    s += '</g><text x="' + (x0 - 10) + '" y="' + (y + o.rowh / 2 + 5) + '" text-anchor="end" font-size="13" font-weight="700" fill="' + T.ink + '" ' + FONT + '>' + X(r.right) + '</text>';
  });
  return s + '</svg>';
}
/** n of total little cubes lit, from the right. */
function cubes(n, col, o) {
  o = Object.assign({ total: 10, size: 13, gap: 5, light: false }, o || {});
  const W = o.total * (o.size + o.gap) + 8, H = o.size + 10, off = theme(o.light).line;
  let s = '<svg class="cubes" direction="ltr" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true" style="display:block">';
  for (let i = 0; i < o.total; i++) {
    const x = W - (i + 1) * (o.size + o.gap), y = 7, on = i < n, c = on ? col : off, z = o.size;
    s += '<g class="' + (on ? 'pop' : '') + '" style="animation-delay:' + (0.04 * i).toFixed(2) + 's"><path d="M' + x + ',' + y + ' L' + (x + z) + ',' + y + ' L' + (x + z + 5) + ',' + (y - 4) + ' L' + (x + 5) + ',' + (y - 4) + ' Z" fill="' + shade(c, 0.35) + '"/><path d="M' + (x + z) + ',' + y + ' L' + (x + z + 5) + ',' + (y - 4) + ' L' + (x + z + 5) + ',' + (y + z - 4) + ' L' + (x + z) + ',' + (y + z) + ' Z" fill="' + shade(c, -0.25) + '"/><rect x="' + x + '" y="' + y + '" width="' + z + '" height="' + z + '" rx="2" fill="' + c + '"/></g>';
  }
  return s + '</svg>';
}
/** Two series over the same labels (previous and current term), as 3D ribbons. */
function ribbon(series, labels, o) {
  o = Object.assign({ W: 520, H: 230, min: 0, max: 100, cols: ['#B9AE9F', '#E8A93A'], light: false, label: '' }, o || {});
  const T = theme(o.light), n = labels.length, x0 = 30, x1 = o.W - 40, y0 = o.H - 34, top = 20;
  const Xp = i => n < 2 ? (x0 + x1) / 2 : x1 - (x1 - x0) * i / (n - 1), Yp = v => y0 - (Math.max(o.min, v) - o.min) / (o.max - o.min) * (y0 - top);
  let s = svgOpen(o.W, o.H, o.label);
  for (let k = 1; k <= 3; k++) { const v = o.min + (o.max - o.min) * k / 4; s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Yp(v) + '" y2="' + Yp(v) + '" stroke="' + T.line + '" stroke-dasharray="3 4"/><text x="' + (x1 + 6) + '" y="' + (Yp(v) + 4) + '" font-size="11" fill="' + T.mute + '" ' + FONT + '>' + fmt(v) + '</text>'; }
  series.forEach((ser, k) => {
    const pts = ser.map((v, i) => v == null ? null : [Xp(i), Yp(v)]).filter(Boolean), c = o.cols[k]; if (!pts.length) return;
    const d = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
    s += '<path d="M' + d + ' L' + pts.slice().reverse().map(p => (p[0] + 10).toFixed(1) + ',' + (p[1] - 7).toFixed(1)).join(' L') + ' Z" fill="' + shade(c, 0.25) + '" opacity=".75"/>';
    s += '<path class="draw" d="M' + d + '" fill="none" stroke="' + c + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(p => { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#fff" stroke="' + c + '" stroke-width="3"/>'; });
  });
  labels.forEach((l, i) => { s += '<text x="' + Xp(i) + '" y="' + (y0 + 22) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + T.ink + '" ' + FONT + '>' + X(String(l).length > 12 ? String(l).slice(0, 11) + '…' : l) + '</text>'; });
  return s + '</svg>';
}
/** An SVG chart as a PNG data URL (for the PDF), on a white page. */
function toPng(svg, scale) {
  return new Promise((res, rej) => {
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg); const W = +vb[1], H = +vb[2], k = scale || 2;
    const src = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" ').replace(/class="(rise|pop|grow|spin|draw)"/g, '');
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W * k; c.height = H * k; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); res({ url: c.toDataURL('image/png'), W, H }); };
    img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  });
}
root.OozCharts = { bars, donut, stack, cubes, ribbon, shade, toPng };
})(this);
