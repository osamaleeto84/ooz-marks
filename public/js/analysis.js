/* Ooz Marks — result analysis: by class, by subject across the school, one student, one subject in one class.
   Uses the app's own data and helpers (D, t, E, ic, result, ST…), 3D charts from charts.js, PDF and Excel export.
   The principal sees everything; a teacher sees what D.data already holds for them (their subjects, their class). */
window.OozAnalysisInit = function (H) {
'use strict';
const { D, t, E, ic, ST, api, render, $, $$, run, toast, N, stageOf, termLabel, nameOf, fileSafe } = H;
const PAL = ['#2F7A47', '#5FA36F', '#3C64B1', '#7E9CD8', '#E8A93A', '#E07A3F', '#B83A26'];
const C = window.OozCharts;
const r1 = v => Math.round(v * 10) / 10;
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sd = a => { const m = avg(a); return a.length ? Math.sqrt(avg(a.map(x => (x - m) ** 2))) : null; };
const iso = v => '\u2066' + v + '\u2069';   // keeps numbers like 32.1 / 50 or +3% in order inside Arabic text
const pc = v => v == null ? '—' : iso(r1(v) + '%');
const key = s => String(s).trim().toLowerCase();
const colorFor = (i, n) => PAL[n <= 1 ? 0 : Math.round(i * 6 / (n - 1))];
const level = p => p == null ? 0 : Math.max(1, Math.min(10, Math.round(p / 10)));
const levelColor = p => p == null ? '#B9AE9F' : p >= 88 ? PAL[0] : p >= 80 ? PAL[1] : p >= 72 ? PAL[2] : p >= 65 ? PAL[4] : p >= 55 ? PAL[5] : PAL[6];

/* ---------- the numbers ---------- */
function bandsFor(sec) { const st = ST(); const b = (sec === 'ar' ? (st.ar && st.ar.bands) || [] : st.bands.map(x => ({ from: x.from, label: x.g }))).slice().sort((x, y) => y.from - x.from); return b; }
function bandOf(bands, p) { for (let i = 0; i < bands.length; i++) if (p >= bands[i].from) return i; return bands.length - 1; }
/** Everything about one set of marks (this term or another). */
function compute(data, sec) {
  const d = data, classes = d.classes.filter(c => sec === 'all' || (c.section || 'en') === sec);
  const subsOf = id => d.subjects.filter(s => s.classId === id && s.counted !== false).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const mk = new Map(d.marks.map(m => [m.studentId + ':' + m.subjectId, m]));
  const out = { classes: [], students: [], subjects: new Map() };
  for (const c of classes) {
    const subs = subsOf(c.id), studs = d.students.filter(s => s.classId === c.id), rows = [];
    for (const s of studs) {
      const r = OozCalc.student(ST(), subs, s, mk, c.section), pass = r.total.pct != null && !r.total.fail && !r.rows.some(x => x.fail);
      const per = {}; r.rows.forEach(x => { if (x.kind !== 'grade' && !x.abs && x.value != null && !x.exempt) per[x.subject.id] = x.value / x.subject.max * 100; });
      const fails = r.rows.filter(x => x.fail).map(x => x.subject.name), fid = new Set(r.rows.filter(x => x.fail).map(x => x.subject.id));
      const o = { st: s, cls: c, r, pct: r.total.pct, pass, per, fails, fid }; rows.push(o); out.students.push(o);
    }
    const ranked = rows.filter(x => x.pct != null).sort((a, b) => b.pct - a.pct); ranked.forEach((x, i) => { x.rank = i + 1; x.of = ranked.length; });
    const ps = ranked.map(x => x.pct);
    out.classes.push({ c, subs, rows, n: studs.length, avg: avg(ps), pass: ranked.length ? ranked.filter(x => x.pass).length / ranked.length * 100 : null, hi: ps.length ? Math.max(...ps) : null, lo: ps.length ? Math.min(...ps) : null, top: ranked[0], failing: rows.filter(x => x.fails.length).length, counted: ranked.length });
    for (const s of subs) {
      if (s.kind === 'grade') continue;
      const vals = rows.map(x => ({ x, v: x.per[s.id], raw: (mk.get(x.st.id + ':' + s.id) || {}) })).filter(y => y.v != null);
      const k = key(s.name); if (!out.subjects.has(k)) out.subjects.set(k, { name: s.name, per: [] });
      out.subjects.get(k).per.push({ s, c, vals, avg: avg(vals.map(y => y.v)), pass: vals.length ? vals.filter(y => !y.x.fid.has(s.id)).length / vals.length * 100 : null, absent: rows.filter(x => (mk.get(x.st.id + ':' + s.id) || {}).abs).length });
    }
  }
  for (const g of out.subjects.values()) { const all = g.per.flatMap(p => p.vals.map(v => v.v)); g.avg = avg(all); g.n = all.length; g.pass = all.length ? g.per.reduce((a, p) => a + p.vals.filter(y => !y.x.fid.has(p.s.id)).length, 0) / all.length * 100 : null; }
  const ps = out.students.filter(x => x.pct != null);
  out.avg = avg(ps.map(x => x.pct)); out.pass = ps.length ? ps.filter(x => x.pass).length / ps.length * 100 : null; out.failing = out.students.filter(x => x.fails.length);
  out.top = ps.slice().sort((a, b) => b.pct - a.pct)[0]; out.counted = ps.length;
  return out;
}
/** The term before the current one, if any (for the trend). */
async function previous() {
  const terms = (D.me.terms || []).slice().sort((a, b) => a.id - b.id), cur = D.data.term; if (!cur) return null;
  const i = terms.findIndex(x => x.id === cur.id); if (i <= 0) return null; const p = terms[i - 1];
  D.anPrev = D.anPrev || {}; if (!D.anPrev[p.id]) { try { D.anPrev[p.id] = await api('data', { termId: p.id }); } catch (e) { return null; } }
  return { term: p, data: D.anPrev[p.id] };
}

/* ---------- pieces of the page ---------- */
const trendTag = (now, before) => { if (now == null || before == null) return ''; const d = r1(now - before), up = d >= 0; return '<span class="trend ' + (up ? 'up' : 'dn') + '">' + ic(up ? 'up' : 'down', 's') + (up ? '+' : '') + d + '</span>'; };
const kpi = (label, val, sub, trend, tone) => '<div class="c kpi c3"><small>' + label + '</small><div class="kv"><b dir="ltr"' + (tone ? ' style="color:var(--' + tone + ')"' : '') + ' data-count="' + E(val.replace(/[\u2066\u2069]/g, '')) + '">' + E(val) + '</b>' + (trend || '') + '</div><span>' + sub + '</span></div>';
const card = (title, inner, sub, cls) => '<section class="c pad an c3' + (cls ? ' ' + cls : '') + '"><div class="ah"><h2>' + title + '</h2>' + (sub ? '<p class="mu">' + sub + '</p>' : '') + '</div><div class="chwrap">' + inner + '</div></section>';
const legend = items => '<div class="lg">' + items.map(([l, c, v]) => '<span><i style="background:' + c + '"></i>' + E(l) + (v !== '' && v != null ? ' <b class="en">' + v + '</b>' : '') + '</span>').join('') + '</div>';
const chips = (name, items, on) => '<div class="chips an-chips">' + items.map(([v, l]) => '<button class="chip' + (String(v) === String(on) ? ' on' : '') + '" data-' + name + '="' + E(v) + '">' + E(l) + '</button>').join('') + '</div>';
let PDF = [];   // what the PDF will hold, collected while the page is drawn
const addChart = (title, svgLight) => PDF.push({ k: 'chart', title, svg: svgLight });
const addTable = (title, head, rows) => PDF.push({ k: 'table', title, head, rows });

/* ---------- tab 1: classes ---------- */
function tabClasses(A, P, sec) {
  const bands = bandsFor(sec === 'ar' ? 'ar' : 'en');
  const prevAvg = P ? P.avg : null, prevPass = P ? P.pass : null;
  PDF.push({ k: 'kpis', items: [[t('المتوسط العام', 'Overall average'), pc(A.avg)], [t('نسبة النجاح', 'Pass rate'), pc(A.pass)], [t('راسبون في مادة أو أكثر', 'Failing a subject'), String(A.failing.length)], [t('الأول', 'Top'), A.top ? pc(A.top.pct) + ' · ' + A.top.st.name : '—']] });
  const failBy = {}; A.failing.forEach(x => { failBy[x.cls.name] = (failBy[x.cls.name] || 0) + 1; });
  let h = '<div class="kpis">' + kpi(t('المتوسط العام', 'Overall average'), pc(A.avg), A.classes.length + ' ' + t('فصل', 'classes') + ' · ' + A.counted + ' ' + t('طالباً', 'students'), trendTag(A.avg, prevAvg)) +
    kpi(t('نسبة النجاح', 'Pass rate'), pc(A.pass), t('نجحوا في كل المواد', 'passed every subject'), trendTag(A.pass, prevPass), 'green') +
    kpi(t('راسبون في مادة أو أكثر', 'Failing a subject'), String(A.failing.length), Object.entries(failBy).map(([k, v]) => E(k) + ' (' + v + ')').join(' · ') || t('لا أحد', 'None'), '', 'red') +
    kpi(t('الأول', 'Top student'), A.top ? pc(A.top.pct) : '—', A.top ? E(A.top.st.name) + ' · ' + E(A.top.cls.name) : '—') + '</div>';
  const items = A.classes.filter(x => x.avg != null).map(x => ({ label: x.c.name, sub: pc(x.pass) + ' ' + t('نجاح', 'pass'), value: r1(x.avg), color: levelColor(x.avg) }));
  const bo = { avg: A.avg == null ? null : r1(A.avg), avgLabel: t('متوسط المدرسة', 'School average'), label: t('متوسط كل فصل', 'Average of each class') };
  const counts = bands.map(() => 0); A.students.forEach(x => { if (x.pct != null) counts[bandOf(bands, x.pct)]++; });
  const slices = bands.map((b, i) => ({ value: counts[i], color: colorFor(i, bands.length) }));
  const dOpt = { big: pc(A.pass), small: t('نسبة النجاح', 'pass rate'), label: t('توزيع التقديرات', 'Grade distribution') };
  addChart(t('متوسط كل فصل', 'Average of each class'), C.bars(items, Object.assign({ light: true }, bo))); addChart(t('توزيع التقديرات', 'Grade distribution'), C.donut(slices, Object.assign({ light: true }, dOpt)));
  h += '<div class="anrow">' + card(t('متوسط كل فصل', 'Average of each class'), items.length ? C.bars(items, bo) : empty(), t('الخط المتقطّع متوسط المدرسة · تحت كل فصل نسبة نجاحه', 'Dashed line: school average · under each class its pass rate'), 'w2') +
    card(t('توزيع التقديرات', 'Grade distribution'), C.donut(slices, dOpt) + legend(bands.map((b, i) => [b.label, colorFor(i, bands.length), counts[i]])), sec === 'all' ? t('بسلّم القسم الإنجليزي', 'On the English scale') : '') + '</div>';
  const srows = A.classes.map(x => { const bb = bandsFor(x.c.section === 'ar' ? 'ar' : 'en'), cc = bb.map(() => 0); x.rows.forEach(y => { if (y.pct != null) cc[bandOf(bb, y.pct)]++; }); return { label: x.c.name, segs: bb.map((b, i) => ({ value: cc[i], color: colorFor(i, bb.length) })), right: String(x.counted) }; });
  addChart(t('التقديرات داخل كل فصل', 'Grades within each class'), C.stack(srows, { light: true }));
  const ranked = A.classes.filter(x => x.avg != null).sort((a, b) => b.avg - a.avg).concat(A.classes.filter(x => x.avg == null));
  const head = ['#', t('الفصل', 'Class'), t('المرحلة', 'Stage'), t('الطلاب', 'Students'), t('المتوسط', 'Average'), t('النجاح', 'Pass'), t('أعلى', 'High'), t('أدنى', 'Low')];
  addTable(t('ترتيب الفصول', 'Classes ranked'), head, ranked.map((x, i) => [i + 1, x.c.name, stageOf(x.c), x.n, pc(x.avg), pc(x.pass), pc(x.hi), pc(x.lo)]));
  h += '<div class="anrow">' + card(t('التقديرات داخل كل فصل', 'Grades within each class'), srows.length ? C.stack(srows) + legend(bands.map((b, i) => [b.label, colorFor(i, bands.length), ''])) : empty(), t('عدد الطلاب في كل تقدير · الرقم يسار الشريط عدد من لهم نتيجة', 'Students in each grade · the number on the left: students with a result')) +
    card(t('ترتيب الفصول', 'Classes ranked'), '<div class="tw"><table class="rank"><thead><tr>' + head.map(x => '<th>' + x + '</th>').join('') + '<th>' + t('المستوى', 'Level') + '</th></tr></thead><tbody>' +
      ranked.map((x, i) => '<tr data-goc="' + x.c.id + '" style="cursor:pointer"><td><span class="rk' + (i === 0 && x.avg != null ? ' one' : '') + '">' + (i + 1) + '</span></td><td><b>' + E(x.c.name) + '</b></td><td class="mu">' + stageOf(x.c) + '</td><td class="en">' + x.n + '</td><td class="en"><b>' + pc(x.avg) + '</b></td><td class="en">' + pc(x.pass) + '</td><td class="en" style="color:var(--green)">' + pc(x.hi) + '</td><td class="en" style="color:var(--red)">' + pc(x.lo) + '</td><td>' + C.cubes(level(x.avg), levelColor(x.avg)) + '</td></tr>').join('') + '</tbody></table></div>', t('اضغط فصلاً لفتح تحليل مواده', 'Tap a class to open its subjects')) + '</div>';
  return h;
}
const empty = () => '<p class="mu" style="margin:0;padding:30px 0;text-align:center">' + t('لا توجد درجات بعد', 'No marks yet') + '</p>';

/* ---------- tab 2: subjects across the school ---------- */
function tabSubjects(A, P) {
  const groups = [...A.subjects.values()].filter(g => g.n).sort((a, b) => b.per.length - a.per.length || a.name.localeCompare(b.name));
  if (!groups.length) return card(t('المواد', 'Subjects'), empty());
  const on = groups.find(g => key(g.name) === D.an.subj) || groups[0]; D.an.subj = key(on.name);
  const pv = P ? P.subjects.get(key(on.name)) : null;
  const failing = on.per.reduce((a, p) => a + p.vals.filter(y => y.x.fid.has(p.s.id)).length, 0), fb = on.per.map(p => [p.c.name, p.vals.filter(y => y.x.fid.has(p.s.id)).length]).filter(x => x[1]);
  const best = on.per.flatMap(p => p.vals.map(y => ({ y, p }))).sort((a, b) => b.y.v - a.y.v)[0];
  let h = chips('subj', groups.map(g => [key(g.name), g.name]), key(on.name));
  PDF.push({ k: 'kpis', items: [[t('متوسط ', 'Average of ') + on.name, pc(on.avg)], [t('نسبة النجاح', 'Pass rate'), pc(on.pass)], [t('الراسبون', 'Failing'), String(failing)], [t('أعلى درجة', 'Best mark'), best ? iso(best.y.raw.value + ' / ' + best.p.s.max) : '—']] });
  h += '<div class="kpis">' + kpi(t('متوسط ', 'Average of ') + E(on.name), pc(on.avg), on.per.length + ' ' + t('فصل', 'classes') + ' · ' + on.n + ' ' + t('طالباً', 'students'), trendTag(on.avg, pv && pv.avg)) +
    kpi(t('نسبة النجاح', 'Pass rate'), pc(on.pass), t('درجة النجاح لكل فصل كما حُددت', 'Each class\'s own pass mark'), trendTag(on.pass, pv && pv.pass), 'green') +
    kpi(t('الراسبون', 'Failing'), String(failing), fb.map(([c, n]) => E(c) + ' (' + n + ')').join(' · ') || t('لا أحد', 'None'), '', 'red') +
    kpi(t('أعلى درجة', 'Best mark'), best ? iso(best.y.raw.value + ' / ' + best.p.s.max) : '—', best ? E(best.y.x.st.name) + ' · ' + E(best.p.c.name) : '—') + '</div>';
  const items = on.per.filter(p => p.avg != null).map(p => ({ label: p.c.name, sub: p.s.teacherId ? nameOf(p.s.teacherId) : t('بلا معلم', 'No teacher'), value: r1(p.avg), color: levelColor(p.avg) }));
  const bo = { avg: on.avg == null ? null : r1(on.avg), avgLabel: t('متوسطها في المدرسة', 'School average'), label: on.name };
  addChart(on.name + ' ' + t('في كل فصل', 'in each class'), C.bars(items, Object.assign({ light: true }, bo)));
  const lv = groups.map(g => { const p = P && P.subjects.get(key(g.name)), d = p && p.avg != null && g.avg != null ? r1(g.avg - p.avg) : null; const tch = [...new Set(g.per.map(x => x.s.teacherId).filter(Boolean))].map(nameOf); return { g, d, tch }; });
  addTable(t('مستوى كل مادة', 'Level of each subject'), [t('المادة', 'Subject'), t('المعلم', 'Teacher'), t('الفصول', 'Classes'), t('المتوسط', 'Average'), t('النجاح', 'Pass'), t('التغير', 'Change')], lv.map(x => [x.g.name, x.tch.join('، ') || '—', x.g.per.length, pc(x.g.avg), pc(x.g.pass), x.d == null ? '—' : (x.d >= 0 ? '+' : '') + x.d]));
  h += '<div class="anrow">' + card(E(on.name) + ' ' + t('في كل فصل', 'in each class'), C.bars(items, bo), t('تحت كل فصل معلم المادة · الخط المتقطّع متوسطها في المدرسة', 'Under each class its teacher · dashed line: the school average'), 'w2') +
    card(t('مستوى كل مادة', 'Level of each subject'), '<div class="lvl">' + lv.map(x => '<button class="lvr" data-subj="' + E(key(x.g.name)) + '"><span class="grow"><b class="sb" style="background:' + levelColor(x.g.avg) + '">' + E(x.g.name) + '</b><small class="mu">' + (E(x.tch.join('، ')) || t('بلا معلم', 'No teacher')) + ' · ' + x.g.per.length + ' ' + t('فصل', 'classes') + '</small></span><b class="en">' + pc(x.g.avg) + '</b>' +
      (x.d == null ? '<span class="trend"></span>' : '<span class="trend ' + (x.d >= 0 ? 'up' : 'dn') + '">' + (x.d >= 0 ? '+' : '') + x.d + '</span>') + C.cubes(level(x.g.avg), levelColor(x.g.avg)) + '</button>').join('') + '</div>', t('من منخفض إلى عالٍ · التغير عن الفترة السابقة', 'Low to high · change from the previous term')) + '</div>';
  // the map: subjects × classes
  const top = groups.slice(0, 10), cls = A.classes.map(x => x.c);
  const cell = (g, c) => { const p = g.per.find(p => p.c.id === c.id); return p ? p.avg : null; };
  const heat = v => v == null ? ['var(--soft)', 'var(--mute)'] : v >= 88 ? [PAL[0], '#fff'] : v >= 80 ? [PAL[1], '#fff'] : v >= 72 ? ['#F5D28A', '#2A2826'] : v >= 65 ? ['#F0A86B', '#2A2826'] : ['#D9705C', '#fff'];
  addTable(t('خريطة المواد والفصول', 'Subjects and classes'), [t('الفصل', 'Class')].concat(top.map(g => g.name)), cls.map(c => [c.name].concat(top.map(g => pc(cell(g, c))))));
  h += card(t('خريطة المواد والفصول', 'Subjects and classes'), '<div class="tw"><table class="heat"><thead><tr><th></th>' + top.map(g => '<th>' + E(g.name) + '</th>').join('') + '</tr></thead><tbody>' +
    cls.map(c => '<tr><th>' + E(c.name) + '</th>' + top.map(g => { const v = cell(g, c), [bg, fg] = heat(v); return '<td style="background:' + bg + ';color:' + fg + '">' + (v == null ? '—' : r1(v)) + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>',
    t('متوسط كل مادة في كل فصل (%) · الأخضر عالٍ والأحمر منخفض', 'Average of each subject in each class (%) · green high, red low'));
  return h;
}

/* ---------- tab 3: one student ---------- */
function tabStudent(A, P) {
  const all = A.students.slice().sort((a, b) => a.cls.name.localeCompare(b.cls.name) || a.st.name.localeCompare(b.st.name));
  if (!all.length) return card(t('الطالب', 'Student'), empty());
  const x = all.find(s => s.st.id === D.an.stu) || all.filter(s => s.pct != null).sort((a, b) => b.pct - a.pct)[0] || all[0]; D.an.stu = x.st.id;
  const cl = A.classes.find(y => y.c.id === x.cls.id), px = P && P.students.find(y => y.st.id === x.st.id);
  const opts = '<select class="inp" id="anStu" aria-label="' + t('الطالب', 'Student') + '">' + A.classes.map(c => '<optgroup label="' + E(c.c.name) + '">' + c.rows.map(y => '<option value="' + y.st.id + '"' + (y === x ? ' selected' : '') + '>' + E(y.st.name) + '</option>').join('') + '</optgroup>').join('') + '</select>';
  const ar = x.cls.section === 'ar', gr = ar ? x.r.total.label : x.r.total.grade;
  PDF.push({ k: 'kpis', items: [[t('الطالب', 'Student'), x.st.name + ' · ' + x.cls.name], [t('الترتيب في الفصل', 'Rank in class'), x.rank ? iso(x.rank + ' / ' + x.of) : '—'], [t('النسبة', 'Percentage'), pc(x.pct)], [t('التقدير', 'Grade'), gr || '—']] });
  let h = '<section class="c pad prof c3"><div class="av">' + E(x.st.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')) + '</div><div class="grow"><h2 dir="auto">' + E(x.st.name) + '</h2><p class="mu">' + E(x.cls.name) + ' · ' + stageOf(x.cls) + '</p></div>' +
    '<div class="pbig dk"><b class="en">' + (x.rank ? iso(x.rank + ' / ' + x.of) : '—') + '</b><span>' + t('الترتيب في الفصل', 'Rank in class') + '</span></div><div class="pbig"><b class="en">' + pc(x.pct) + '</b><span>' + (x.pct != null ? iso(OozCalc.fmt(x.r.total.got, 2) + ' / ' + x.r.total.max) : '') + '</span></div>' +
    '<div class="pbig ' + (x.fails.length ? 'bad' : 'ok') + '"><b>' + E(gr || '—') + '</b><span>' + (x.fails.length ? t('راسب في: ', 'Failed: ') + E(x.fails.join('، ')) : t('ناجح في كل المواد', 'Passed every subject')) + '</span></div>' + opts + '</section>';
  const subs = cl.subs.filter(s => s.kind !== 'grade'), clsAvg = s => avg(cl.rows.map(y => y.per[s.id]).filter(v => v != null));
  const items = subs.map(s => ({ label: s.name, value: x.per[s.id] == null ? 0 : r1(x.per[s.id]), other: r1(clsAvg(s) || 0) }));
  addChart(t('درجاته مقابل متوسط فصله (%)', 'Student vs class average (%)'), C.bars(items, { pair: true, light: true }));
  h += '<div class="anrow">' + card(t('درجاته مقابل متوسط فصله', 'Marks vs the class average'), C.bars(items, { pair: true, label: x.st.name }) + legend([[t('الطالب', 'Student'), '#E8A93A', ''], [t('متوسط الفصل', 'Class average'), '#B9AE9F', '']]), t('النسبة المئوية في كل مادة', 'Percentage in each subject'), 'w2');
  if (px) { const prev = subs.map(s => px.per[s.id] == null ? null : r1(px.per[s.id])), now = subs.map(s => x.per[s.id] == null ? null : r1(x.per[s.id]));
    addChart(t('الفترة السابقة والحالية', 'Previous and this term'), C.ribbon([prev, now], subs.map(s => s.name), { light: true }));
    h += card(t('الفترة السابقة والحالية', 'Previous and this term'), C.ribbon([prev, now], subs.map(s => s.name)) + legend([[t('الفترة السابقة', 'Previous term'), '#B9AE9F', ''], [t('الفترة الحالية', 'This term'), '#E8A93A', '']]), E(termLabel(P.term)));
  } else h += card(t('الفترة السابقة والحالية', 'Previous and this term'), '<p class="mu" style="margin:0;padding:30px 0;text-align:center">' + t('تظهر المقارنة حين يوجد فصل دراسي سابق فيه درجات لهذا الطالب.', 'The comparison shows once an earlier term has marks for this student.') + '</p>');
  h += '</div>';
  const diffs = subs.map(s => ({ s, v: x.per[s.id], d: x.per[s.id] == null ? null : x.per[s.id] - (clsAvg(s) || 0) })).filter(y => y.v != null);
  const strong = diffs.slice().sort((a, b) => b.v - a.v)[0], weak = diffs.slice().sort((a, b) => a.v - b.v)[0];
  const sum = (strong ? '<div class="note ok">' + ic('star', 's') + '<span><b>' + t('أقوى مادة', 'Strongest') + '</b> · ' + E(strong.s.name) + ' · ' + pc(strong.v) + ' (' + (strong.d >= 0 ? '+' : '') + r1(strong.d) + t(' عن متوسط الفصل', ' vs class') + ')</span></div>' : '') +
    (weak && weak !== strong ? '<div class="note wa">' + ic('warn', 's') + '<span><b>' + t('تحتاج اهتماماً', 'Needs attention') + '</b> · ' + E(weak.s.name) + ' · ' + pc(weak.v) + ' (' + (weak.d >= 0 ? '+' : '') + r1(weak.d) + t(' عن متوسط الفصل', ' vs class') + ')</span></div>' : '') +
    (px && px.pct != null && x.pct != null ? '<div class="note">' + ic(x.pct >= px.pct ? 'up' : 'down', 's') + '<span><b>' + t('مقارنة بالفترة السابقة', 'Against the previous term') + '</b> · ' + (x.pct >= px.pct ? '+' : '') + r1(x.pct - px.pct) + '%' + (px.rank && x.rank ? t(' · من المركز ' + px.rank + ' إلى ' + x.rank, ' · from rank ' + px.rank + ' to ' + x.rank) : '') + '</span></div>' : '');
  const cm = D.data.cm && D.data.cm.get(x.st.id);
  h += '<div class="anrow">' + card(t('ملخّص', 'Summary'), '<div class="col" style="gap:8px">' + (sum || empty()) + '</div>') + (ar ? '' : card(t('التعليق في الشهادة', 'Report comment'), cm && cm.text ? '<p class="en ltr" style="margin:0;line-height:1.9;text-align:left">' + E(cm.text) + '</p>' : '<p class="mu" style="margin:0">' + t('لا يوجد تعليق بعد', 'No comment yet') + '</p>')) + '</div>';
  return h;
}

/* ---------- tab 4: one subject in one class ---------- */
function tabClassSubject(A, P) {
  if (!A.classes.length) return card(t('مادة في فصل', 'Subject in a class'), empty());
  const cl = A.classes.find(x => x.c.id === D.an.cls) || A.classes[0]; D.an.cls = cl.c.id;
  const subs = cl.subs.filter(s => s.kind !== 'grade'); if (!subs.length) return chips('cls', A.classes.map(x => [x.c.id, x.c.name]), cl.c.id) + card(t('مادة في فصل', 'Subject in a class'), empty());
  const s = subs.find(y => y.id === D.an.csub) || subs[0]; D.an.csub = s.id;
  const grp = A.subjects.get(key(s.name)), p = grp.per.find(y => y.s.id === s.id), vals = p.vals.map(y => y.raw.value), pcts = p.vals.map(y => y.v);
  const ar = cl.c.section === 'ar', bands = bandsFor(ar ? 'ar' : 'en');
  const fails = p.vals.filter(y => y.x.fid.has(s.id)).sort((a, b) => a.v - b.v), tops = p.vals.slice().sort((a, b) => b.v - a.v).slice(0, 3);
  const pp = P && (() => { const g = P.subjects.get(key(s.name)); return g && g.per.find(y => y.c.id === cl.c.id); })();
  let h = '<div class="row" style="gap:8px"><b>' + t('الفصل', 'Class') + '</b>' + chips('cls', A.classes.map(x => [x.c.id, x.c.name]), cl.c.id) + '</div><div class="row" style="gap:8px"><b>' + t('المادة', 'Subject') + '</b>' + chips('csub', subs.map(y => [y.id, y.name]), s.id) + '</div>';
  const a = avg(vals), diff = p.avg != null && grp.avg != null ? p.avg - grp.avg : null;
  PDF.push({ k: 'kpis', items: [[s.name + ' · ' + cl.c.name, a == null ? '—' : iso(r1(a) + ' / ' + s.max)], [t('نسبة النجاح', 'Pass rate'), pc(p.pass)], [t('الراسبون', 'Failing'), String(fails.length)], [t('مقارنة بالمدرسة', 'Vs the school'), diff == null ? '—' : iso((diff >= 0 ? '+' : '') + r1(diff) + '%')]] });
  h += '<div class="kpis">' + kpi(E(s.name) + ' · ' + E(cl.c.name), a == null ? '—' : iso(r1(a) + ' / ' + s.max), pc(p.avg) + ' · ' + (s.teacherId ? E(nameOf(s.teacherId)) : t('بلا معلم', 'No teacher')), trendTag(p.avg, pp && pp.avg)) +
    kpi(t('نسبة النجاح', 'Pass rate'), pc(p.pass), (p.vals.length - fails.length) + t(' من ', ' of ') + p.vals.length + ' · ' + (ar ? t('درجة النجاح ', 'pass mark ') : t('الحد الأدنى ', 'min ')) + s.min, '', 'green') +
    kpi(t('الراسبون', 'Failing'), String(fails.length), fails.slice(0, 3).map(y => E(y.x.st.name.split(' ')[0]) + ' · ' + y.raw.value).join('، ') || t('لا أحد', 'None'), '', 'red') +
    kpi(t('مقارنة بالمدرسة', 'Vs the school'), diff == null ? '—' : iso((diff >= 0 ? '+' : '') + r1(diff) + '%'), t('متوسط المادة في المدرسة ', 'School average ') + pc(grp.avg), '', diff != null && diff < 0 ? 'red' : 'green') + '</div>';
  const bins = [[0, 40], [40, 50], [50, 60], [60, 70], [70, 80], [80, 90], [90, 101]], bc = [PAL[6], PAL[5], PAL[4], PAL[3], PAL[2], PAL[1], PAL[0]];
  const hist = bins.map(([lo, hi], i) => ({ label: lo + '–' + Math.min(100, hi - 1 + (hi === 101 ? 0 : 0)) + (hi === 101 ? '' : ''), value: pcts.filter(v => v >= lo && v < hi).length, color: bc[i] }));
  hist.forEach((b, i) => { b.label = bins[i][0] + '–' + (bins[i][1] === 101 ? 100 : bins[i][1] - 1) + '%'; });
  const hmax = Math.max(2, ...hist.map(b => b.value));
  const counts = bands.map(() => 0); pcts.forEach(v => counts[bandOf(bands, v)]++);
  const dOpt = { big: (p.vals.length - fails.length) + ' / ' + p.vals.length, small: t('نجحوا', 'passed'), W: 300, H: 210 };
  addChart(t('توزيع الدرجات', 'Spread of marks'), C.bars(hist, { max: hmax, unit: '', light: true })); addChart(t('التقديرات', 'Grades'), C.donut(bands.map((b, i) => ({ value: counts[i], color: colorFor(i, bands.length) })), Object.assign({ light: true }, dOpt)));
  h += '<div class="anrow">' + card(t('توزيع الدرجات', 'Spread of marks'), pcts.length ? C.bars(hist, { max: hmax, unit: '', label: t('توزيع الدرجات', 'Spread of marks') }) : empty(), t('عدد الطلاب في كل شريحة من النسبة', 'Students in each band of percentage'), 'w2') +
    card(t('التقديرات', 'Grades'), C.donut(bands.map((b, i) => ({ value: counts[i], color: colorFor(i, bands.length) })), dOpt) + legend(bands.map((b, i) => [b.label, colorFor(i, bands.length), counts[i]]))) + '</div>';
  const stats = [[t('الوسيط', 'Median'), median(vals)], [t('الانحراف المعياري', 'Std. deviation'), sd(vals)], [t('أعلى', 'Highest'), vals.length ? Math.max(...vals) : null], [t('أدنى', 'Lowest'), vals.length ? Math.min(...vals) : null], [t('غياب', 'Absent'), p.absent], [t('لم تُدخل', 'Not entered'), cl.rows.length - p.vals.length - p.absent]];
  addTable(t('الأوائل ومن يحتاج متابعة', 'Top and needing support'), [t('الطالب', 'Student'), t('الدرجة', 'Mark'), '%'], tops.concat(fails).map(y => [y.x.st.name, iso(y.raw.value + ' / ' + s.max), pc(y.v)]));
  h += '<div class="anrow">' + card(t('أرقام أخرى', 'More numbers'), '<div class="stats">' + stats.map(([l, v]) => '<div><span>' + l + '</span><b class="en">' + (v == null ? '—' : r1(v)) + '</b></div>').join('') + '</div>', '', 'w2') +
    card(t('الأوائل ومن يحتاج متابعة', 'Top and needing support'), '<div class="col" style="gap:8px">' + tops.map((y, i) => '<div class="pl"><b class="mu">' + [t('الأول', '1st'), t('الثاني', '2nd'), t('الثالث', '3rd')][i] + '</b><span class="grow" dir="auto">' + E(y.x.st.name) + '</span><b class="en" style="color:var(--green)">' + y.raw.value + '</b></div>').join('') +
      fails.map(y => '<div class="pl bad">' + ic('warn', 's') + '<span class="grow" dir="auto">' + E(y.x.st.name) + '</span><b class="en">' + y.raw.value + '</b></div>').join('') + (tops.length ? '' : empty()) + '</div>') + '</div>';
  return h;
}

/* ---------- the screen ---------- */
const TABS = [['classes', 'الفصول', 'Classes'], ['subjects', 'المواد', 'Subjects'], ['student', 'الطالب', 'Student'], ['cs', 'مادة في فصل', 'Subject in a class']];
const screen = async function (p) {
  D.an = D.an || { tab: 'classes', sec: 'all' }; if (p && p.tab) D.an.tab = p.tab; if (p && p.cls) { D.an.cls = p.cls; D.an.tab = 'cs'; }
  const secs = [...new Set(D.data.classes.map(c => c.section || 'en'))], sec = secs.length > 1 ? D.an.sec : 'all';
  const A = compute(D.data, sec), prev = await previous(), P = prev ? compute(prev.data, sec) : null; if (P) P.term = prev.term;
  PDF = [];
  const head = '<div class="row anbar"><nav class="seg" aria-label="' + t('أنواع التحليل', 'Analysis') + '">' + TABS.map(([k, a, e]) => '<button class="' + (D.an.tab === k ? 'on' : '') + '" data-ant="' + k + '">' + t(a, e) + '</button>').join('') + '</nav><span class="grow"></span>' +
    (secs.length > 1 ? chips('sec', [['all', t('كل الأقسام', 'All sections')], ['en', t('الإنجليزي', 'English')], ['ar', t('العربي', 'Arabic')]], sec) : '') +
    '<button class="btn g sm" id="anX">' + ic('down', 's') + 'Excel</button><button class="btn sm" id="anP">' + ic('print', 's') + t('تصدير PDF', 'Export PDF') + '</button></div>';
  const body = head + (D.an.tab === 'subjects' ? tabSubjects(A, P) : D.an.tab === 'student' ? tabStudent(A, P) : D.an.tab === 'cs' ? tabClassSubject(A, P) : tabClasses(A, P, sec));
  const tabName = t(TABS.find(x => x[0] === D.an.tab)[1], TABS.find(x => x[0] === D.an.tab)[2]);
  return { title: t('تحليل النتيجة', 'Result analysis'), sub: tabName + (D.data.term ? ' · ' + E(termLabel(D.data.term)) : '') + (P ? ' · ' + t('مقارنةً بـ ', 'compared with ') + E(termLabel(P.term)) : ''), body,
    bind(m) {
      const re = () => render(false);
      $$('[data-ant]', m).forEach(b => b.onclick = () => { D.an.tab = b.dataset.ant; re(); });
      $$('[data-sec]', m).forEach(b => b.onclick = () => { D.an.sec = b.dataset.sec; re(); });
      $$('[data-subj]', m).forEach(b => b.onclick = () => { D.an.subj = b.dataset.subj; D.an.tab = 'subjects'; re(); });
      $$('[data-cls]', m).forEach(b => b.onclick = () => { D.an.cls = +b.dataset.cls; D.an.csub = null; re(); });
      $$('[data-csub]', m).forEach(b => b.onclick = () => { D.an.csub = +b.dataset.csub; re(); });
      $$('[data-goc]', m).forEach(b => b.onclick = () => { D.an.cls = +b.dataset.goc; D.an.csub = null; D.an.tab = 'cs'; re(); });
      const s = $('#anStu', m); if (s) s.onchange = () => { D.an.stu = +s.value; re(); };
      $('#anX', m).onclick = () => run(() => excel(A));
      $('#anP', m).onclick = () => run(() => pdf(tabName));
      motion(m);
    } };
};
/* 3D feel: numbers count up, a chart turns a little with the finger or the mouse */
function motion(m) {
  $$('[data-count]', m).forEach(el => { const txt = el.dataset.count, mm = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(txt); if (!mm || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const to = +mm[1], tail = mm[2], dec = (mm[1].split('.')[1] || '').length, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec) + tail; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); });
  $$('.chwrap', m).forEach(w => { const svg = w.querySelector('svg.ch3'); if (!svg) return;
    w.onpointermove = e => { const r = w.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; svg.style.transform = 'perspective(900px) rotateY(' + (x * 10).toFixed(1) + 'deg) rotateX(' + (-y * 8).toFixed(1) + 'deg)'; };
    w.onpointerleave = () => { svg.style.transform = ''; }; });
}

/* ---------- Excel: the whole analysis in four sheets ---------- */
async function excel(A) {
  const X = window.XLSX, wb = X.utils.book_new(), term = D.data.term ? termLabel(D.data.term) : '';
  const sheet = (name, rows, w) => { const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = w.map(x => ({ wch: x })); X.utils.book_append_sheet(wb, ws, name); };
  sheet('Classes', [['Class', 'Section', 'Stage', 'Students', 'Average %', 'Pass %', 'Highest %', 'Lowest %', 'Failing a subject']].concat(A.classes.map(x => [x.c.name, x.c.section === 'ar' ? 'Arabic' : 'English', stageOf(x.c), x.n, x.avg == null ? '' : r1(x.avg), x.pass == null ? '' : r1(x.pass), x.hi == null ? '' : r1(x.hi), x.lo == null ? '' : r1(x.lo), x.failing])), [22, 10, 24, 9, 10, 9, 10, 10, 16]);
  const groups = [...A.subjects.values()];
  sheet('Subjects', [['Subject', 'Class', 'Teacher', 'Students', 'Average %', 'Pass %', 'Absent']].concat(groups.flatMap(g => g.per.map(p => [g.name, p.c.name, p.s.teacherId ? nameOf(p.s.teacherId) : '', p.vals.length, p.avg == null ? '' : r1(p.avg), p.pass == null ? '' : r1(p.pass), p.absent]))), [24, 20, 22, 9, 10, 9, 8]);
  sheet('Students', [['Class', 'Student', 'Total', 'Out of', '%', 'Grade', 'Rank', 'Failed subjects']].concat(A.students.map(x => [x.cls.name, x.st.name, x.pct == null ? '' : x.r.total.got, x.pct == null ? '' : x.r.total.max, x.pct == null ? '' : r1(x.pct), (x.cls.section === 'ar' ? x.r.total.label : x.r.total.grade) || '', x.rank ? x.rank + ' / ' + x.of : '', x.fails.join(', ')])), [20, 32, 8, 8, 8, 10, 8, 30]);
  const names = groups.map(g => g.name);
  sheet('Marks %', [['Class', 'Student'].concat(names)].concat(A.students.map(x => [x.cls.name, x.st.name].concat(names.map(n => { const s = x.cls && A.classes.find(c => c.c.id === x.cls.id).subs.find(y => key(y.name) === key(n)); return s && x.per[s.id] != null ? r1(x.per[s.id]) : ''; })))), [20, 32].concat(names.map(() => 12)));
  await N.saveFile({ name: 'Ooz-Marks-analysis-' + fileSafe(term || 'term') + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: X.write(wb, { type: 'base64', bookType: 'xlsx' }) });
  toast(t('تم حفظ الملف', 'File saved'));
}

/* ---------- PDF: the page you see, on A4 (charts as pictures, tables as text) ---------- */
async function pdf(tabName) {
  const PL = window.PDFLib, doc = await PL.PDFDocument.create(), Wp = 1240, Hp = 1754, M = 70, rtl = D.cfg.lang !== 'en';
  try { await Promise.all(['700 30px A', '400 30px A'].map(f => document.fonts.load(f, 'ابت'))); } catch (e) {}
  const cv = document.createElement('canvas'); cv.width = Wp; cv.height = Hp; const g = cv.getContext('2d');
  let y = 0; const pages = [];
  const fresh = () => { if (y) pages.push(cv.toDataURL('image/jpeg', 0.92)); g.fillStyle = '#fff'; g.fillRect(0, 0, Wp, Hp); g.direction = rtl ? 'rtl' : 'ltr'; y = M;
    g.fillStyle = '#2A2826'; g.font = '700 34px A, S, sans-serif'; g.textAlign = rtl ? 'right' : 'left'; g.fillText(t('تحليل النتيجة', 'Result analysis') + ' · ' + tabName, rtl ? Wp - M : M, y + 30);
    g.font = '400 20px A, S, sans-serif'; g.fillStyle = '#6B6055'; g.fillText(ST().schoolName + (D.data.term ? ' · ' + termLabel(D.data.term) : '') + ' · ' + new Date().toISOString().slice(0, 10), rtl ? Wp - M : M, y + 64);
    g.fillStyle = '#E8A93A'; g.fillRect(M, y + 84, Wp - 2 * M, 4); y += 110; };
  const need = h => { if (y + h > Hp - M) fresh(); };
  const X0 = rtl ? Wp - M : M, sign = rtl ? -1 : 1;
  fresh();
  for (const b of PDF) {
    if (b.k === 'kpis') { need(130); const w = (Wp - 2 * M - 3 * 18) / 4;
      b.items.forEach(([l, v], i) => { const x = rtl ? Wp - M - (i + 1) * w - i * 18 : M + i * (w + 18); g.fillStyle = '#F6ECDD'; g.fillRect(x, y, w, 110);
        g.textAlign = rtl ? 'right' : 'left'; const tx = rtl ? x + w - 16 : x + 16; g.fillStyle = '#6B6055'; g.font = '700 18px A, S, sans-serif'; g.fillText(l.slice(0, 34), tx, y + 32);
        g.fillStyle = '#2A2826'; let fs = 34; g.font = '700 ' + fs + 'px S, A, sans-serif'; while (g.measureText(v).width > w - 30 && fs > 14) { fs -= 2; g.font = '700 ' + fs + 'px S, A, sans-serif'; } g.fillText(v, tx, y + 80); });
      y += 140; }
    else if (b.k === 'chart') { const img = await C.toPng(b.svg, 2), w = Math.min(Wp - 2 * M, img.W * 1.6), h = w * img.H / img.W; need(h + 60);
      g.fillStyle = '#2A2826'; g.font = '700 24px A, S, sans-serif'; g.textAlign = rtl ? 'right' : 'left'; g.fillText(b.title, X0, y + 24);
      const im = new Image(); await new Promise(r => { im.onload = r; im.src = img.url; }); g.drawImage(im, (Wp - w) / 2, y + 40, w, h); y += h + 70; }
    else if (b.k === 'table') { need(100); g.fillStyle = '#2A2826'; g.font = '700 24px A, S, sans-serif'; g.textAlign = rtl ? 'right' : 'left'; g.fillText(b.title, X0, y + 24); y += 44;
      const n = b.head.length, cw = (Wp - 2 * M) / n, row = (cells, bold, fill) => { need(40); if (fill) { g.fillStyle = fill; g.fillRect(M, y, Wp - 2 * M, 38); }
        cells.forEach((c, i) => { const x = rtl ? Wp - M - i * cw - 10 : M + i * cw + 10; g.fillStyle = '#2A2826'; g.font = (bold ? '700 ' : '400 ') + '18px A, S, sans-serif'; let s = String(c == null ? '' : c); while (g.measureText(s).width > cw - 16 && s.length > 2) s = s.slice(0, -2) + '…'; g.fillText(s, x, y + 26); }); y += 38; };
      row(b.head, true, '#F6ECDD'); b.rows.forEach((r, i) => row(r, false, i % 2 ? '#FBF6EF' : null)); y += 30; }
  }
  pages.push(cv.toDataURL('image/jpeg', 0.92));
  for (const u of pages) { const bytes = Uint8Array.from(atob(u.split(',')[1]), c => c.charCodeAt(0)), im = await doc.embedJpg(bytes), pg = doc.addPage([595.28, 841.89]); pg.drawImage(im, { x: 0, y: 0, width: 595.28, height: 841.89 }); }
  const b64 = await doc.saveAsBase64(); const r = await N.saveFile({ name: 'Ooz-Marks-analysis-' + fileSafe(tabName) + '.pdf', mime: 'application/pdf', base64: b64 }); if (r) toast(t('تم حفظ الملف', 'File saved'));
}
return screen;
};
