'use strict';
/* Ooz Marks 2.6 — Ooz School Suite: export the school to a .oozschool file and import one made by Ooz Timetable Studio,
   Ooz School Manager or another Ooz Marks. For the system principal only (Settings → School data for the Ooz programs).
   Pages: export → import → review → similar names (a sheet) → done (teacher accounts, undo). Importing only adds and updates.
   In Ooz Marks a subject is a row per class: a file subject becomes a row in each class it is taught in; a new row starts
   at 100 marks (pass 50) until the principal sets its full mark. A new teacher gets an account with a temporary password. */
window.OozSuiteInit = function (H) {
  const { D, t, E, ic, api, render, $, $$, run, toast, N, go, dialog } = H, S = window.OozSchoolSync;
  const X = () => S.TEXT[D.cfg.lang === 'en' ? 'en' : 'ar'];
  const st = { include: { school: true, classes: true, subjects: true, teachers: true, students: true, results: false }, file: null, err: '', plan: null, answers: [], raw: null, result: null };
  const STAGE_AR = { primary: 'الابتدائية', lower: 'المتوسطة', secondary: 'الثانوية' }, STAGE_EN = { primary: 'Primary', lower: 'Lower Secondary', secondary: 'Secondary' };

  // ---- the school as the shared file sees it ----
  async function raw(results) { return api('suiteExport', { results: !!results }); }
  function groups(r) {   // subject rows grouped into subjects: by their uid, or by name
    const g = new Map();
    for (const s of r.subjects) { const k = s.uid || 'mk:s:' + S.norm(s.name).replace(/ /g, '-'); if (!g.has(k)) g.set(k, { key: k, uid: s.uid || '', uids: ['mk:s:' + S.norm(s.name).replace(/ /g, '-')], name: s.name, rows: [] }); g.get(k).rows.push(s); }
    return [...g.values()];
  }
  const cU = c => c.uid || 'mk:c:' + c.id, tU = u => u.uid || 'mk:t:' + u.id, pU = s => s.uid || 'mk:p:' + s.id, stU = c => 'mk:st:' + (c.section || 'en') + ':' + c.stage;
  function local(r) {
    return { classes: r.classes.map(c => ({ key: c.id, uid: c.uid, uids: ['mk:c:' + c.id], name: c.name })),
      subjects: groups(r), teachers: r.teachers.map(u => ({ key: u.id, uid: u.uid, uids: ['mk:t:' + u.id], name: u.name })),
      students: r.students.map(s => ({ key: s.id, uid: s.uid, uids: ['mk:p:' + s.id], name: s.name, class: s.classId, number: s.number || '' })) };
  }
  function exportFile(r) {
    const inc = st.include, cls = new Map(r.classes.map(c => [c.id, c])), g = groups(r), usr = new Map(r.teachers.map(u => [u.id, u]));
    const src = { app: 'Ooz Marks', appVersion: H.VERSION, school: inc.school ? { name: r.school.name, logo: r.school.logo, year: r.school.year } : {} };
    if (inc.school) { const seen = new Map(); r.classes.forEach(c => { const u = stU(c); if (!seen.has(u)) seen.set(u, { uid: u, name: (c.section === 'ar' ? STAGE_AR : STAGE_EN)[c.stage] || c.stage, nameEn: STAGE_EN[c.stage] || c.stage, section: c.section || 'en' }); }); src.stages = [...seen.values()]; }
    if (inc.classes) src.classes = r.classes.map(c => ({ uid: cU(c), name: c.name, stage: inc.school ? stU(c) : '' }));
    if (inc.subjects) src.subjects = g.map(x => ({ uid: x.uid || x.key, name: x.name, classes: inc.classes ? [...new Set(x.rows.map(s => cls.get(s.classId)).filter(Boolean).map(cU))] : [], max: inc.classes ? Object.fromEntries(x.rows.filter(s => s.kind !== 'grade' && cls.get(s.classId)).map(s => [cU(cls.get(s.classId)), s.max])) : {} }));
    if (inc.teachers) {
      src.teachers = r.teachers.map(u => ({ uid: tU(u), name: u.name }));
      if (inc.subjects && inc.classes) src.teaching = g.flatMap(x => x.rows.filter(s => s.teacherId && usr.get(s.teacherId) && cls.get(s.classId)).map(s => ({ teacher: tU(usr.get(s.teacherId)), subject: x.uid || x.key, class: cU(cls.get(s.classId)) })));
    }
    if (inc.students && inc.classes) src.students = r.students.filter(s => cls.get(s.classId)).map(s => ({ uid: pU(s), name: s.name, class: cU(cls.get(s.classId)), number: s.number || '' }));
    if (inc.results && inc.students && inc.subjects && r.marks) {
      const terms = new Map(r.terms.map(x => [x.id, x.name + ' · ' + x.year])), stu = new Map(r.students.map(s => [s.id, pU(s)])), sub = new Map();
      g.forEach(x => x.rows.forEach(s => sub.set(s.id, { uid: x.uid || x.key, max: s.kind === 'grade' ? null : s.max })));
      src.results = r.marks.filter(m => stu.has(m.studentId) && sub.has(m.subjectId)).map(m => ({ term: terms.get(m.termId) || '', student: stu.get(m.studentId), subject: sub.get(m.subjectId).uid, value: m.value, max: sub.get(m.subjectId).max, abs: !!m.abs, grade: m.grade || undefined }));
    }
    return S.build(src);
  }

  // ---- a reviewed plan → the changes the server applies ----
  const AR_RX = /[؀-ۿ]/;
  function stageOf(file, c) {   // Ooz Marks keeps three stages per section; guess them from the file's stage and the class name
    const s = (file.stages || []).find(x => x.uid === c.stage), words = S.norm(((s && (s.name + ' ' + (s.nameEn || ''))) || '') + ' ' + c.name);
    let stage = /ابتدا|primary|elementary|اساس/.test(words) ? 'primary' : /متوسط|اعداد|lower|middle|intermediate/.test(words) ? 'lower' : /ثانو|secondary|high/.test(words) ? 'secondary' : '';
    if (!stage) { const n = +((/\d+/.exec(c.name) || [])[0] || 0), ord = ['الاول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'].findIndex(w => S.norm(c.name).includes(w)) + 1;
      const g = n || ord; stage = g >= 10 ? 'secondary' : g >= 7 ? 'lower' : 'primary'; }
    const section = s && ['ar', 'en'].includes(s.section) ? s.section : AR_RX.test(c.name) ? 'ar' : 'en';
    return { stage, section };
  }
  function changes(p, file, r) {
    const out = { from: file.app, classes: { add: [], update: [] }, teachers: { add: [], update: [] }, subjects: { add: [], update: [] }, students: { add: [], update: [] } };
    const cref = new Map(), tref = new Map();   // file uid → an existing id or a new ref
    p.kinds.classes.add.forEach((x, i) => { const ref = 'c' + i, g = stageOf(file, x.incoming); cref.set(x.incoming.uid, ref); out.classes.add.push({ ref, name: x.incoming.name, stage: g.stage, section: g.section, uid: x.incoming.uid, sort: 100 + i }); });
    for (const x of p.kinds.classes.update.concat(p.kinds.classes.same)) { cref.set(x.incoming.uid, x.local.key); if (x.changes.name || x.changes.__uid) out.classes.update.push({ id: x.local.key, name: x.changes.name, uid: x.changes.__uid }); }
    p.kinds.teachers.add.forEach((x, i) => { const ref = 't' + i; tref.set(x.incoming.uid, ref); out.teachers.add.push({ ref, name: x.incoming.name, nameEn: x.incoming.nameEn || '', uid: x.incoming.uid }); });
    for (const x of p.kinds.teachers.update.concat(p.kinds.teachers.same)) { tref.set(x.incoming.uid, x.local.key); if (x.changes.name || x.changes.__uid) out.teachers.update.push({ id: x.local.key, name: x.changes.name, uid: x.changes.__uid }); }
    const classOf = u => cref.has(u) ? cref.get(u) : null, teach = new Map();
    for (const a of file.teaching || []) if (a.class && tref.has(a.teacher)) teach.set(a.subject + '|' + a.class, tref.get(a.teacher));
    const fileSub = new Map(file.subjects.map(s => [s.uid, s])), rowsByClass = new Map();
    r.subjects.forEach(s => { const k = s.classId; if (!rowsByClass.has(k)) rowsByClass.set(k, []); rowsByClass.get(k).push(s); });
    const subjects = p.kinds.subjects.add.map(x => ({ inc: x.incoming, group: null, newUid: x.incoming.uid })).concat(p.kinds.subjects.update.concat(p.kinds.subjects.same).map(x => ({ inc: x.incoming, group: x.local, newUid: x.changes.__uid || null })));
    for (const s of subjects) {
      const f = fileSub.get(s.inc.uid) || s.inc;
      for (const cu of f.classes || []) {
        const c = classOf(cu); if (c == null) continue;
        const teacherRef = teach.get(s.inc.uid + '|' + cu), max = f.max && f.max[cu];
        const row = typeof c === 'number' ? (s.group && s.group.rows.find(x => x.classId === c)) || (rowsByClass.get(c) || []).find(x => S.norm(x.name) === S.norm(s.inc.name)) : null;
        if (row) { const upd = { id: row.id }; if (s.group && s.group.rows.includes(row) && p.kinds.subjects.update.some(x => x.local === s.group) && s.inc.name && S.norm(s.inc.name) !== S.norm(row.name)) upd.name = s.inc.name;
          if (!row.uid) upd.uid = s.inc.uid; if (teacherRef != null && !row.teacherId) upd.teacherRef = teacherRef; if (Object.keys(upd).length > 1) out.subjects.update.push(upd); }
        else out.subjects.add.push({ classRef: c, name: s.inc.name, uid: s.inc.uid, teacherRef: teacherRef == null ? null : teacherRef, max: max || null });
      }
    }
    for (const x of p.kinds.students.add) { const c = typeof x.incoming.class === 'number' ? x.incoming.class : classOf(x.incoming.class); if (c == null) continue; out.students.add.push({ classRef: c, name: x.incoming.name, number: x.incoming.number || '', uid: x.incoming.uid }); }
    for (const x of p.kinds.students.update.concat(p.kinds.students.same)) { const ch = x.changes; if (!ch.name && !ch.number && !ch.class && !ch.__uid) continue;
      out.students.update.push({ id: x.local.key, name: ch.name, number: ch.number, classRef: ch.class != null ? (typeof ch.class === 'number' ? ch.class : classOf(ch.class)) : null, uid: ch.__uid }); }
    return out;
  }

  // ---- pages (Ooz Marks look) ----
  const ICON = { school: 'set', classes: 'cls', subjects: 'marks', teachers: 'teach', students: 'stud', results: 'chart' };
  const row = (k, title, sub, on, off) => '<button class="li suite-row' + (off ? ' off' : '') + '" data-inc="' + k + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (on ? 'true' : 'false') + '"><span class="suite-ic s-' + k + '">' + ic(ICON[k]) + '</span><span class="mid"><b>' + E(title) + '</b><small>' + E(sub) + '</small></span><span class="suite-ck' + (on ? ' on' : '') + '">' + (on ? ic('check', 's') : '') + '</span></button>';
  function pageExport(r) {
    const x = X(), i = st.include, g = groups(r);
    return { title: x.exportTitle, sub: x.exportSub, body: '<div class="suite"><div class="suite-apps"><span>Timetable Studio</span><span>Ooz Marks</span><span>School Manager</span></div><h3 class="suite-ttl">' + x.what + '</h3><div class="list suite-list">' +
      row('school', x.school, x.schoolSub, i.school) + row('classes', x.classes, x.nClasses(r.classes.length), i.classes) + row('subjects', x.subjects, x.nSubjects(g.length), i.subjects) +
      row('teachers', x.teachersTeaching, x.nTeachers(r.teachers.length) + ' · ' + x.whoTeaches, i.teachers) + row('students', x.students, x.nStudents(r.students.length), i.students) +
      row('results', x.results, t('كل الفصول الدراسية', 'Every term'), i.results) + '</div><div class="sticky"><button class="btn suite-gold" id="suiteExport" style="width:100%">' + ic('down') + x.doExport + '</button></div></div>',
      bind(m) {
        $$('[data-inc]', m).forEach(b => b.onclick = () => { const k = b.dataset.inc; i[k] = !i[k]; if (k === 'classes' && !i.classes) { i.students = false; i.results = false; } if ((k === 'students' || k === 'results') && i[k]) i.classes = true; if (k === 'results' && i.results) { i.students = true; i.subjects = true; } render(); });
        $('#suiteExport', m).onclick = async () => { const r2 = await run(() => raw(i.results)); const f = exportFile(r2); const b64 = btoa(unescape(encodeURIComponent(S.toText(f))));
          const ok = await N.saveFile({ name: S.fileName(f), mime: 'application/octet-stream', base64: b64 }); if (ok) toast(x.exported); };
      } };
  }
  function fromLine(f) { const w = f.exportedAt ? new Date(f.exportedAt) : null; return E(X().from) + ' <b class="en">' + E(S.APPS[f.app] || f.app || '—') + '</b>' + (w && !isNaN(w) ? ' · <span class="en">' + E(w.toLocaleDateString(D.cfg.lang === 'en' ? 'en-GB' : 'ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }) + ' ' + w.toLocaleTimeString(D.cfg.lang === 'en' ? 'en-GB' : 'ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' })) + '</span>' : ''); }
  function pageImport() {
    const x = X(), f = st.file, note = '<div class="note ok suite-note">' + ic('lock', 's') + '<span><b>' + x.never + '</b> ' + x.neverText + '</span></div>';
    if (!f) return { title: x.importTitle, sub: x.importSub, body: '<div class="suite"><div class="c pad col suite-file">' + doc() + (st.err ? '<div class="note bad">' + ic('warn', 's') + E(st.err) + '</div>' : '') + '<button class="btn" id="suitePick">' + ic('up') + x.pick + '</button></div>' + note + '</div>', bind: bindImport };
    const c = S.counts(f), other = f.school.name && !S.sameSchool(f.school.name, H.schoolName());
    const kv = (a, b, dim) => '<div class="suite-kv' + (dim ? ' dim' : '') + '"><span>' + a + '</span><b>' + b + '</b></div>';
    return { title: x.importTitle, sub: x.importSub, body: '<div class="suite"><div class="c pad col suite-file">' + doc() + '<b class="suite-sname">' + E(f.school.name || f.school.nameEn || '—') + (f.school.year ? ' · <span class="en">' + E(f.school.year) + '</span>' : '') + '</b><span class="mu suite-from">' + fromLine(f) + '</span></div>' +
      (other ? '<div class="note bad">' + ic('warn', 's') + '<span>' + E(x.otherSchool(f.school.name, H.schoolName())) + '</span></div>' : '') +
      '<h3 class="suite-ttl">' + x.contains + '</h3><div class="c pad suite-kvs">' + [['classes', c.classes], ['subjects', c.subjects], ['teachers', c.teachers], ['students', c.students]].filter(r => r[1]).map(r => kv(x[r[0]], r[1])).join('') +
      (c.teaching ? kv(t('توزيع المواد على المعلمين', 'Who teaches what'), ic('check', 's')) : '') + (c.results ? kv(x.results, x.notHere, true) : '') + '</div>' + note +
      '<div class="sticky col" style="gap:8px"><button class="btn" id="suiteReview" style="width:100%">' + x.review + '</button><button class="btn g" id="suitePick" style="width:100%">' + x.pickOther + '</button></div></div>', bind: bindImport };
  }
  const doc = () => '<div class="suite-doc"><b>.oozschool</b></div>';
  function bindImport(m) {
    const p = $('#suitePick', m); if (p) p.onclick = async () => { let f; try { f = await N.pickFile('.oozschool,.json'); } catch (e) { return toast(e.message || String(e), true); } if (!f) return;
      st.err = ''; try { const bin = atob(f.base64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); st.file = S.parse(u); } catch (e) { st.file = null; st.err = X().errors[e.code] || X().errors.notOozschool; } render(); };
    const r = $('#suiteReview', m); if (r) r.onclick = async () => { st.raw = await run(() => raw(false)); st.plan = S.plan(st.file, local(st.raw), { include: ['classes', 'subjects', 'teachers', 'students'], fields: { classes: ['name'], subjects: ['name'], teachers: ['name'], students: ['name', 'class', 'number'] } }); st.answers = st.plan.ask.map(() => null); go('suite', { view: 'review' }); };
  }
  const USED = ['classes', 'subjects', 'teachers', 'students'];
  function pageReview() {
    const x = X(), s = S.summary(st.plan), n = st.plan.ask.length, left = st.answers.filter(a => a == null).length;
    const block = k => { const v = s[k]; if (!v.add && !v.update && !v.same) return ''; return '<div class="c pad suite-stat"><div class="row"><span class="suite-ic s-' + k + '">' + ic(ICON[k]) + '</span><b>' + x[k] + '</b></div><div class="suite-nums"><div class="add"><b>' + v.add + '</b>' + x.add + '</div><div class="upd"><b>' + v.update + '</b>' + x.update + '</div><div class="same"><b>' + v.same + '</b>' + x.same + '</div></div></div>'; };
    return { title: x.reviewTitle, sub: x.reviewSub, body: '<div class="suite"><div class="cards suite-cards">' + USED.map(block).join('') + '</div>' +
      (n ? '<button class="note bad suite-warn" id="suiteAsk">' + ic('warn', 's') + '<span><b>' + (left ? x.needYou(left) : x.settled) + '</b> — ' + (left ? x.needWhy : x.settledWhy) + '</span><b class="suite-go">' + x.show + ' ‹</b></button>' : '') +
      '<div class="sticky"><button class="btn suite-gold" id="suiteRun" style="width:100%">' + ic('check') + x.run + '</button></div></div>',
      bind(m) { const a = $('#suiteAsk', m); if (a) a.onclick = () => ask(Math.max(0, st.answers.findIndex(v => v == null)));
        $('#suiteRun', m).onclick = async () => { const nx = st.answers.findIndex(v => v == null); if (nx >= 0) return ask(nx); await apply(); }; } };
  }
  function ask(i) {
    const x = X(), a = st.plan.ask[i], cls = new Map(st.raw.classes.map(c => [c.id, c.name])), fileCls = new Map(st.file.classes.map(c => [c.uid, c.name]));
    const where = r => r.class != null && r.class !== '' ? (cls.get(r.class) || fileCls.get(r.class) || '') : '';
    const opt = (v, title, sub, on) => '<button class="suite-opt' + (on ? ' on' : '') + '" data-ans="' + E(v) + '"><span class="suite-rd"></span><span class="mid"><b>' + title + '</b><small>' + sub + '</small></span></button>';
    const cur = st.answers[i];
    dialog('<div class="suite-sheet"><h2>' + x.similar + ' <small class="suite-of">' + (i + 1) + x.of + st.plan.ask.length + '</small></h2><p class="mu" style="margin:0">' + x.inFile + ' <b>' + E(a.incoming.name) + '</b>' + (where(a.incoming) ? ' · ' + E(where(a.incoming)) : '') + '</p>' +
      a.candidates.map(c => opt('k:' + c.key, x.sameAs(a.kind) + ': ' + E(c.name), (where(c) ? E(where(c)) + ' · ' : '') + x.existing, cur && cur.same != null && String(cur.same) === String(c.key))).join('') +
      opt('new', x.asNew(a.kind), x.asNewSub, cur === 'new') + opt('skip', x.skip, x.skipSub, cur === 'skip') + '<div class="acts"><button class="btn" data-next style="width:100%">' + x.next + ' ‹</button></div></div>', (o, close) => {
      $$('[data-ans]', o).forEach(b => b.onclick = () => { const v = b.dataset.ans; st.answers[i] = v.startsWith('k:') ? { same: v.slice(2) } : v; $$('[data-ans]', o).forEach(y => y.classList.toggle('on', y === b)); });
      $('[data-next]', o).onclick = () => { if (st.answers[i] == null) st.answers[i] = 'skip'; close(); const nx = st.answers.findIndex(v => v == null); if (nx >= 0) ask(nx); else render(); };
    });
    const ov = $('.ov'); if (ov) ov.classList.add('suite-ov');
  }
  async function apply() {
    const p = S.decide(st.plan, st.answers.map(a => a && a.same != null ? { same: a.same } : a));
    const body = changes(p, st.file, st.raw);
    st.result = await run(() => api('suiteImport', body));
    st.result.from = st.file.app; await H.load(); go('suite', { view: 'done' }, false);
  }
  function pageDone() {
    const x = X(), r = st.result || { added: 0, updated: 0, accounts: [] };
    const kv = (a, b) => '<div class="suite-kv"><span>' + a + '</span>' + b + '</div>';
    return { title: x.doneTitle, sub: E(H.schoolName()), body: '<div class="suite suite-done"><div class="suite-ok">' + ic('check', 'l') + '</div><h2 class="suite-big">' + x.doneBig + '</h2><p class="mu suite-sub">' + x.doneSub(r.added, r.updated) + '</p>' +
      '<div class="c pad suite-kvs">' + kv(t('حسابات معلمين جديدة', 'New teacher accounts'), '<b>' + r.accounts.length + '</b>') + (r.accounts.length ? kv(t('كلمات المرور المؤقتة', 'Temporary passwords'), '<button class="lnk" id="suitePw">' + t('عرض ونسخ', 'Show and copy') + ' ‹</button>') : '') +
      (r.defaultMax ? kv(t('مواد بدرجة كاملة افتراضية (100)', 'Subjects with a default full mark (100)'), '<button class="lnk warn" id="suiteMax">' + r.defaultMax + ' · ' + t('حددها', 'Set them') + ' ‹</button>') : '') + '</div>' +
      (r.importId && !r.undone ? '<button class="note ok suite-note" id="suiteUndo">' + ic('undo', 's') + '<span><b>' + x.undo + '</b> — ' + x.undoNote + '</span></button>' : '') +
      '<div class="sticky"><button class="btn" id="suiteDone" style="width:100%">' + x.done + '</button></div></div>',
      bind(m) {
        $('#suiteDone', m).onclick = () => H.tab('classes');
        const mx = $('#suiteMax', m); if (mx) mx.onclick = () => H.tab('classes');
        const pw = $('#suitePw', m); if (pw) pw.onclick = () => { const lines = r.accounts.map(a => a.name + ' — ' + a.username + ' — ' + a.password).join('\n');
          dialog('<h2>' + t('حسابات المعلمين الجدد', 'New teacher accounts') + '</h2><p class="mu" style="margin:0;font-size:13px">' + t('يدخل كل معلم برمز المدرسة واسم المستخدم وكلمة المرور، ثم يغيّرها.', 'Each teacher signs in with the school code, user name and password, then changes it.') + '</p><div class="tw"><table><thead><tr><th>' + t('المعلم', 'Teacher') + '</th><th>' + t('اسم المستخدم', 'User name') + '</th><th>' + t('كلمة المرور', 'Password') + '</th></tr></thead><tbody>' +
            r.accounts.map(a => '<tr><td>' + E(a.name) + '</td><td class="en ltr">' + E(a.username) + '</td><td class="en ltr"><b>' + E(a.password) + '</b></td></tr>').join('') + '</tbody></table></div><div class="acts"><button class="btn g" data-x>' + t('إغلاق', 'Close') + '</button><button class="btn" data-cp>' + ic('copy', 's') + t('نسخ الكل', 'Copy all') + '</button></div>',
            (o, close) => { $('[data-x]', o).onclick = close; $('[data-cp]', o).onclick = async () => { const ok = await N.copy(lines); toast(ok === false ? lines : t('تم النسخ', 'Copied')); }; }); };
        const u = $('#suiteUndo', m); if (u) u.onclick = async () => { if (!(await H.confirmBox(x.undoAsk, x.undo, true))) return;
          await run(() => api('suiteUndo', { id: r.importId }), x.undone); r.undone = true; await H.load(); render(); };
      } };
  }
  return async p => {
    const v = p.view || 'export';
    if (v === 'export') return pageExport(await raw(false));
    if (v === 'import') { if (p.fresh) { st.file = null; st.err = ''; p.fresh = false; } return pageImport(); }
    if (v === 'review' && st.plan) return pageReview();
    if (v === 'done' && st.result) return pageDone();
    return pageImport();
  };
};
