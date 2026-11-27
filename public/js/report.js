/* Ooz Marks — the printed report card (A4 PDF), drawn with pdf-lib to match the school's model:
   header with logo, term line, name and grade, subject table, overall percentage, comment, grading system,
   three empty boxes for the class teacher's and principal's signatures and the stamp (signed and stamped by hand). */
(function (root) {
'use strict';
const A4 = [595.28, 841.89], M = 40, W = A4[0] - 2 * M;
function deps() { if (!root.PDFLib) throw new Error('pdf-lib missing'); return root.PDFLib; }
// Standard PDF fonts only cover Western characters: anything else is dropped rather than breaking the file.
function clean(font, s) { const set = new Set(font.getCharacterSet()); return [...String(s == null ? '' : s).replace(/[‘’]/g, '’')].map(c => set.has(c.codePointAt(0)) ? c : (c === ' ' ? ' ' : '')).join(''); }
function wrap(font, text, size, width) {
  const words = text.split(/\s+/).filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (font.widthOfTextAtSize(t, size) <= width) cur = t; else { if (cur) lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines;
}
async function imageOf(doc, dataUrl) {
  if (!dataUrl) return null;
  try {
    const b64 = dataUrl.split(',')[1], bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return /^data:image\/png/.test(dataUrl) ? await doc.embedPng(bytes) : /^data:image\/jpe?g/.test(dataUrl) ? await doc.embedJpg(bytes) : null;
  } catch (e) { return null; }
}
/* pages: [{ student, cls, result (OozCalc.student), comment }]; ctx: { settings, logo, term } */
async function build(pages, ctx) {
  const { PDFDocument, StandardFonts, rgb } = deps();
  const doc = await PDFDocument.create();
  doc.setTitle('Report cards'); doc.setCreator('Ooz Marks'); doc.setProducer('Ooz Marks — Ooz apps');
  const F = { r: await doc.embedFont(StandardFonts.TimesRoman), b: await doc.embedFont(StandardFonts.TimesRomanBold), i: await doc.embedFont(StandardFonts.TimesRomanItalic),
    bi: await doc.embedFont(StandardFonts.TimesRomanBoldItalic), h: await doc.embedFont(StandardFonts.Helvetica) };
  const logo = await imageOf(doc, ctx.logo);
  const st = ctx.settings, black = rgb(0, 0, 0), red = rgb(0.85, 0, 0), C = root.OozCalc;
  for (const pg of pages) {
    const page = doc.addPage(A4); let y = A4[1] - 46;
    const text = (s, x, yy, size, font, opt = {}) => { const t = clean(font, s); const w = font.widthOfTextAtSize(t, size); const xx = opt.align === 'center' ? x - w / 2 : opt.align === 'right' ? x - w : x; page.drawText(t, { x: xx, y: yy, size, font, color: opt.color || black }); return w; };
    const box = (x, yy, w, h) => page.drawRectangle({ x, y: yy, width: w, height: h, borderColor: black, borderWidth: 0.8 });
    if (logo && st.watermark !== false) { const s = Math.min(380 / logo.width, 380 / logo.height); page.drawImage(logo, { x: (A4[0] - logo.width * s) / 2, y: (A4[1] - logo.height * s) / 2 - 20, width: logo.width * s, height: logo.height * s, opacity: 0.07 }); }
    // header
    const hh = 80; box(M, y - hh, W, hh);
    if (logo) { const s = Math.min(120 / logo.width, 64 / logo.height); page.drawImage(logo, { x: M + 10, y: y - hh / 2 - logo.height * s / 2, width: logo.width * s, height: logo.height * s }); }
    const cx = M + 140 + (W - 140) / 2, dept = (st.departments || {})[pg.cls.stage] || '';
    const lines = [st.schoolName, dept, st.curriculum].filter(Boolean);
    lines.forEach((l, i) => { let size = 17; while (F.b.widthOfTextAtSize(clean(F.b, l), size) > W - 160 && size > 10) size -= 0.5; text(l, cx, y - 24 - i * 21 + (3 - lines.length) * 10, size, F.b, { align: 'center' }); });
    y -= hh;
    const title = (ctx.term.name + ' REPORT CARD FOR THE ACADEMIC YEAR ' + ctx.term.year).toUpperCase();
    box(M, y - 18, W, 18); let ts = 12; while (F.b.widthOfTextAtSize(clean(F.b, title), ts) > W - 10) ts -= 0.5; text(title, A4[0] / 2, y - 13.5, ts, F.b, { align: 'center' }); y -= 18;
    box(M, y - 19, W, 19); page.drawLine({ start: { x: M + 150, y }, end: { x: M + 150, y: y - 19 }, thickness: 0.8, color: black });
    text('Student’s Name', M + 5, y - 14, 12, F.b); let ns = 14; while (F.b.widthOfTextAtSize(clean(F.b, pg.student.name), ns) > W - 165) ns -= 0.5; text(pg.student.name, M + 156, y - 14.5, ns, F.b); y -= 19;
    box(M, y - 19, W, 19); const gname = /^grade\s*/i.test(pg.cls.name) ? 'Grade:  ' + pg.cls.name.replace(/^grade\s*/i, '') : 'Class:  ' + pg.cls.name;
    text(gname, M + 5, y - 14, 12, F.b); y -= 19;
    // subjects
    y -= 22;
    const cols = [150, 72, 72, 82, 82, W - 458], heads = [['Subject'], ['Max.', 'Marks'], ['Min.', 'Marks'], ['Marks', 'obtained'], ['Percentage'], ['Grade']];
    const xs = cols.reduce((a, w) => (a.push(a[a.length - 1] + w), a), [M]);
    const row = (h, cells) => { cells.forEach((c, i) => { box(xs[i], y - h, cols[i], h); if (c) c(xs[i], cols[i], y, h); }); y -= h; };
    row(34, heads.map(hd => (x, w, yy) => hd.forEach((t, k) => text(t, x + w / 2, yy - (hd.length === 1 ? 21 : 14 + k * 14), 13, F.r, { align: 'center' }))));
    const R = pg.result;
    for (const r of R.rows) {
      const fail = r.fail, col = fail ? red : black, abs = r.abs;
      row(21, [
        (x, w, yy) => text(r.subject.name, x + 5, yy - 15.5, 14, F.r),
        (x, w, yy) => text(C.fmt(r.max, 2), x + w / 2, yy - 15.5, 14, F.i, { align: 'center' }),
        (x, w, yy) => text(C.fmt(r.min, 2), x + w / 2, yy - 15.5, 14, F.i, { align: 'center' }),
        (x, w, yy) => text(abs ? 'Abs' : r.value == null ? '' : C.fmt(r.value, 2), x + w / 2, yy - 15.5, 14, abs ? F.bi : F.i, { align: 'center', color: col }),
        (x, w, yy) => text(abs ? '—' : C.show(st, r.pct), x + w / 2, yy - 15.5, 14, F.i, { align: 'center', color: col }),
        (x, w, yy) => text(abs ? '—' : (r.grade || ''), x + w / 2, yy - 15.5, 14, F.b, { align: 'center', color: col }),
      ]);
    }
    const T = R.total, tcol = T.fail ? red : black;
    row(21, [(x, w, yy) => text('Total', x + 5, yy - 15.5, 14, F.r), (x, w, yy) => text(C.fmt(T.max, 2), x + w / 2, yy - 15.5, 14, F.r, { align: 'center' }),
      (x, w, yy) => text(C.fmt(T.min, 2), x + w / 2, yy - 15.5, 14, F.r, { align: 'center' }), (x, w, yy) => text(C.fmt(T.got, 2), x + w / 2, yy - 15.5, 14, F.r, { align: 'center' }),
      (x, w, yy) => text(T.pct == null ? '' : C.show(st, T.pct) + ' %', x + w / 2, yy - 15.5, 14, F.b, { align: 'center', color: tcol }), (x, w, yy) => text(T.grade || '', x + w / 2, yy - 15.5, 14, F.b, { align: 'center', color: tcol })]);
    // overall
    y -= 22; const ox = M + W - 300; box(ox, y - 18, 190, 18); box(ox + 190, y - 18, 110, 18);
    text('OVERALL PERCENTAGE', ox + 95, y - 13.5, 12, F.b, { align: 'center' }); text('GRADE', ox + 245, y - 13.5, 12, F.b, { align: 'center' }); y -= 18;
    box(ox, y - 20, 190, 20); box(ox + 190, y - 20, 110, 20);
    text(T.pct == null ? '' : C.show(st, T.pct) + ' %', ox + 95, y - 15, 14, F.r, { align: 'center', color: tcol }); text(T.grade || '', ox + 245, y - 15, 14, F.b, { align: 'center', color: tcol }); y -= 20;
    // comment
    y -= 20; const label = 'Comment: ', lw = F.r.widthOfTextAtSize(label, 17), cs = 12, lh = 15.5;
    const words = clean(F.r, pg.comment || '');
    const first = wrap(F.r, words, cs, W - 12 - lw), rest = first.length ? wrap(F.r, words.slice(first[0].length).trim(), cs, W - 12) : [];
    const cl = [first[0] || '', ...rest], ch = Math.max(46, 10 + cl.length * lh);
    box(M, y - ch, W, ch); text(label, M + 6, y - 18, 17, F.r);
    cl.forEach((l, i) => text(l, i === 0 ? M + 6 + lw : M + 6, y - 17 - i * lh, cs, F.r)); y -= ch;
    // grading system
    y -= 16; text('GRADING SYSTEM', M, y, 14, F.b); y -= 6;
    const bands = (st.bands || []).slice().sort((a, b) => b.from - a.from), bw = W / bands.length;
    const ranges = bands.map((b, i) => i === 0 ? '100% - ' + b.from + '%' : b.from === 0 ? 'BELOW ' + bands[i - 1].from + '%' : (bands[i - 1].from - 1) + '% - ' + b.from + '%');
    bands.forEach((b, i) => { box(M + i * bw, y - 14, bw, 14); text(b.g, M + i * bw + bw / 2, y - 10.5, 10, F.b, { align: 'center' }); box(M + i * bw, y - 28, bw, 14); text(ranges[i], M + i * bw + bw / 2, y - 24.5, 8.5, F.r, { align: 'center' }); });
    // descriptions merged across neighbours with the same label
    let i = 0; while (i < bands.length) { let j = i; while (j + 1 < bands.length && bands[j + 1].label === bands[i].label) j++; box(M + i * bw, y - 42, bw * (j - i + 1), 14); text((bands[i].label || '').toUpperCase(), M + (i + j + 1) * bw / 2, y - 38.5, 8.5, F.b, { align: 'center' }); i = j + 1; }
    y -= 42;
    // signatures and stamp: empty, signed and stamped by hand
    y -= 22; const sh = Math.max(70, Math.min(100, y - 60)), sw = W / 3;
    ['Class Teacher’s Signature', 'Principal’s Signature', 'School Stamp'].forEach((l, k) => { box(M + k * sw, y - sh, sw, sh); text(l, M + k * sw + 6, y - sh + 8, 12, F.b); });
    if (st.footer) text(st.footer, A4[0] / 2, 26, 8.5, F.h, { align: 'center' });
  }
  return doc.save();
}
root.OozReport = { build };
})(this);
