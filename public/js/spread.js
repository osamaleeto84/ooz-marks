/* Ooz Marks — the class spreadsheet (broadsheet): every student of a class in one table, a column per subject
   (with its full mark), then the total, the percentage and the rank in the class. A4 landscape, English or Arabic
   (right to left, Arabic digits). Failed marks are circled; absent shows Abs / غ. Drawn on a canvas (Arabic shaping),
   one image per page in the PDF. OozSpread.build(sheets, ctx) → Uint8Array; OozSpread.rows(sheet) for Excel. */
(function (root) {
'use strict';
const DPI = 200, MM = DPI / 25.4;
/* Paper: A4 or A3 landscape. On A3 the same design is drawn 1.2× larger (sharper and easier to read) and a page
   holds more students. U = pixels per design millimetre. */
const PAPER = { A4: { w: 297, h: 210, k: 1, per: 24, pt: [841.89, 595.28] }, A3: { w: 420, h: 297, k: 1.2, per: 35, pt: [1190.55, 841.89] } };
let W = 0, H = 0, U = MM;
function paper(name) { const p = PAPER[name] || PAPER.A4; W = Math.round(p.w * MM); H = Math.round(p.h * MM); U = MM * p.k; return p; }
paper('A4');
const AD = '٠١٢٣٤٥٦٧٨٩';
const F = (size, bold) => (bold ? '700 ' : '400 ') + Math.round(size * U) + 'px A, S, sans-serif';
function loadImage(src) { return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function fit(g, text, x, y, maxW, size, bold, align) {
  let s = size; g.font = F(s, bold); while (s > 1.6 && g.measureText(text).width > maxW) { s -= 0.2; g.font = F(s, bold); }
  g.textAlign = align || 'center'; g.fillText(text, x, y); return s;
}
/** Words over up to `max` lines inside a width (subject names in the header). */
function wrap(g, text, maxW, size, bold, max) {
  for (let s = size; s >= 1.8; s -= 0.2) {
    g.font = F(s, bold); const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width <= maxW) cur = tt; else { if (cur) lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    if (lines.length <= max && lines.every(l => g.measureText(l).width <= maxW)) return { lines, size: s };
  }
  return { lines: [text], size: 1.8 };
}

/** The table's content for one class: what both the PDF and the Excel file show. */
function rows(sheet) {
  const ar = sheet.ar, subs = sheet.subjects.filter(s => s.counted), marks = subs.filter(s => s.kind !== 'grade'), words = subs.filter(s => s.kind === 'grade');
  const full = marks.reduce((a, s) => a + (+s.max || 0), 0);
  const list = sheet.students.map(x => {
    const r = x.result, cells = {};
    for (const row of r.rows) cells[row.subject.id] = row;
    for (const sub of r.exempt || []) cells[sub.id] = { subject: sub, exempt: true };
    const done = r.complete !== false;   // total, % and rank only when every mark is in
    return { student: x.student, r, cells, pct: done ? r.total.pct : null, got: done ? r.total.got : null, max: r.total.max };
  });
  // rank: by percentage among those with a result; equal percentages share a rank (1, 1, 3)
  const ranked = list.filter(x => x.pct != null).sort((a, b) => b.pct - a.pct);
  ranked.forEach((x, i) => { x.rank = i && Math.abs(ranked[i - 1].pct - x.pct) < 1e-9 ? ranked[i - 1].rank : i + 1; });
  const avg = {}; for (const s of marks) { const v = list.map(x => x.cells[s.id]).filter(c => c && !c.abs && !c.exempt && c.value != null).map(c => c.value); avg[s.id] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
  const tv = list.filter(x => x.got != null && x.pct != null), pv = tv.map(x => x.pct);
  return { ar, marks, words, full, list, avg, avgTotal: tv.length ? tv.reduce((a, x) => a + x.got, 0) / tv.length : null, avgPct: pv.length ? pv.reduce((a, b) => a + b, 0) / pv.length : null };
}

function drawPage(g, sheet, T, part, ctx, logo) {
  const ar = sheet.ar, mm = v => v * U, st = ctx.settings;
  const dg = v => ar ? String(v).replace(/[0-9]/g, d => AD[+d]).replace(/\./g, '٫') : String(v);
  const n2 = v => v == null ? '' : dg(Math.round(v * 100) / 100), pct = v => v == null ? '' : dg(Math.round(v)) + (ar ? '٪' : '%');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle'; g.direction = ar ? 'rtl' : 'ltr';
  const L = mm(10), R = W - mm(10), cx = W / 2;
  // header: logo on the reading side, three centred lines
  if (logo) { const s = mm(24), k = logo.width / logo.height, w = k >= 1 ? s : s * k, h = k >= 1 ? s / k : s; g.drawImage(logo, ar ? R - w : L, mm(8) + (s - h) / 2, w, h); }
  g.fillStyle = '#111111';
  const school = ar ? ((st.ar && st.ar.lines && st.ar.lines[1]) || st.schoolName || '') : (st.schoolName || '').toUpperCase();
  const term = ctx.term || {};
  const t1 = ar ? 'الكشف التجميعي — ' + (term.titleAr || term.name || '') : 'SPREAD SHEET FOR ' + String(term.name || '').toUpperCase();
  const when = new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-arab' : 'en-GB', { month: 'long', year: 'numeric' }).format(ctx.date || new Date());
  fit(g, school, cx, mm(12), mm(170), 6, true);
  fit(g, dg(t1), cx, mm(19.5), mm(170), 5, true);
  fit(g, (ar ? 'النتائج: ' : 'RESULTS ') + when, cx, mm(26.5), mm(170), 4.6, true);
  // GRADE / TEACHER line
  const yI = mm(37); g.font = F(4.4, true);
  const lab = (text, value, x, align, w) => { g.textAlign = align; g.font = F(4.4, true); g.fillStyle = '#111'; g.fillText(text, x, yI); const lw = g.measureText(text).width + mm(2);
    const vx = align === 'left' ? x + lw : x - lw; if (value) { g.fillStyle = '#1F3F8F'; fit(g, value, vx, yI, w - lw, 4.6, false, align); }
    else { g.strokeStyle = '#555'; g.setLineDash([mm(0.6), mm(0.8)]); g.lineWidth = mm(0.25); g.beginPath(); g.moveTo(vx, yI + mm(1.8)); g.lineTo(align === 'left' ? vx + w - lw : vx - (w - lw), yI + mm(1.8)); g.stroke(); g.setLineDash([]); } };
  if (ar) { lab('الصف:', dg(sheet.cls.name), R - mm(30), 'right', mm(90)); lab('مربي الفصل:', sheet.teacher, L + mm(100), 'right', mm(95)); }
  else { lab('GRADE:', sheet.cls.name, L + mm(30), 'left', mm(90)); lab('TEACHER:', sheet.teacher, R - mm(100), 'left', mm(95)); }

  // the table
  const D = T.marks.length, Wd = T.words.length;
  const top = mm(44), last = part.last, bottom = H - (last ? mm(24) : mm(12));
  const colNo = mm(8), colName = Math.min(mm(62), mm(30) + mm(3.2) * Math.max(10, 24 - D)), colTot = mm(17), colPct = mm(14), colRank = mm(15);
  const left = W - mm(20) - colNo - colName - colTot - colPct - colRank, nSub = D + Wd;
  const colSub = nSub ? Math.min(mm(34), left / nSub) : 0;
  const tableW = colNo + colName + colSub * nSub + colTot + colPct + colRank, x0 = (W - tableW) / 2;
  // logical columns, placed left→right (English) or right→left (Arabic)
  const cols = [['no', colNo], ['name', colName]].concat(T.marks.map(s => ['m' + s.id, colSub, s]), T.words.map(s => ['w' + s.id, colSub, s]), [['tot', colTot], ['pct', colPct], ['rank', colRank]]);
  let x = ar ? x0 + tableW : x0; const X = {};
  for (const [k, w] of cols) { if (ar) { x -= w; X[k] = [x, w]; } else { X[k] = [x, w]; x += w; } }
  const hh = mm(16), n = part.items.length + (last ? 1 : 0);
  const rh = Math.min(mm(8.5), (bottom - top - hh) / Math.max(1, n));
  const fs = Math.min(4.2, rh / U * 0.56);
  // header row
  g.fillStyle = '#EDEDED'; g.fillRect(x0, top, tableW, hh);
  g.fillStyle = '#111';
  const head = (k, lines, size) => { const [cx0, w] = X[k]; const lh = mm(size) * 1.18, y0 = top + hh / 2 - (lines.length - 1) * lh / 2;
    g.font = F(size, true); g.textAlign = 'center'; lines.forEach((l, i) => g.fillText(l, cx0 + w / 2, y0 + i * lh)); };
  head('no', ['#'], 3.4); head('name', [ar ? 'اسم الطالب' : 'NAME OF THE STUDENT'], Math.min(3.8, colName / U / 13));
  for (const s of T.marks) { const nm = ar ? s.name : String(s.name).toUpperCase(), wr = wrap(g, nm, colSub - mm(2), 3.3, true, 3); head('m' + s.id, wr.lines.concat(['(' + dg(s.max) + ')']), wr.size); }
  for (const s of T.words) { const nm = ar ? s.name : String(s.name).toUpperCase(), wr = wrap(g, nm, colSub - mm(2), 3.3, true, 3); head('w' + s.id, wr.lines.concat([ar ? '(تقدير)' : '(GRADE)']), wr.size); }
  head('tot', [ar ? 'المجموع' : 'TOTAL', '(' + dg(T.full) + ')'], 3.3); head('pct', ar ? ['النسبة'] : ['%'], 3.4);
  head('rank', ar ? ['الترتيب', 'في الفصل'] : ['RANK IN', 'THE', 'CLASS'], 2.9);
  // rows
  let y = top + hh;
  const cellText = (k, text, opt) => { const [cx0, w] = X[k]; g.fillStyle = opt && opt.color || '#111'; fit(g, text, cx0 + w / 2, y + rh / 2, w - mm(1.5), opt && opt.size || fs, opt && opt.bold); };
  const circle = k => { const [cx0, w] = X[k]; g.strokeStyle = '#C62828'; g.lineWidth = mm(0.35); g.beginPath(); g.ellipse(cx0 + w / 2, y + rh / 2, Math.min(w / 2 - mm(1.2), mm(6.5)), rh / 2 - mm(0.5), 0, 0, Math.PI * 2); g.stroke(); };
  part.items.forEach((it, i) => {
    if ((part.from + i) % 2) { g.fillStyle = '#F7F7F7'; g.fillRect(x0, y, tableW, rh); }
    cellText('no', dg(part.from + i + 1), { color: '#555', size: fs * 0.85 });
    const [nx, nw] = X.name; g.fillStyle = '#111'; fit(g, it.student.name, ar ? nx + nw - mm(2) : nx + mm(2), y + rh / 2, nw - mm(4), fs, true, ar ? 'right' : 'left');
    for (const s of T.marks) { const c = it.cells[s.id];
      if (!c) continue; if (c.exempt) { cellText('m' + s.id, '—', { color: '#888' }); continue; }
      if (c.abs) { cellText('m' + s.id, ar ? 'غ' : 'Abs', { color: '#C62828', bold: true }); continue; }
      if (c.value == null) continue;
      cellText('m' + s.id, n2(c.value), { color: c.fail ? '#C62828' : '#111' }); if (c.fail) circle('m' + s.id); }
    for (const s of T.words) { const c = it.cells[s.id]; if (!c) continue; cellText('w' + s.id, c.exempt ? '—' : c.abs ? (ar ? 'غ' : 'Abs') : (c.word || ''), { size: fs * 0.85 }); }
    if (it.pct != null) { cellText('tot', n2(it.got), { bold: true }); cellText('pct', pct(it.pct), { bold: true, color: it.r.total.fail ? '#C62828' : '#111' }); }
    if (it.rank) cellText('rank', dg(it.rank), { bold: true, color: it.rank <= 3 ? '#8A5A00' : '#111' });
    y += rh;
  });
  if (last) { // the class average
    g.fillStyle = '#EDEDED'; g.fillRect(x0, y, tableW, rh);
    const [nx, nw] = X.name; g.fillStyle = '#111'; fit(g, ar ? 'متوسط الفصل' : 'CLASS AVERAGE', ar ? nx + nw - mm(2) : nx + mm(2), y + rh / 2, nw - mm(4), fs, true, ar ? 'right' : 'left');
    for (const s of T.marks) if (T.avg[s.id] != null) cellText('m' + s.id, n2(Math.round(T.avg[s.id] * 10) / 10), { bold: true, size: fs * 0.9 });
    if (T.avgTotal != null) cellText('tot', n2(Math.round(T.avgTotal * 10) / 10), { bold: true, size: fs * 0.9 });
    if (T.avgPct != null) cellText('pct', pct(T.avgPct), { bold: true, size: fs * 0.9 });
    y += rh;
  }
  // grid lines
  g.strokeStyle = '#222'; g.lineWidth = mm(0.22);
  g.strokeRect(x0, top, tableW, y - top);
  for (let yy = top + hh; yy < y - 1; yy += rh) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + tableW, yy); g.stroke(); }
  for (const k in X) { const [cx0] = X[k]; if (Math.abs(cx0 - x0) < 1) continue; g.beginPath(); g.moveTo(cx0, top); g.lineTo(cx0, y); g.stroke(); }
  if (ar) { g.beginPath(); g.moveTo(X.no[0], top); g.lineTo(X.no[0], y); g.stroke(); }
  g.lineWidth = mm(0.5); g.beginPath(); g.moveTo(x0, top + hh); g.lineTo(x0 + tableW, top + hh); g.stroke();
  // signatures (last page) and the page number
  if (last) {
    const signs = ar ? ((st.ar && st.ar.signs) || ['مشرف الصف', 'مدير المرحلة', 'مدير المدرسة']) : ['Class Teacher', 'Academic Director', 'Principal'];
    const sy = H - mm(11), gap = tableW / signs.length;
    signs.forEach((s, i) => { const sx = ar ? x0 + tableW - gap * (i + 0.5) : x0 + gap * (i + 0.5);
      g.fillStyle = '#111'; g.font = F(3.6, true); g.textAlign = 'center'; g.fillText(s, sx, sy - mm(5));
      g.strokeStyle = '#777'; g.lineWidth = mm(0.25); g.setLineDash([mm(0.6), mm(0.8)]); g.beginPath(); g.moveTo(sx - mm(28), sy + mm(2)); g.lineTo(sx + mm(28), sy + mm(2)); g.stroke(); g.setLineDash([]); });
  }
  if (part.pages > 1) { g.fillStyle = '#777'; g.font = F(2.8, false); g.textAlign = 'center'; g.fillText(dg(part.page) + ' / ' + dg(part.pages), cx, H - mm(4)); }
}

/** Splits a class into pages when it has many students. */
function parts(T, per) {
  const items = T.list, out = [];
  const total = Math.max(1, Math.ceil((items.length + 1) / per));
  for (let p = 0; p < total; p++) { const from = p * per; out.push({ items: items.slice(from, from + per), from, page: p + 1, pages: total, last: p === total - 1 }); }
  return out;
}
async function build(sheets, ctx) {
  const PL = root.PDFLib, doc = await PL.PDFDocument.create(), logo = await loadImage(ctx.logo), pp = paper(ctx.paper);
  try { await Promise.all(['700 30px A', '400 30px A'].map(f => document.fonts.load(f, 'ابت ABC'))); } catch (e) {}
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  for (const sh of sheets) {
    const T = rows(sh);
    for (const part of parts(T, pp.per)) {
      drawPage(g, sh, T, part, ctx, logo);
      const url = cv.toDataURL('image/jpeg', 0.9), bytes = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0));
      const img = await doc.embedJpg(bytes), page = doc.addPage(pp.pt); page.drawImage(img, { x: 0, y: 0, width: pp.pt[0], height: pp.pt[1] });
    }
  }
  return doc.save();
}
root.OozSpread = { build, rows };
})(typeof window !== 'undefined' ? window : globalThis);
