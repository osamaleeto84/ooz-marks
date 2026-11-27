// Ooz Marks — every call is POST /api with {op, ...}. Signed-in calls carry "Authorization: Bearer <token>".
// Each school sees only its own rows: every query below is bound to the caller's school_id.
const { q } = require('./_db');
const H = require('./_http');
const { Fail } = H;

const TRIAL_DAYS = 30, SESSION_DAYS = 30;
const ROLES = ['admin', 'teacher', 'print'];
const STAGES = ['primary', 'lower', 'secondary'], SECTIONS = ['en', 'ar'], KINDS = ['mark', 'grade'];
const DEFAULTS = {
  schoolName: '', curriculum: 'BRITISH CURRICULUM', footer: '', watermark: true,
  departments: { primary: 'PRIMARY DEPARTMENT', lower: 'LOWER SECONDARY DEPARTMENT', secondary: 'SECONDARY DEPARTMENT' },
  bands: [{ g: 'A*', from: 90, label: 'EXCELLENT' }, { g: 'A', from: 80, label: 'VERY GOOD' }, { g: 'B', from: 70, label: 'VERY GOOD' },
    { g: 'C', from: 60, label: 'GOOD' }, { g: 'D', from: 50, label: 'GOOD' }, { g: 'E', from: 40, label: 'SATISFACTORY' }, { g: 'F', from: 0, label: 'POOR' }],
  // the Arabic section's report card
  ar: {
    lines: ['سفارة جمهورية السودان بالقاهرة – المستشارية الثقافية', ''],
    stages: { primary: 'الابتدائية', lower: 'المتوسطة', secondary: 'الثانوية' },
    bands: [{ from: 90, label: 'ممتاز' }, { from: 80, label: 'جيد جداً' }, { from: 65, label: 'جيد' }, { from: 50, label: 'مقبول' }, { from: 0, label: 'ضعيف' }],
    signs: ['مشرف الصف', 'مدير المرحلة', 'مدير المدرسة'], color: '#3D5E9E', basmala: true,
  },
  failRule: 'band', rounding: 'one', absRule: 'zero', checkComments: true, checkDuplicates: true,
  commentBank: [
    'Excellent effort and focus this term; keep up the outstanding work.',
    'Shows steady progress and a positive attitude towards learning.',
    'Works well in class and participates actively in discussions.',
    'Needs more practice in reading and writing to build confidence.',
    'Should pay more attention in class and complete homework regularly.',
    'With consistent practice and better study routines, he can achieve much stronger results.',
    'With consistent practice and better study routines, she can achieve much stronger results.',
  ],
};

