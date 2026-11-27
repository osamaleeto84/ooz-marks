/* Ooz Marks — results: percentages, grades, totals, fail rules. Same code on every device (and in tests). */
(function (root) {
'use strict';
const fmt = (n, dec) => { if (n == null || !isFinite(n)) return ''; const f = Math.pow(10, dec); const r = Math.round(n * f) / f; return String(r); };
function roundPct(st, p) { if (st.rounding === 'whole') return Math.round(p); if (st.rounding === 'one') return Math.round(p * 10) / 10; return p; }
function band(st, p) { const bs = (st.bands || []).slice().sort((a, b) => b.from - a.from); for (const b of bs) if (p >= b.from - 1e-9) return b; return bs[bs.length - 1] || { g: '', label: '' }; }
const lowest = st => (st.bands || []).slice().sort((a, b) => a.from - b.from)[0] || { g: 'F' };
/* subjects: the class's subjects (sorted); marks: Map "studentId:subjectId" → {value, abs}. */
/* The Arabic section grades with its own words (st.ar.bands) and fails a mark below the subject's pass mark. */
function arStyle(st) { return Object.assign({}, st, { bands: (st.ar && st.ar.bands || []).map(b => ({ g: b.label, from: b.from, label: b.label })), failRule: 'min' }); }
function student(st, subjects, stu, marks, section) {
  if (section === 'ar') st = arStyle(st);
  const rows = [], ex = new Set(stu.exempt || []);
  let max = 0, min = 0, got = 0, complete = true, any = false;
  for (const s of subjects) {
    if (!s.counted) continue;
    if (ex.has(s.id)) { rows.push({ subject: s, exempt: true }); continue; }
    const m = marks.get(stu.id + ':' + s.id) || {};
    if (s.kind === 'grade') {   // graded by a word: shown, not in the total
      const r = { subject: s, kind: 'grade', word: m.grade || null, abs: !!m.abs, value: null, pct: null, grade: null, fail: false };
      if (!r.abs && !r.word) complete = false; else any = true;
      rows.push(r); continue;
    }
    const r = { subject: s, max: s.max, min: s.min, value: m.value == null ? null : +m.value, abs: !!m.abs };
    if (r.abs) {
      r.pct = null; r.grade = null; r.fail = false; any = true;
      if (st.absRule !== 'exclude') { max += s.max; min += s.min; }
    } else if (r.value == null) { complete = false; r.pct = null; r.grade = null; }
    else {
      any = true; r.pct = roundPct(st, r.value / s.max * 100); const b = band(st, r.pct); r.grade = b.g; r.label = b.label;
      r.fail = st.failRule === 'min' ? r.value < s.min : b.g === lowest(st).g;
      max += s.max; min += s.min; got += r.value;
    }
    rows.push(r);
  }
  const pct = max > 0 ? roundPct(st, got / max * 100) : null, b = pct == null ? null : band(st, pct);
  return { rows: rows.filter(r => !r.exempt), exempt: rows.filter(r => r.exempt).map(r => r.subject), total: { max, min, got, pct, grade: b && b.g, label: b && b.label,
    fail: pct == null ? false : (st.failRule === 'min' ? got < min : b.g === lowest(st).g) }, complete, any };
}
const show = (st, n) => n == null ? '' : fmt(n, st.rounding === 'whole' ? 0 : 1);
const api = { student, band, roundPct, show, fmt, lowest };
if (typeof module === 'object' && module.exports) module.exports = api; else root.OozCalc = api;
})(this);
