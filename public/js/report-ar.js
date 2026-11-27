/* Ooz Marks — the Arabic section's report card (A4). Each page is drawn on a canvas (which shapes Arabic
   letters properly) and placed in the PDF as an image. No dates under the signatures: signed and stamped by hand. */
(function (root) {
'use strict';
const DPI = 200, MM = DPI / 25.4, W = Math.round(210 * MM), H = Math.round(297 * MM);
const AR = '٠١٢٣٤٥٦٧٨٩';
const digits = v => String(v).replace(/[0-9]/g, d => AR[+d]).replace(/\./g, '٫');
const num = v => { const r = Math.round(v * 100) / 100; return digits(r); };
function mix(hex, f) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = x => Math.round(x + (255 - x) * f); return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')'; }
function dark(hex, f) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = x => Math.round(x * (1 - f)); return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')'; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const F = (size, bold) => (bold ? '700 ' : '400 ') + Math.round(size * MM) + 'px A, S, sans-serif';
/** Text that shrinks to fit a width. */
function fit(g, text, x, y, maxW, size, bold, align) {
  let s = size; g.font = F(s, bold); while (s > 2 && g.measureText(text).width > maxW) { s -= 0.25; g.font = F(s, bold); }
  g.textAlign = align || 'center'; g.fillText(text, x, y);
}
function loadImage(src) { return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

function drawPage(g, p, ctx, logo) {
  const st = ctx.settings, ar = st.ar, C = ar.color || '#3D5E9E', mm = v => v * MM;
  g.direction = 'rtl'; g.textBaseline = 'middle';
  // background: a soft blue wash
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, dark(C, 0.25)); bg.addColorStop(0.5, C); bg.addColorStop(1, mix(C, 0.15));
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // header
  g.fillStyle = '#FFFFFF';
  if (logo) { const s = mm(30), r = logo.width / logo.height; const w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s; g.drawImage(logo, W - mm(12) - w, mm(10) + (s - h) / 2, w, h); }
  let y = mm(11);
  if (ar.basmala) { g.font = F(4.2, true); g.textAlign = 'center'; g.fillText('بسم الله الرحمن الرحيم', W / 2, y); y += mm(6); }
  if (ar.lines[0]) { fit(g, ar.lines[0], W / 2, y, mm(110), 3.6, false); y += mm(6.5); }
  if (ar.lines[1]) { fit(g, ar.lines[1], W / 2, y, mm(110), 4.6, true); y += mm(8); }
  const title = (ctx.term && ctx.term.titleAr) || ('نتيجة امتحانات ' + ((ctx.term && ctx.term.name) || ''));
  rr(g, mm(45), y - mm(5.2), mm(120), mm(10.4), mm(1.5)); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = mm(0.8); g.strokeStyle = dark(C, 0.35); g.stroke();
  g.fillStyle = dark(C, 0.55); fit(g, digits(title), W / 2, y, mm(112), 5, true);
  // the white card
  const cx = mm(9), cy = mm(52), cw = W - mm(18), ch = H - mm(60);
  g.fillStyle = '#FFFFFF'; rr(g, cx, cy, cw, ch, mm(7)); g.fill();
  const ix = cx + mm(6), iw = cw - mm(12); let yy = cy + mm(8);
  // name box
  const labelBox = (x, y0, w, h, label, value) => {
    g.lineWidth = mm(0.6); g.strokeStyle = C; g.strokeRect(x, y0, w, h);
    const lw = mm(26); g.fillStyle = C; g.fillRect(x + w - lw, y0, lw, h); g.fillStyle = '#FFFFFF'; fit(g, label, x + w - lw / 2, y0 + h / 2, lw - mm(3), 3.8, true);
    g.fillStyle = '#1F2A44'; fit(g, value, x + w - lw - mm(4), y0 + h / 2, w - lw - mm(8), 4.6, true, 'right');
  };
  labelBox(ix, yy, iw, mm(11), 'اسم الطالب:', p.student.name); yy += mm(15);
  // stage and class
  g.lineWidth = mm(0.6); g.strokeStyle = C; g.strokeRect(ix, yy, iw, mm(11));
  g.font = F(3.8, true); g.textAlign = 'right'; g.fillStyle = C; g.fillText('المرحلة الدراسية:', ix + iw - mm(3), yy + mm(5.5));
  const lw1 = g.measureText('المرحلة الدراسية:').width; g.fillStyle = '#1F2A44'; g.font = F(4.2, true); g.fillText(ar.stages[p.cls.stage] || '', ix + iw - mm(5) - lw1, yy + mm(5.5));
  g.font = F(3.8, true); g.fillStyle = C; g.fillText('الصف:', ix + iw * 0.45, yy + mm(5.5)); const lw2 = g.measureText('الصف:').width;
  g.fillStyle = '#1F2A44'; fit(g, p.cls.name, ix + iw * 0.45 - lw2 - mm(2), yy + mm(5.5), iw * 0.4, 4.2, true, 'right');
  yy += mm(17);
  // the table: subject · full mark · pass mark · student's mark (right to left)
  const rows = p.result.rows, R = p.result, tw = iw * 0.86, tx = ix + (iw - tw) / 2;
  const cols = [0.31, 0.23, 0.23, 0.23].map(f => f * tw); const colX = []; { let x = tx + tw; for (const w of cols) { x -= w; colX.push(x); } }
  const avail = cy + ch - mm(52) - yy, n = rows.length + 2, rh = Math.min(mm(17), avail / n), hh = Math.min(mm(14), rh * 0.95);
  const big = Math.min(9, rh / MM * 0.55), small = Math.min(4, rh / MM * 0.3);
  const cell = (i, y0, h, fill) => { g.fillStyle = fill; g.fillRect(colX[i], y0, cols[i], h); g.strokeStyle = '#FFFFFF'; g.lineWidth = mm(0.5); g.strokeRect(colX[i], y0, cols[i], h); };
  // header row
  const H1 = mix(C, 0.12);
  ['المادة', 'الدرجة الكاملة', 'درجة النجاح', 'درجة الطالب'].forEach((h, i) => { cell(i, yy, hh, H1); g.fillStyle = '#FFFFFF'; fit(g, h, colX[i] + cols[i] / 2, yy + hh / 2, cols[i] - mm(4), 3.8, true);
    g.font = F(3.8, true); const w = Math.min(g.measureText(h).width, cols[i] - mm(4)); g.fillRect(colX[i] + cols[i] / 2 - w / 2, yy + hh / 2 + mm(2.6), w, mm(0.35)); });
  yy += hh;
  rows.forEach((r, k) => {
    const fill = k % 2 ? mix(C, 0.78) : mix(C, 0.62);
    cell(0, yy, rh, mix(C, 0.3)); g.fillStyle = '#FFFFFF'; fit(g, r.subject.name, colX[0] + cols[0] / 2, yy + rh / 2, cols[0] - mm(4), small, true);
    if (r.kind === 'grade') {
      g.fillStyle = fill; g.fillRect(colX[2], yy, cols[1] + cols[2], rh); g.strokeStyle = '#FFFFFF'; g.strokeRect(colX[2], yy, cols[1] + cols[2], rh);
      g.fillStyle = '#1F2A44'; fit(g, 'تقدير', colX[2] + (cols[1] + cols[2]) / 2, yy + rh / 2, cols[1] + cols[2] - mm(4), big * 0.8, false);
      cell(3, yy, rh, fill); g.fillStyle = '#1F2A44'; fit(g, r.abs ? 'غائب' : (r.word || ''), colX[3] + cols[3] / 2, yy + rh / 2, cols[3] - mm(4), big * 0.8, true);
    } else {
      cell(1, yy, rh, fill); cell(2, yy, rh, fill); cell(3, yy, rh, fill);
      g.fillStyle = '#1F2A44'; fit(g, num(r.max), colX[1] + cols[1] / 2, yy + rh / 2, cols[1] - mm(4), big, false); fit(g, num(r.min), colX[2] + cols[2] / 2, yy + rh / 2, cols[2] - mm(4), big, false);
      g.fillStyle = r.fail ? '#C62828' : '#1F2A44'; fit(g, r.abs ? 'غ' : r.value == null ? '' : num(r.value), colX[3] + cols[3] / 2, yy + rh / 2, cols[3] - mm(4), big, r.fail);
    }
    yy += rh;
  });
  // total
  cell(0, yy, rh, mix(C, 0.3)); g.fillStyle = '#FFFFFF'; fit(g, 'المجموع', colX[0] + cols[0] / 2, yy + rh / 2, cols[0] - mm(4), small, true);
  [R.total.max, R.total.min, R.total.got].forEach((v, i) => { cell(i + 1, yy, rh, mix(C, 0.7)); g.fillStyle = i === 2 && R.total.fail ? '#C62828' : '#1F2A44'; fit(g, num(v), colX[i + 1] + cols[i + 1] / 2, yy + rh / 2, cols[i + 1] - mm(4), big, i === 2); });
  yy += rh + mm(9);
  // overall grade
  const gw = mm(80), gx = W / 2 - gw / 2, gh = mm(9);
  g.fillStyle = mix(C, 0.15); g.fillRect(gx + gw / 2, yy, gw / 2, gh); g.fillStyle = '#FFFFFF'; fit(g, 'التقدير', gx + gw * 0.75, yy + gh / 2, gw / 2 - mm(4), 3.8, true);
  g.fillStyle = '#E8EEF8'; g.fillRect(gx, yy, gw / 2, gh); g.strokeStyle = dark(C, 0.2); g.lineWidth = mm(0.4); g.strokeRect(gx, yy, gw, gh);
  g.fillStyle = R.total.fail ? '#C62828' : '#1F2A44'; fit(g, R.total.label || '', gx + gw / 4, yy + gh / 2, gw / 2 - mm(4), 4.2, true);
  // signatures: label boxes with an empty box beside each (signed by hand)
  const sy = cy + ch - mm(22), signs = ar.signs.length ? ar.signs : ['مشرف الصف', 'مدير المرحلة', 'مدير المدرسة'], sw = iw / signs.length, sh = mm(8);
  signs.forEach((s, i) => { const x0 = ix + iw - sw * (i + 1); const lw = sw * 0.45;
    g.fillStyle = mix(C, 0.15); g.fillRect(x0 + sw - lw, sy, lw, sh); g.fillStyle = '#FFFFFF'; fit(g, s, x0 + sw - lw / 2, sy + sh / 2, lw - mm(2), 3.2, true);
    g.fillStyle = '#F3F6FB'; g.fillRect(x0, sy, sw - lw, sh); g.strokeStyle = dark(C, 0.2); g.lineWidth = mm(0.35); g.strokeRect(x0, sy, sw, sh); });
}

async function build(pages, ctx) {
  const PDF = root.PDFLib; if (!PDF) throw new Error('pdf-lib missing');
  try { await Promise.all(['700 40px A', '400 40px A'].map(f => document.fonts.load(f, 'ابت'))); } catch (e) {}
  const logo = await loadImage(ctx.logo), doc = await PDF.PDFDocument.create();
  doc.setTitle('نتائج الطلاب'); doc.setCreator('Ooz Marks');
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  for (const p of pages) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); drawPage(g, p, ctx, logo);
    const url = cv.toDataURL('image/jpeg', 0.9), bytes = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0));
    const img = await doc.embedJpg(bytes), page = doc.addPage([595.28, 841.89]); page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  return doc.save();
}
root.OozReportAr = { build, digits };
})(this);