// ---------- small helpers ----------
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const int = v => (Number.isFinite(+v) ? Math.trunc(+v) : 0);
const num = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const bad = (code, msg) => new Fail(400, code, msg);
async function one(sql, p) { const r = await q(sql, p); return r[0] || null; }
function status(s) {
  const now = Date.now(), lic = s.license_until ? new Date(s.license_until).getTime() : 0, trial = new Date(s.trial_ends).getTime();
  if (lic > now) return { state: 'licensed', until: s.license_until, daysLeft: Math.ceil((lic - now) / 864e5) };
  if (trial > now) return { state: 'trial', until: s.trial_ends, daysLeft: Math.ceil((trial - now) / 864e5) };
  return { state: 'expired', until: lic ? s.license_until : s.trial_ends, daysLeft: 0 };
}
function settingsOf(s) {
  const st = Object.assign({}, DEFAULTS, s.settings || {});
  st.departments = Object.assign({}, DEFAULTS.departments, (s.settings || {}).departments || {});
  const ar = (s.settings || {}).ar || {};
  st.ar = Object.assign({}, DEFAULTS.ar, ar, { stages: Object.assign({}, DEFAULTS.ar.stages, ar.stages || {}) });
  if (!st.ar.lines[1]) st.ar.lines = [st.ar.lines[0], (st.schoolName || s.name) + ' – القسم العربي'];
  if (!st.schoolName) st.schoolName = s.name;
  return st;
}
const userOut = u => ({ id: u.id, username: u.username, name: u.name, role: u.role, active: u.active, mustChange: u.must_change, scope: scopeOf(u) });
/* A principal's scope: none = the system principal (everything); a section (en/ar) and, if given, some of its stages. */
const scopeOf = u => { const x = u.scope || {}; if (u.role !== 'admin' || !SECTIONS.includes(x.section)) return {}; return { section: x.section, stages: (Array.isArray(x.stages) ? x.stages : []).filter(k => STAGES.includes(k)) }; };
const normScope = (role, x) => scopeOf({ role, scope: x || {} });
const scoped = u => !!scopeOf(u).section;
const inScope = (u, c) => { const x = scopeOf(u); return !x.section || ((c.section || 'en') === x.section && (!x.stages.length || x.stages.includes(c.stage))); };
async function scopeClass(ctx, classId) { if (!scoped(ctx.user)) return; const c = await one('SELECT section, stage FROM classes WHERE id=$1 AND school_id=$2', [int(classId), ctx.school.id]); if (!c || !inScope(ctx.user, c)) throw new Fail(403, 'scope'); }
async function scopeStudents(ctx, ids) { const r = await q('SELECT s.id, c.section, c.stage FROM students s JOIN classes c ON c.id=s.class_id WHERE s.school_id=$1 AND s.id = ANY($2::int[])', [ctx.school.id, ids]); return r.filter(x => inScope(ctx.user, x)).map(x => x.id); }
async function audit(ctx, action, detail) { await q('INSERT INTO audit (school_id, user_id, action, detail) VALUES ($1,$2,$3,$4::jsonb)', [ctx.school.id, ctx.user.id, action, JSON.stringify(detail || {})]); }
async function session(user) {
  const t = H.token();
  await q(`INSERT INTO sessions (token_hash, user_id, expires) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`, [H.sha(t), user.id]);
  await q('DELETE FROM sessions WHERE expires < now()', []);
  return t;
}
async function currentTerm(schoolId) {
  return (await one('SELECT * FROM terms WHERE school_id=$1 AND is_current', [schoolId])) || (await one('SELECT * FROM terms WHERE school_id=$1 ORDER BY id DESC LIMIT 1', [schoolId]));
}
async function termOf(ctx, id) {
  const t = await one('SELECT * FROM terms WHERE id=$1 AND school_id=$2', [int(id), ctx.school.id]);
  if (!t) throw new Fail(404, 'term');
  return t;
}
const termOut = t => t && ({ id: t.id, name: t.name, year: t.year, titleAr: t.title_ar || '', current: t.is_current, locked: t.locked });
function cleanSettings(b, old) {
  const s = Object.assign({}, old);
  for (const k of ['schoolName', 'curriculum', 'footer']) if (b[k] != null) s[k] = str(b[k], 200);
  if (b.watermark != null) s.watermark = !!b.watermark;
  if (b.departments) for (const k of STAGES) if (b.departments[k] != null) s.departments[k] = str(b.departments[k], 120);
  if (Array.isArray(b.bands)) {
    const bands = b.bands.slice(0, 12).map(x => ({ g: str(x.g, 4), from: Math.max(0, Math.min(100, Number(x.from) || 0)), label: str(x.label, 40) })).filter(x => x.g);
    bands.sort((a, c) => c.from - a.from);
    if (!bands.length || bands[bands.length - 1].from !== 0) throw bad('bands', 'The lowest grade must start at 0%');
    s.bands = bands;
  }
  if (['band', 'min'].includes(b.failRule)) s.failRule = b.failRule;
  if (['none', 'one', 'whole'].includes(b.rounding)) s.rounding = b.rounding;
  if (['zero', 'exclude'].includes(b.absRule)) s.absRule = b.absRule;
  if (b.checkComments != null) s.checkComments = !!b.checkComments;
  if (b.checkDuplicates != null) s.checkDuplicates = !!b.checkDuplicates;
  if (b.ar && typeof b.ar === 'object') {
    const a = Object.assign({}, s.ar), x = b.ar;
    if (Array.isArray(x.lines)) a.lines = [str(x.lines[0], 160), str(x.lines[1], 160)];
    if (x.stages) { a.stages = Object.assign({}, a.stages); for (const k of STAGES) if (x.stages[k] != null) a.stages[k] = str(x.stages[k], 40); }
    if (Array.isArray(x.bands)) {
      const bands = x.bands.slice(0, 10).map(y => ({ from: Math.max(0, Math.min(100, Number(y.from) || 0)), label: str(y.label, 30) })).filter(y => y.label);
      bands.sort((p, c) => c.from - p.from);
      if (!bands.length || bands[bands.length - 1].from !== 0) throw bad('bands', 'The lowest grade must start at 0%');
      a.bands = bands;
    }
    if (Array.isArray(x.signs)) a.signs = x.signs.slice(0, 4).map(y => str(y, 40)).filter(Boolean);
    if (/^#[0-9a-fA-F]{6}$/.test(x.color || '')) a.color = x.color;
    if (x.basmala != null) a.basmala = !!x.basmala;
    s.ar = a;
  }
  if (Array.isArray(b.commentBank)) s.commentBank = b.commentBank.slice(0, 200).map(x => str(x, 400)).filter(Boolean);
  return s;
}

// ---------- signing in ----------
const PUBLIC = {
  async register(b) {
    const name = str(b.schoolName, 120), admin = str(b.adminName, 80), username = str(b.username, 40).toLowerCase(), pw = String(b.password || '');
    if (!name || !admin) throw bad('required');
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw bad('username');
    if (pw.length < 8) throw bad('password');
    let school = null;
    for (let i = 0; i < 6 && !school; i++) {
      try { school = await one(`INSERT INTO schools (code, name, settings, trial_ends) VALUES ($1, $2, $3::jsonb, now() + interval '${TRIAL_DAYS} days') RETURNING *`, [H.code(6), name, JSON.stringify({ schoolName: name.toUpperCase() })]); }
      catch (e) { if (!/duplicate|unique/i.test(e.message)) throw e; }
    }
    const user = await one(`INSERT INTO users (school_id, username, name, role, pass_hash) VALUES ($1,$2,$3,'admin',$4) RETURNING *`, [school.id, username, admin, H.hashPassword(pw)]);
    const y = new Date().getFullYear(), m = new Date().getMonth();
    const year = m >= 7 ? y + ' - ' + (y + 1) : (y - 1) + ' - ' + y;
    await q(`INSERT INTO terms (school_id, name, year, is_current) VALUES ($1, 'FIRST TERM', $2, true)`, [school.id, year]);
    return { token: await session(user), schoolCode: school.code };
  },
  async login(b) {
    const codeIn = str(b.code, 12).toUpperCase(), username = str(b.username, 40).toLowerCase(), key = codeIn + '/' + username;
    const fails = await one(`SELECT count(*)::int AS n FROM login_fails WHERE key=$1 AND at > now() - interval '15 minutes'`, [key]);
    if (fails.n >= 8) throw new Fail(429, 'too_many');
    const u = await one(`SELECT u.* FROM users u JOIN schools s ON s.id=u.school_id WHERE s.code=$1 AND u.username=$2 AND u.active`, [codeIn, username]);
    if (!u || !H.checkPassword(String(b.password || ''), u.pass_hash)) {
      await q('INSERT INTO login_fails (key) VALUES ($1)', [key]);
      await q(`DELETE FROM login_fails WHERE at < now() - interval '1 day'`, []);
      throw new Fail(401, 'login');
    }
    await q('DELETE FROM login_fails WHERE key=$1', [key]);
    return { token: await session(u) };
  },
};

// ---------- signed-in operations ----------
// roles: who may call; write: blocked when the trial is over and there is no licence.
const OPS = {
  me: { roles: ROLES, async run(ctx) {
    const terms = await q('SELECT * FROM terms WHERE school_id=$1 ORDER BY id', [ctx.school.id]);
    return { user: userOut(ctx.user), school: { code: ctx.school.code, name: ctx.school.name, status: status(ctx.school) }, settings: settingsOf(ctx.school),
      logo: ctx.school.logo, terms: terms.map(termOut), term: termOut(await currentTerm(ctx.school.id)) };
  } },
  logout: { roles: ROLES, async run(ctx) { await q('DELETE FROM sessions WHERE token_hash=$1', [ctx.tokenHash]); return { ok: true }; } },
  changePassword: { roles: ROLES, async run(ctx, b) {
    if (!H.checkPassword(String(b.old || ''), ctx.user.pass_hash)) throw new Fail(400, 'old_password');
    if (String(b.password || '').length < 8) throw bad('password');
    await q('UPDATE users SET pass_hash=$1, must_change=false WHERE id=$2', [H.hashPassword(b.password), ctx.user.id]);
    await q('DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2', [ctx.user.id, ctx.tokenHash]);
    return { ok: true };
  } },
  // Everything the caller's screens need for one term. Teachers get only their own subjects and classes.
  data: { roles: ROLES, async run(ctx, b) {
    const t = b.termId ? await termOf(ctx, b.termId) : await currentTerm(ctx.school.id);
    const sid = ctx.school.id, role = ctx.user.role, me = ctx.user.id;
    let classes = await q('SELECT * FROM classes WHERE school_id=$1 ORDER BY sort, id', [sid]);
    let subjects = await q('SELECT * FROM subjects WHERE school_id=$1 ORDER BY sort, id', [sid]);
    if (scoped(ctx.user)) { classes = classes.filter(c => inScope(ctx.user, c)); const ok = new Set(classes.map(c => c.id)); subjects = subjects.filter(s => ok.has(s.class_id)); }
    if (role === 'teacher') {
      const mine = new Set(subjects.filter(s => s.teacher_id === me).map(s => s.class_id));
      classes.filter(c => c.class_teacher_id === me).forEach(c => mine.add(c.id));
      classes = classes.filter(c => mine.has(c.id));
      subjects = subjects.filter(s => mine.has(s.class_id) && (s.teacher_id === me || classes.find(c => c.id === s.class_id && c.class_teacher_id === me)));
    }
    const ids = classes.map(c => c.id);
    const students = ids.length ? await q('SELECT * FROM students WHERE school_id=$1 AND class_id = ANY($2::int[]) ORDER BY class_id, sort, name', [sid, ids]) : [];
    const stIds = students.map(s => s.id), sbIds = subjects.map(s => s.id);
    const marks = t && stIds.length ? await q('SELECT student_id, subject_id, value, abs, grade FROM marks WHERE term_id=$1 AND student_id = ANY($2::int[]) AND subject_id = ANY($3::int[])', [t.id, stIds, sbIds]) : [];
    const ctClasses = new Set(classes.filter(c => c.class_teacher_id === me).map(c => c.id));
    const cmIds = role === 'teacher' ? students.filter(s => ctClasses.has(s.class_id)).map(s => s.id) : stIds;
    const comments = t && cmIds.length ? await q('SELECT student_id, text, returned_note FROM comments WHERE term_id=$1 AND student_id = ANY($2::int[])', [t.id, cmIds]) : [];
    const approvals = t && stIds.length ? await q('SELECT student_id, at FROM approvals WHERE term_id=$1 AND student_id = ANY($2::int[])', [t.id, stIds]) : [];
    const subs = t && sbIds.length ? await q('SELECT subject_id, at FROM submissions WHERE term_id=$1 AND subject_id = ANY($2::int[])', [t.id, sbIds]) : [];
    const users = role === 'admin' && !scoped(ctx.user) ? await q('SELECT * FROM users WHERE school_id=$1 ORDER BY role, name', [sid])
      : await q('SELECT id, name, role, username, active, must_change FROM users WHERE school_id=$1 AND (id = ANY($2::int[]))', [sid, [...new Set([me, ...subjects.map(s => s.teacher_id), ...classes.map(c => c.class_teacher_id)].filter(Boolean))]]);
    const printable = role === 'teacher' ? [] : approvals.map(a => a.student_id);
    return {
      term: termOut(t),
      classes: classes.map(c => ({ id: c.id, name: c.name, stage: c.stage, section: c.section || 'en', classTeacherId: c.class_teacher_id, sort: c.sort })),
      subjects: subjects.map(s => ({ id: s.id, classId: s.class_id, name: s.name, max: +s.max, min: +s.min, counted: s.counted, kind: s.kind || 'mark', teacherId: s.teacher_id, sort: s.sort })),
      students: students.map(s => ({ id: s.id, classId: s.class_id, name: s.name, number: s.number, exempt: s.exempt || [], sort: s.sort })),
      marks: marks.map(m => ({ studentId: m.student_id, subjectId: m.subject_id, value: m.value == null ? null : +m.value, abs: m.abs, grade: m.grade || null })),
      comments: comments.map(c => ({ studentId: c.student_id, text: c.text, returned: c.returned_note })),
      approvals: approvals.map(a => a.student_id), submissions: subs.map(s => s.subject_id), printable,
      users: users.map(userOut),
    };
  } },

  // ----- admin: school, terms, classes, subjects, accounts, students -----
  saveSettings: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const s = cleanSettings(b.settings || {}, settingsOf(ctx.school));
    await q('UPDATE schools SET settings=$1::jsonb WHERE id=$2', [JSON.stringify(s), ctx.school.id]);
    if (b.logo != null) {
      const logo = String(b.logo);
      if (logo && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo) || logo.length > 700000)) throw bad('logo');
      await q('UPDATE schools SET logo=$1 WHERE id=$2', [logo, ctx.school.id]);
    }
    return { settings: s };
  } },
  saveTerm: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const name = str(b.name, 60).toUpperCase(), year = str(b.year, 30), ar = str(b.titleAr, 120);
    if (!name || !year) throw bad('required');
    if (b.id) { await termOf(ctx, b.id); await q('UPDATE terms SET name=$1, year=$2, locked=$3, title_ar=$4 WHERE id=$5', [name, year, !!b.locked, ar, int(b.id)]); return { id: int(b.id) }; }
    const r = await one('INSERT INTO terms (school_id, name, year, title_ar) VALUES ($1,$2,$3,$4) RETURNING id', [ctx.school.id, name, year, ar]);
    return { id: r.id };
  } },
  setCurrentTerm: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.id);
    await q('UPDATE terms SET is_current = (id=$1) WHERE school_id=$2', [t.id, ctx.school.id]);
    return { ok: true };
  } },
  saveClass: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const name = str(b.name, 40), stage = STAGES.includes(b.stage) ? b.stage : null, section = SECTIONS.includes(b.section) ? b.section : 'en';
    if (!name || !stage) throw bad('required');
    const ct = b.classTeacherId ? await one(`SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ('teacher','admin')`, [int(b.classTeacherId), ctx.school.id]) : null;
    if (b.id) {
      const r = await one('UPDATE classes SET name=$1, stage=$2, class_teacher_id=$3, sort=$4, section=$7 WHERE id=$5 AND school_id=$6 RETURNING id', [name, stage, ct && ct.id, int(b.sort), int(b.id), ctx.school.id, section]);
      if (!r) throw new Fail(404, 'class'); return { id: r.id };
    }
    const r = await one('INSERT INTO classes (school_id, name, stage, class_teacher_id, sort, section) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [ctx.school.id, name, stage, ct && ct.id, int(b.sort), section]);
    return { id: r.id };
  } },
  deleteClass: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    await q('DELETE FROM classes WHERE id=$1 AND school_id=$2', [int(b.id), ctx.school.id]); await audit(ctx, 'deleteClass', { id: int(b.id) }); return { ok: true };
  } },
  saveSubject: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const cls = await one('SELECT id FROM classes WHERE id=$1 AND school_id=$2', [int(b.classId), ctx.school.id]);
    if (!cls) throw new Fail(404, 'class');
    const kind = KINDS.includes(b.kind) ? b.kind : 'mark', name = str(b.name, 60);
    let max = num(b.max), min = num(b.min);
    if (kind === 'grade') { max = 1; min = 0; }   // graded by a word: no mark, not in the total
    if (!name || !(max > 0) || !(min >= 0) || min > max) throw bad('subject');
    const t = b.teacherId ? await one(`SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ('teacher','admin')`, [int(b.teacherId), ctx.school.id]) : null;
    const v = [name, max, min, b.counted !== false, t && t.id, int(b.sort), kind];
    if (b.id) {
      const r = await one('UPDATE subjects SET name=$1, max=$2, min=$3, counted=$4, teacher_id=$5, sort=$6, kind=$7 WHERE id=$8 AND school_id=$9 RETURNING id', [...v, int(b.id), ctx.school.id]);
      if (!r) throw new Fail(404, 'subject'); return { id: r.id };
    }
    const r = await one('INSERT INTO subjects (name, max, min, counted, teacher_id, sort, kind, school_id, class_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id', [...v, ctx.school.id, cls.id]);
    return { id: r.id };
  } },
  deleteSubject: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    await q('DELETE FROM subjects WHERE id=$1 AND school_id=$2', [int(b.id), ctx.school.id]); await audit(ctx, 'deleteSubject', { id: int(b.id) }); return { ok: true };
  } },
  copySubjects: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const from = await one('SELECT id FROM classes WHERE id=$1 AND school_id=$2', [int(b.fromId), ctx.school.id]), to = await one('SELECT id FROM classes WHERE id=$1 AND school_id=$2', [int(b.toId), ctx.school.id]);
    if (!from || !to || from.id === to.id) throw new Fail(404, 'class');
    const have = new Set((await q('SELECT lower(name) AS n FROM subjects WHERE class_id=$1', [to.id])).map(r => r.n));
    const src = await q('SELECT * FROM subjects WHERE class_id=$1 ORDER BY sort, id', [from.id]);
    let n = 0;
    for (const s of src) if (!have.has(s.name.toLowerCase())) { await q('INSERT INTO subjects (school_id, class_id, name, max, min, counted, sort, kind) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [ctx.school.id, to.id, s.name, s.max, s.min, s.counted, s.sort, s.kind || 'mark']); n++; }
    return { added: n };
  } },
  saveUser: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const name = str(b.name, 80), username = str(b.username, 40).toLowerCase(), role = ROLES.includes(b.role) ? b.role : null;
    if (!name || !role) throw bad('required');
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw bad('username');
    try {
      if (b.id) {
        const id = int(b.id);
        const scope = normScope(role, b.scope);
        if (id === ctx.user.id && (role !== 'admin' || b.active === false || scope.section)) throw bad('self');
        const r = await one('UPDATE users SET name=$1, username=$2, role=$3, active=$4, scope=$7::jsonb WHERE id=$5 AND school_id=$6 RETURNING *', [name, username, role, b.active !== false, id, ctx.school.id, JSON.stringify(scope)]);
        if (!r) throw new Fail(404, 'user');
        if (b.active === false) await q('DELETE FROM sessions WHERE user_id=$1', [id]);
        return { user: userOut(r) };
      }
      const pw = H.code(8);
      const r = await one('INSERT INTO users (school_id, username, name, role, pass_hash, must_change, scope) VALUES ($1,$2,$3,$4,$5,true,$6::jsonb) RETURNING *', [ctx.school.id, username, name, role, H.hashPassword(pw), JSON.stringify(normScope(role, b.scope))]);
      return { user: userOut(r), password: pw };
    } catch (e) { if (/duplicate|unique/i.test(e.message)) throw new Fail(409, 'username_taken'); throw e; }
  } },
  resetPassword: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const pw = H.code(8);
    const r = await one('UPDATE users SET pass_hash=$1, must_change=true WHERE id=$2 AND school_id=$3 RETURNING id', [H.hashPassword(pw), int(b.id), ctx.school.id]);
    if (!r) throw new Fail(404, 'user');
    await q('DELETE FROM sessions WHERE user_id=$1', [r.id]);
    return { password: pw };
  } },
  saveStudent: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const cls = await one('SELECT id FROM classes WHERE id=$1 AND school_id=$2', [int(b.classId), ctx.school.id]);
    if (!cls) throw new Fail(404, 'class');
    const name = str(b.name, 120); if (!name) throw bad('required');
    const exempt = (Array.isArray(b.exempt) ? b.exempt : []).map(int).filter(Boolean);
    if (b.id) {
      const r = await one('UPDATE students SET name=$1, number=$2, exempt=$3::jsonb, class_id=$4, sort=$5 WHERE id=$6 AND school_id=$7 RETURNING id', [name, str(b.number, 30), JSON.stringify(exempt), cls.id, int(b.sort), int(b.id), ctx.school.id]);
      if (!r) throw new Fail(404, 'student'); return { id: r.id };
    }
    const r = await one('INSERT INTO students (school_id, class_id, name, number, exempt, sort) VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING id', [ctx.school.id, cls.id, name, str(b.number, 30), JSON.stringify(exempt), int(b.sort)]);
    return { id: r.id };
  } },
  deleteStudent: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    await q('DELETE FROM students WHERE id=$1 AND school_id=$2', [int(b.id), ctx.school.id]); await audit(ctx, 'deleteStudent', { id: int(b.id) }); return { ok: true };
  } },
  // Rows already checked on the device; checked again here. Nothing is written if any row is wrong.
  importStudents: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, 3000) : [];
    const classes = await q('SELECT id, name FROM classes WHERE school_id=$1', [ctx.school.id]);
    const subjects = await q('SELECT id, class_id, name FROM subjects WHERE school_id=$1', [ctx.school.id]);
    const byName = new Map(classes.map(c => [c.name.trim().toLowerCase(), c.id]));
    const errors = [], ready = [];
    rows.forEach((r, i) => {
      const name = str(r.name, 120), cid = byName.get(str(r.className, 40).toLowerCase());
      if (!name) return errors.push({ row: r.row || i + 2, code: 'name' });
      if (!cid) return errors.push({ row: r.row || i + 2, code: 'class', value: str(r.className, 40) });
      const ex = [];
      for (const sn of (Array.isArray(r.exempt) ? r.exempt : [])) {
        const s = subjects.find(x => x.class_id === cid && x.name.toLowerCase() === str(sn, 60).toLowerCase());
        if (!s) return errors.push({ row: r.row || i + 2, code: 'subject', value: str(sn, 60) });
        ex.push(s.id);
      }
      ready.push([cid, name, str(r.number, 30), JSON.stringify(ex)]);
    });
    if (errors.length) return { added: 0, errors };
    for (const [cid, name, number, ex] of ready) await q('INSERT INTO students (school_id, class_id, name, number, exempt) VALUES ($1,$2,$3,$4,$5::jsonb)', [ctx.school.id, cid, name, number, ex]);
    await audit(ctx, 'importStudents', { added: ready.length });
    return { added: ready.length, errors: [] };
  } },

  // ----- Ooz School Suite: the .oozschool file shared with Ooz Timetable Studio and Ooz School Manager (2.6) -----
  // The device builds and reads the file; the server hands over the school's rows and applies a reviewed list of changes.
  suiteExport: { roles: ['admin'], sys: true, async run(ctx, b) {
    const sid = ctx.school.id, st = settingsOf(ctx.school), t = await currentTerm(sid);
    const classes = await q('SELECT id, name, stage, section, uid, sort FROM classes WHERE school_id=$1 ORDER BY sort, id', [sid]);
    const subjects = await q('SELECT id, class_id, name, max, kind, teacher_id, uid, sort FROM subjects WHERE school_id=$1 ORDER BY sort, id', [sid]);
    const used = new Set(subjects.map(s => s.teacher_id).filter(Boolean));
    const users = (await q('SELECT id, name, role, uid, active FROM users WHERE school_id=$1 ORDER BY name', [sid])).filter(u => u.role === 'teacher' || used.has(u.id));
    const students = await q('SELECT id, class_id, name, number, uid FROM students WHERE school_id=$1 ORDER BY class_id, sort, name', [sid]);
    let terms = [], marks = [];
    if (b.results) {
      terms = await q('SELECT id, name, title_ar, year FROM terms WHERE school_id=$1 ORDER BY id', [sid]);
      marks = await q('SELECT m.term_id, m.student_id, m.subject_id, m.value, m.abs, m.grade FROM marks m JOIN students s ON s.id=m.student_id WHERE s.school_id=$1', [sid]);
    }
    return {
      school: { name: st.schoolName || ctx.school.name, logo: ctx.school.logo || '', year: t ? t.year : '' },
      classes: classes.map(c => ({ id: c.id, name: c.name, stage: c.stage, section: c.section || 'en', uid: c.uid })),
      subjects: subjects.map(s => ({ id: s.id, classId: s.class_id, name: s.name, max: +s.max, kind: s.kind || 'mark', teacherId: s.teacher_id, uid: s.uid })),
      teachers: users.map(u => ({ id: u.id, name: u.name, uid: u.uid, active: u.active })),
      students: students.map(s => ({ id: s.id, classId: s.class_id, name: s.name, number: s.number, uid: s.uid })),
      terms: terms.map(x => ({ id: x.id, name: x.name, titleAr: x.title_ar, year: x.year })),
      marks: marks.map(m => ({ termId: m.term_id, studentId: m.student_id, subjectId: m.subject_id, value: m.value == null ? null : +m.value, abs: m.abs, grade: m.grade || null })),
    };
  } },
  suiteImport: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const sid = ctx.school.id, arr = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []), uid = v => str(v, 120);
    const undo = { classes: [], subjects: [], users: [], students: [], prev: { classes: [], subjects: [], users: [], students: [] } }, out = { added: 0, updated: 0, accounts: [], defaultMax: 0 };
    const C = b.classes || {}, T = b.teachers || {}, S = b.subjects || {}, P = b.students || {};
    const own = async (table, ids) => { ids = [...new Set(ids.map(int).filter(Boolean))]; if (!ids.length) return new Map(); const r = await q(`SELECT * FROM ${table} WHERE school_id=$1 AND id = ANY($2::int[])`, [sid, ids]); return new Map(r.map(x => [x.id, x])); };
    // classes
    const classRef = new Map(), have = await own('classes', arr(C.update, 2000).map(x => x.id));
    for (const x of arr(C.add, 500)) {
      const name = str(x.name, 40), stage = STAGES.includes(x.stage) ? x.stage : 'primary', section = SECTIONS.includes(x.section) ? x.section : 'en';
      if (!name) continue;
      const r = await one('INSERT INTO classes (school_id, name, stage, section, uid, sort) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [sid, name, stage, section, uid(x.uid), int(x.sort)]);
      classRef.set(String(x.ref), r.id); undo.classes.push(r.id); out.added++;
    }
    for (const x of arr(C.update, 2000)) {
      const old = have.get(int(x.id)); if (!old) continue;
      const name = x.name ? str(x.name, 40) : old.name, id2 = x.uid && !old.uid ? uid(x.uid) : old.uid;
      if (name === old.name && id2 === old.uid) continue;
      undo.prev.classes.push({ id: old.id, name: old.name, uid: old.uid });
      await q('UPDATE classes SET name=$1, uid=$2 WHERE id=$3 AND school_id=$4', [name, id2, old.id, sid]); if (name !== old.name) out.updated++;
    }
    const cls = async ref => { if (ref == null || ref === '') return 0; if (classRef.has(String(ref))) return classRef.get(String(ref)); const r = await one('SELECT id FROM classes WHERE id=$1 AND school_id=$2', [int(ref), sid]); return r ? r.id : 0; };
    // teachers: an account each, with a temporary password to hand over
    const teacherRef = new Map(), taken = new Set((await q('SELECT username FROM users WHERE school_id=$1', [sid])).map(r => r.username));
    let seq = 101; const username = en => { let base = str(en, 40).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 30);
      if (base.length >= 3 && !taken.has(base)) { taken.add(base); return base; }
      if (base.length >= 3) for (let i = 2; i < 100; i++) if (!taken.has(base + i)) { taken.add(base + i); return base + i; }
      while (taken.has('t' + seq)) seq++; taken.add('t' + seq); return 't' + seq; };
    for (const x of arr(T.add, 1000)) {
      const name = str(x.name, 80); if (!name) continue;
      const pw = H.code(8), un = username(x.nameEn);
      const r = await one(`INSERT INTO users (school_id, username, name, role, pass_hash, must_change, uid) VALUES ($1,$2,$3,'teacher',$4,true,$5) RETURNING id`, [sid, un, name, H.hashPassword(pw), uid(x.uid)]);
      teacherRef.set(String(x.ref), r.id); undo.users.push(r.id); out.added++; out.accounts.push({ name, username: un, password: pw });
    }
    const haveU = await own('users', arr(T.update, 2000).map(x => x.id));
    for (const x of arr(T.update, 2000)) {
      const old = haveU.get(int(x.id)); if (!old) continue;
      const name = x.name ? str(x.name, 80) : old.name, id2 = x.uid && !old.uid ? uid(x.uid) : old.uid;
      if (name === old.name && id2 === old.uid) continue;
      undo.prev.users.push({ id: old.id, name: old.name, uid: old.uid });
      await q('UPDATE users SET name=$1, uid=$2 WHERE id=$3 AND school_id=$4', [name, id2, old.id, sid]); if (name !== old.name) out.updated++;
    }
    const tea = async ref => { if (ref == null || ref === '') return null; if (teacherRef.has(String(ref))) return teacherRef.get(String(ref)); const r = await one(`SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ('teacher','admin')`, [int(ref), sid]); return r ? r.id : null; };
    // subjects: one row per class; a new row starts at 100 (pass 50) until the principal sets its full mark
    for (const x of arr(S.add, 5000)) {
      const c = await cls(x.classRef), name = str(x.name, 60); if (!c || !name) continue;
      const dup = await one('SELECT id FROM subjects WHERE class_id=$1 AND lower(name)=lower($2)', [c, name]); if (dup) continue;
      const max = num(x.max) > 0 ? num(x.max) : 100, min = num(x.max) > 0 ? Math.round(num(x.max) / 2 * 100) / 100 : 50;
      const r = await one(`INSERT INTO subjects (school_id, class_id, name, max, min, teacher_id, uid, kind, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,'mark',$8) RETURNING id`, [sid, c, name, max, min, await tea(x.teacherRef), uid(x.uid), int(x.sort)]);
      undo.subjects.push(r.id); out.added++; if (!(num(x.max) > 0)) out.defaultMax++;
    }
    const haveS = await own('subjects', arr(S.update, 5000).map(x => x.id));
    for (const x of arr(S.update, 5000)) {
      const old = haveS.get(int(x.id)); if (!old) continue;
      const name = x.name ? str(x.name, 60) : old.name, id2 = x.uid && !old.uid ? uid(x.uid) : old.uid, t = old.teacher_id || (x.teacherRef != null ? await tea(x.teacherRef) : null);
      if (name === old.name && id2 === old.uid && t === old.teacher_id) continue;
      undo.prev.subjects.push({ id: old.id, name: old.name, uid: old.uid, teacher_id: old.teacher_id });
      await q('UPDATE subjects SET name=$1, uid=$2, teacher_id=$3 WHERE id=$4 AND school_id=$5', [name, id2, t, old.id, sid]); if (name !== old.name || t !== old.teacher_id) out.updated++;
    }
    // students, in one statement for the new ones
    const add = { c: [], n: [], no: [], u: [] };
    for (const x of arr(P.add, 20000)) { const c = await cls(x.classRef), name = str(x.name, 120); if (!c || !name) continue; add.c.push(c); add.n.push(name); add.no.push(str(x.number, 30)); add.u.push(uid(x.uid)); }
    if (add.c.length) { const r = await q('INSERT INTO students (school_id, class_id, name, number, uid) SELECT $1, * FROM unnest($2::int[], $3::text[], $4::text[], $5::text[]) RETURNING id', [sid, add.c, add.n, add.no, add.u]); r.forEach(x => undo.students.push(x.id)); out.added += r.length; }
    const haveP = await own('students', arr(P.update, 20000).map(x => x.id)), upd = { id: [], c: [], n: [], no: [], u: [] };
    for (const x of arr(P.update, 20000)) {
      const old = haveP.get(int(x.id)); if (!old) continue;
      const c = x.classRef != null && x.classRef !== '' ? (await cls(x.classRef)) || old.class_id : old.class_id, name = x.name ? str(x.name, 120) : old.name, no = x.number ? str(x.number, 30) : old.number, id2 = x.uid && !old.uid ? uid(x.uid) : old.uid;
      if (c === old.class_id && name === old.name && no === old.number && id2 === old.uid) continue;
      undo.prev.students.push({ id: old.id, class_id: old.class_id, name: old.name, number: old.number, uid: old.uid });
      upd.id.push(old.id); upd.c.push(c); upd.n.push(name); upd.no.push(no); upd.u.push(id2); if (c !== old.class_id || name !== old.name || no !== old.number) out.updated++;
    }
    if (upd.id.length) await q('UPDATE students s SET class_id=x.c, name=x.n, number=x.no, uid=x.u FROM unnest($1::int[], $2::int[], $3::text[], $4::text[], $5::text[]) AS x(id, c, n, no, u) WHERE s.id=x.id AND s.school_id=$6', [upd.id, upd.c, upd.n, upd.no, upd.u, sid]);
    const r = await one('INSERT INTO suite_imports (school_id, user_id, undo) VALUES ($1,$2,$3::jsonb) RETURNING id', [sid, ctx.user.id, JSON.stringify(undo)]);
    await audit(ctx, 'suiteImport', { id: r.id, added: out.added, updated: out.updated, from: str(b.from, 60) });
    return Object.assign(out, { importId: r.id });
  } },
  // Undo puts back what the import changed and removes what it added, unless marks were entered on it since.
  suiteUndo: { roles: ['admin'], sys: true, write: true, async run(ctx, b) {
    const sid = ctx.school.id, row = await one('SELECT * FROM suite_imports WHERE id=$1 AND school_id=$2 AND NOT undone', [int(b.id), sid]);
    if (!row) throw new Fail(404, 'import');
    const u = row.undo || {}, ids = k => (Array.isArray(u[k]) ? u[k].map(int) : []), prev = k => (u.prev && Array.isArray(u.prev[k]) ? u.prev[k] : []);
    const used = await one('SELECT count(*)::int AS n FROM marks WHERE student_id = ANY($1::int[]) OR subject_id = ANY($2::int[])', [ids('students'), ids('subjects')]);
    if (used && used.n) throw new Fail(409, 'marks_entered');
    for (const p of prev('students')) await q('UPDATE students SET class_id=$1, name=$2, number=$3, uid=$4 WHERE id=$5 AND school_id=$6', [int(p.class_id), p.name, p.number || '', p.uid || '', int(p.id), sid]);
    for (const p of prev('subjects')) await q('UPDATE subjects SET name=$1, uid=$2, teacher_id=$3 WHERE id=$4 AND school_id=$5', [p.name, p.uid || '', p.teacher_id || null, int(p.id), sid]);
    for (const p of prev('users')) await q('UPDATE users SET name=$1, uid=$2 WHERE id=$3 AND school_id=$4', [p.name, p.uid || '', int(p.id), sid]);
    for (const p of prev('classes')) await q('UPDATE classes SET name=$1, uid=$2 WHERE id=$3 AND school_id=$4', [p.name, p.uid || '', int(p.id), sid]);
    if (ids('students').length) await q('DELETE FROM students WHERE school_id=$1 AND id = ANY($2::int[])', [sid, ids('students')]);
    if (ids('subjects').length) await q('DELETE FROM subjects WHERE school_id=$1 AND id = ANY($2::int[])', [sid, ids('subjects')]);
    if (ids('classes').length) await q('DELETE FROM classes WHERE school_id=$1 AND id = ANY($2::int[]) AND NOT EXISTS (SELECT 1 FROM students s WHERE s.class_id=classes.id)', [sid, ids('classes')]);
    if (ids('users').length) await q(`DELETE FROM users WHERE school_id=$1 AND id = ANY($2::int[]) AND role='teacher' AND id<>$3`, [sid, ids('users'), ctx.user.id]);
    await q('UPDATE suite_imports SET undone=true WHERE id=$1', [row.id]); await audit(ctx, 'suiteUndo', { id: row.id });
    return { ok: true };
  } },

  // ----- marks -----
  // Teachers write their own subjects until they send them; after that only the principal changes a mark (and it is logged).
  saveMarks: { roles: ['teacher', 'admin'], write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.termId);
    const sub = await one('SELECT * FROM subjects WHERE id=$1 AND school_id=$2', [int(b.subjectId), ctx.school.id]);
    if (!sub) throw new Fail(404, 'subject');
    const admin = ctx.user.role === 'admin'; if (admin) await scopeClass(ctx, sub.class_id);
    if (!admin) {
      if (sub.teacher_id !== ctx.user.id) throw new Fail(403, 'not_yours');
      if (t.locked) throw new Fail(409, 'term_locked');
      if (await one('SELECT 1 FROM submissions WHERE term_id=$1 AND subject_id=$2', [t.id, sub.id])) throw new Fail(409, 'submitted');
    }
    const studs = new Map((await q('SELECT id, exempt FROM students WHERE class_id=$1', [sub.class_id])).map(s => [s.id, s]));
    const approved = new Set((await q('SELECT student_id FROM approvals WHERE term_id=$1', [t.id])).map(r => r.student_id));
    const entries = (Array.isArray(b.entries) ? b.entries : []).slice(0, 500);
    let n = 0;
    for (const e of entries) {
      const st = studs.get(int(e.studentId)); if (!st) throw bad('student');
      if ((st.exempt || []).includes(sub.id)) continue;
      if (approved.has(st.id) && !admin) throw new Fail(409, 'approved');
      const abs = !!e.abs, word = sub.kind === 'grade';
      const v = abs || word ? null : num(e.value), g = abs || !word ? null : (str(e.grade, 30) || null);
      if (Number.isNaN(v) || (v != null && (v < 0 || v > +sub.max))) throw new Fail(400, 'range', String(e.value));
      const before = admin ? await one('SELECT value, abs, grade FROM marks WHERE term_id=$1 AND student_id=$2 AND subject_id=$3', [t.id, st.id, sub.id]) : null;
      await q(`INSERT INTO marks (term_id, student_id, subject_id, value, abs, grade, updated_by, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now())
        ON CONFLICT (term_id, student_id, subject_id) DO UPDATE SET value=EXCLUDED.value, abs=EXCLUDED.abs, grade=EXCLUDED.grade, updated_by=EXCLUDED.updated_by, updated_at=now()`, [t.id, st.id, sub.id, v, abs, g, ctx.user.id]);
      const was = before ? (before.abs ? 'Abs' : before.grade || (before.value == null ? null : +before.value)) : null;
      if (admin) await audit(ctx, 'mark', { term: t.id, student: st.id, subject: sub.id, from: was, to: abs ? 'Abs' : word ? g : v });
      n++;
    }
    return { saved: n };
  } },
  submitMarks: { roles: ['teacher', 'admin'], write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.termId);
    const sub = await one('SELECT * FROM subjects WHERE id=$1 AND school_id=$2', [int(b.subjectId), ctx.school.id]);
    if (!sub || (ctx.user.role !== 'admin' && sub.teacher_id !== ctx.user.id)) throw new Fail(403, 'not_yours');
    if (ctx.user.role === 'admin') await scopeClass(ctx, sub.class_id);
    const missing = await one(`SELECT count(*)::int AS n FROM students s WHERE s.class_id=$1 AND NOT (s.exempt @> to_jsonb($2::int))
      AND NOT EXISTS (SELECT 1 FROM marks m WHERE m.term_id=$3 AND m.student_id=s.id AND m.subject_id=$2 AND (m.abs OR m.value IS NOT NULL OR m.grade IS NOT NULL))`, [sub.class_id, sub.id, t.id]);
    if (missing.n) throw new Fail(409, 'missing', String(missing.n));
    await q('INSERT INTO submissions (term_id, subject_id, by_user) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [t.id, sub.id, ctx.user.id]);
    return { ok: true };
  } },
  reopenMarks: { roles: ['admin'], write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.termId);
    const sub = await one('SELECT class_id FROM subjects WHERE id=$1 AND school_id=$2', [int(b.subjectId), ctx.school.id]); if (sub) await scopeClass(ctx, sub.class_id);
    await q('DELETE FROM submissions WHERE term_id=$1 AND subject_id IN (SELECT id FROM subjects WHERE id=$2 AND school_id=$3)', [t.id, int(b.subjectId), ctx.school.id]);
    await audit(ctx, 'reopen', { term: t.id, subject: int(b.subjectId) });
    return { ok: true };
  } },

  // ----- comments (class teacher), review and approval (principal) -----
  saveComment: { roles: ['teacher', 'admin'], write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.termId);
    const st = await one('SELECT s.id, c.class_teacher_id FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=$1 AND s.school_id=$2', [int(b.studentId), ctx.school.id]);
    if (!st) throw new Fail(404, 'student');
    if (ctx.user.role === 'admin' && !(await scopeStudents(ctx, [st.id])).length) throw new Fail(403, 'scope');
    if (ctx.user.role !== 'admin') {
      if (st.class_teacher_id !== ctx.user.id) throw new Fail(403, 'not_yours');
      if (t.locked) throw new Fail(409, 'term_locked');
      if (await one('SELECT 1 FROM approvals WHERE term_id=$1 AND student_id=$2', [t.id, st.id])) throw new Fail(409, 'approved');
    }
    await q(`INSERT INTO comments (term_id, student_id, text, returned_note, updated_by) VALUES ($1,$2,$3,'',$4)
      ON CONFLICT (term_id, student_id) DO UPDATE SET text=EXCLUDED.text, returned_note='', updated_by=EXCLUDED.updated_by, updated_at=now()`, [t.id, st.id, str(b.text, 1500), ctx.user.id]);
    return { ok: true };
  } },
  returnComment: { roles: ['admin'], write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.termId);
    const st = await one('SELECT id FROM students WHERE id=$1 AND school_id=$2', [int(b.studentId), ctx.school.id]);
    if (!st || !(await scopeStudents(ctx, [st.id])).length) throw new Fail(404, 'student');
    await q(`INSERT INTO comments (term_id, student_id, text, returned_note) VALUES ($1,$2,'',$3)
      ON CONFLICT (term_id, student_id) DO UPDATE SET returned_note=EXCLUDED.returned_note`, [t.id, st.id, str(b.note, 300) || '-']);
    await q('DELETE FROM approvals WHERE term_id=$1 AND student_id=$2', [t.id, st.id]);
    return { ok: true };
  } },
  approve: { roles: ['admin'], write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.termId);
    const ids = (Array.isArray(b.studentIds) ? b.studentIds : []).map(int).slice(0, 2000);
    const own = await scopeStudents(ctx, ids);
    for (const id of own) await q('INSERT INTO approvals (term_id, student_id, by_user) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [t.id, id, ctx.user.id]);
    await audit(ctx, 'approve', { term: t.id, count: own.length });
    return { approved: own.length };
  } },
  unapprove: { roles: ['admin'], write: true, async run(ctx, b) {
    const t = await termOf(ctx, b.termId);
    const ids = await scopeStudents(ctx, (Array.isArray(b.studentIds) ? b.studentIds : []).map(int));
    await q('DELETE FROM approvals WHERE term_id=$1 AND student_id IN (SELECT id FROM students WHERE school_id=$2 AND id = ANY($3::int[]))', [t.id, ctx.school.id, ids]);
    return { ok: true };
  } },
  auditLog: { roles: ['admin'], sys: true, async run(ctx) {
    const r = await q(`SELECT a.at, a.action, a.detail, u.name FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE a.school_id=$1 ORDER BY a.at DESC LIMIT 200`, [ctx.school.id]);
    return { items: r.map(x => ({ at: x.at, action: x.action, detail: x.detail, by: x.name })) };
  } },
  activate: { roles: ['admin'], sys: true, async run(ctx, b) {
    const r = verifyLicence(ctx.school.code, b.key);
    if (!r) throw new Fail(400, 'licence');
    await q('UPDATE schools SET license_until=$1 WHERE id=$2', [r, ctx.school.id]);
    return { until: r };
  } },
};

// ---------- licences: "<YYYYMMDD>-<10 chars>", signed for one school code with LICENCE_SECRET ----------
const crypto = require('crypto');
function licenceKey(code, ymd) {
  const sig = crypto.createHmac('sha256', process.env.LICENCE_SECRET || '').update(code + '|' + ymd).digest('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
  return ymd + '-' + sig;
}
function verifyLicence(code, key) {
  if (!process.env.LICENCE_SECRET || process.env.LICENCE_SECRET.length < 16) return null;
  const m = /^(\d{8})-([A-Z0-9]{10})$/.exec(String(key || '').trim().toUpperCase());
  if (!m || !H.same(licenceKey(code, m[1]), m[0])) return null;
  const d = new Date(m[1].slice(0, 4) + '-' + m[1].slice(4, 6) + '-' + m[1].slice(6) + 'T23:59:59Z');
  return d.getTime() > Date.now() ? d.toISOString() : null;
}
// Owner tools (Osama): list schools, make a licence key. Header X-Owner-Key = OWNER_KEY.
const OWNER = {
  async schools() {
    const r = await q(`SELECT s.id, s.code, s.name, s.trial_ends, s.license_until, s.created_at,
      (SELECT count(*) FROM users u WHERE u.school_id=s.id)::int AS users, (SELECT count(*) FROM students t WHERE t.school_id=s.id)::int AS students FROM schools s ORDER BY s.id DESC`, []);
    return { schools: r.map(s => ({ code: s.code, name: s.name, created: s.created_at, users: s.users, students: s.students, status: status(s) })) };
  },
  async licence(b) {
    const s = await one('SELECT code FROM schools WHERE code=$1', [str(b.code, 12).toUpperCase()]);
    if (!s) throw new Fail(404, 'school');
    const ymd = String(b.until || '').replace(/-/g, '');
    if (!/^\d{8}$/.test(ymd)) throw bad('date');
    if (!process.env.LICENCE_SECRET || process.env.LICENCE_SECRET.length < 16) throw new Fail(500, 'no_secret');
    return { key: licenceKey(s.code, ymd) };
  },
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return H.send(res, 204, '');
  if (req.method === 'GET') return H.send(res, 200, { app: 'Ooz Marks API', ok: true });
  if (req.method !== 'POST') return H.send(res, 405, { error: 'method' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const op = String(b.op || '');
  try {
    if (Object.prototype.hasOwnProperty.call(PUBLIC, op)) return H.send(res, 200, await PUBLIC[op](b));
    if (op.startsWith('owner.')) {
      if (!process.env.OWNER_KEY || process.env.OWNER_KEY.length < 12 || !H.same(req.headers['x-owner-key'], process.env.OWNER_KEY)) throw new Fail(401, 'owner');
      const fn = OWNER[op.slice(6)]; if (!fn || !Object.prototype.hasOwnProperty.call(OWNER, op.slice(6))) throw new Fail(404, 'op');
      return H.send(res, 200, await fn(b));
    }
    const def = Object.prototype.hasOwnProperty.call(OPS, op) ? OPS[op] : null;
    if (!def) throw new Fail(404, 'op');
    const m = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(String(req.headers.authorization || ''));
    if (!m) throw new Fail(401, 'auth');
    const th = H.sha(m[1]);
    const row = await one(`SELECT u.*, s.id AS sid, s.code, s.name AS sname, s.settings, s.logo, s.trial_ends, s.license_until
      FROM sessions x JOIN users u ON u.id=x.user_id JOIN schools s ON s.id=u.school_id WHERE x.token_hash=$1 AND x.expires > now() AND u.active`, [th]);
    if (!row) throw new Fail(401, 'auth');
    const ctx = { tokenHash: th, user: row, school: { id: row.sid, code: row.code, name: row.sname, settings: row.settings, logo: row.logo, trial_ends: row.trial_ends, license_until: row.license_until } };
    if (!def.roles.includes(row.role) || (def.sys && scoped(row))) throw new Fail(403, 'role');
    if (def.write && status(ctx.school).state === 'expired') throw new Fail(402, 'expired');
    if (row.must_change && !['me', 'logout', 'changePassword'].includes(op)) throw new Fail(403, 'must_change');
    H.send(res, 200, await def.run(ctx, b));
  } catch (e) {
    if (e instanceof Fail) return H.send(res, e.status, { error: e.code, detail: e.message !== e.code ? e.message : undefined });
    console.error(e);
    H.send(res, 500, { error: 'server' });
  }
};
module.exports._licenceKey = licenceKey;
