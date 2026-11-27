/* Ooz Marks — students' results: principal dashboard, teachers' marks, class teachers' comments, review, approval, printing. */
(function () {
'use strict';
const VERSION = '2.6.0';
const API_DEFAULT = 'https://ooz-marks.vercel.app';
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const P = {
  chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', down: '<path d="M12 4v16M6 14l6 6 6-6"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  cls: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>', teach: '<circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  stud: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 6 5"/>',
  marks: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>', rep: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  check: '<path d="M5 12l5 5 9-10"/>', warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>', lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  up: '<path d="M12 20V8M7 13l5-5 5 5M5 4h14"/>', dl: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>', plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  next: '<path d="M9 6l6 6-6 6"/>', prev: '<path d="M15 6l-6 6 6 6"/>', chat: '<path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-6.3A8 8 0 1 1 21 12z"/>',
  pdf: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
};
const ic = (n, c) => '<svg class="i' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>';
const LOGO = s => '<svg role="img" aria-label="Ooz Marks" width="' + s + '" height="' + s + '" viewBox="0 0 200 210"><defs><linearGradient id="lg' + s + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE29A"/><stop offset=".45" stop-color="#E8A93A"/><stop offset="1" stop-color="#9A6A16"/></linearGradient><linearGradient id="ld' + s + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#55524D"/><stop offset=".55" stop-color="#2F2D2A"/><stop offset="1" stop-color="#141311"/></linearGradient></defs><circle cx="96" cy="111" r="68" fill="none" stroke="#7A5310" stroke-width="34"/><circle cx="96" cy="104" r="68" fill="none" stroke="url(#lg' + s + ')" stroke-width="34"/><path d="M44 70 A62 62 0 0 1 118 40" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="6" stroke-linecap="round"/><path d="M70 110 L98 138 L170 52" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 104 L98 132 L170 46" fill="none" stroke="url(#ld' + s + ')" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- state ---------- */
const D = window.D = { version: VERSION, cfg: { api: API_DEFAULT, token: '', code: '', lang: 'ar', theme: 'light', user: '' }, me: null, data: null, view: { name: '', params: {} }, stack: [] };
try { Object.assign(D.cfg, JSON.parse(localStorage.getItem('ooz-marks') || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem('ooz-marks', JSON.stringify(D.cfg)); } catch (e) {} };
/* Opened in a browser from the server's own address (any phone or computer, no app): the API is this same site.
   A school's link carries its code (…/?s=ABC234), so only the user name and password remain to type. */
const WEB = !window.OozNative && !window.OOZ_DEMO && /^https?:$/.test(location.protocol);
if (WEB) D.cfg.api = location.origin;
try { const sc = (new URLSearchParams(location.search).get('s') || '').trim().toUpperCase();
  if (/^[A-Z0-9]{4,12}$/.test(sc)) { if (D.cfg.code && D.cfg.code !== sc) D.cfg.token = ''; D.cfg.code = sc; save(); history.replaceState(null, '', location.pathname); } } catch (e) {}
const webLink = code => D.cfg.api.replace(/\/+$/, '') + '/?s=' + encodeURIComponent(code);
const ar = () => D.cfg.lang === 'ar';
const t = (a, e) => ar() ? a : e;
function applyLook() {
  document.documentElement.lang = D.cfg.lang; document.documentElement.dir = ar() ? 'rtl' : 'ltr';
  document.documentElement.dataset.theme = D.cfg.theme; N.appearance(D.cfg.theme === 'dark');
  document.documentElement.dataset.motion = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'off' : 'on';
}
const ERR = {
  login: ['رمز المدرسة أو اسم الدخول أو كلمة المرور غير صحيحة', 'School code, username or password is wrong'], too_many: ['محاولات كثيرة. انتظر 15 دقيقة', 'Too many attempts. Wait 15 minutes'],
  username: ['اسم الدخول: 3 أحرف إنجليزية صغيرة أو أرقام على الأقل', 'Username: at least 3 lowercase letters or digits'], password: ['كلمة المرور 8 أحرف على الأقل', 'Password must be at least 8 characters'],
  required: ['أكمل الحقول المطلوبة', 'Fill in the required fields'], username_taken: ['اسم الدخول مستخدم', 'That username is taken'], old_password: ['كلمة المرور الحالية غير صحيحة', 'Current password is wrong'],
  expired: ['انتهت التجربة: النظام للعرض فقط حتى التفعيل', 'Trial ended: view only until activated'], submitted: ['أرسلت هذه الدرجات. التعديل الآن عند المدير', 'These marks were sent. Only the principal can change them now'],
  approved: ['اعتمد المدير هذه النتيجة', 'The principal approved this result'], term_locked: ['هذا الفصل الدراسي مقفل', 'This term is locked'], not_yours: ['هذه ليست من موادك أو فصلك', 'Not your subject or class'],
  range: ['درجة خارج المدى', 'Mark out of range'], missing: ['أكمل درجات كل الطلاب أولاً', 'Enter every student’s mark first'], licence: ['رمز التفعيل غير صحيح أو منتهٍ', 'Activation key is wrong or expired'],
  bands: ['أقل تقدير يجب أن يبدأ من 0%', 'The lowest grade must start at 0%'], logo: ['صورة الشعار غير صالحة', 'Logo image is not valid'], subject: ['راجع المادة: الاسم والدرجة النهائية والحد الأدنى', 'Check the subject: name, max and min'],
  self: ['لا يمكنك تعطيل حسابك أو تغيير دوره', 'You cannot disable your own account or change its role'], owner: ['مفتاح المالك غير صحيح', 'Owner key is wrong'], role: ['ليس من صلاحياتك', 'Not allowed for your account'],
  network: ['تعذّر الاتصال بالخادم. تأكد من الإنترنت', 'Cannot reach the server. Check the internet'], server: ['خطأ في الخادم، حاول بعد قليل', 'Server error, try again shortly'],
};
const errText = e => { const k = e && (e.code || e.message); const m = ERR[k]; if (m) return t(m[0], m[1]) + (k === 'missing' && e.detail ? ' (' + e.detail + ')' : ''); return String(k || t('حدث خطأ', 'Something went wrong')); };
let toastT;
const toast = (m, err) => { $$('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.setAttribute('role', 'status'); d.textContent = m; document.body.appendChild(d); clearTimeout(toastT); toastT = setTimeout(() => d.remove(), err ? 4500 : 2600); };
const busy = on => { let b = $('.busy'); if (on && !b) { b = document.createElement('div'); b.className = 'busy'; b.innerHTML = '<i></i>'; document.body.appendChild(b); } else if (!on && b) b.remove(); };
async function api(op, body) {
  let r;
  if (window.OOZ_DEMO) {   // the demo: the server code runs inside the app
    const demo = await window.OOZ_DEMO, x = await demo.call(Object.assign({ op }, body || {}, { __owner: undefined }), D.cfg.token, body && body.__owner);
    r = { status: x.status, ok: x.status < 400, json: async () => x.body || {} };
  } else try { r = await fetch(D.cfg.api.replace(/\/+$/, '') + '/api', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, D.cfg.token ? { Authorization: 'Bearer ' + D.cfg.token } : {}, body && body.__owner ? { 'X-Owner-Key': body.__owner } : {}), body: JSON.stringify(Object.assign({ op }, body || {}, { __owner: undefined })) }); }
  catch (e) { throw Object.assign(new Error('network'), { code: 'network' }); }
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && j.error === 'auth') { D.cfg.token = ''; save(); D.me = null; showAuth(); throw Object.assign(new Error('auth'), { code: 'auth', silent: true }); }
  if (r.status === 403 && j.error === 'must_change') { D.me && (D.me.user.mustChange = true); showPassword(true); throw Object.assign(new Error('must_change'), { code: 'must_change', silent: true }); }
  if (!r.ok) throw Object.assign(new Error(j.error || 'server'), { code: j.error || 'server', detail: j.detail, status: r.status });
  return j;
}
async function run(fn, okMsg) { busy(true); try { const r = await fn(); busy(false); if (okMsg) toast(okMsg); return r; } catch (e) { busy(false); if (!e.silent) toast(errText(e), true); throw e; } }
const quiet = p => p.catch(() => null);

/* ---------- data helpers ---------- */
function index() {
  const d = D.data; if (!d) return;
  d.cls = new Map(d.classes.map(c => [c.id, c])); d.usr = new Map(d.users.map(u => [u.id, u])); d.stu = new Map(d.students.map(s => [s.id, s]));
  d.subsOf = id => d.subjects.filter(s => s.classId === id).sort((a, b) => a.sort - b.sort || a.id - b.id);
  d.studsOf = id => d.students.filter(s => s.classId === id).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  d.mk = new Map(d.marks.map(m => [m.studentId + ':' + m.subjectId, m]));
  d.cm = new Map(d.comments.map(c => [c.studentId, c])); d.ap = new Set(d.approvals); d.sb = new Set(d.submissions); d.pr = new Set(d.printable);
}
async function load(termId) { D.data = await api('data', termId ? { termId } : {}); index(); }
const ST = () => D.me.settings;
const stageName = s => ({ primary: 'Primary', lower: 'Lower Secondary', secondary: 'Secondary' })[s] || s;
const isAr = c => !!c && c.section === 'ar';
const stageOf = c => isAr(c) ? ((ST().ar && ST().ar.stages[c.stage]) || stageName(c.stage)) + ' · ' + t('القسم العربي', 'Arabic section') : stageName(c.stage);
const gradeWords = () => ((ST().ar && ST().ar.bands) || []).map(b => b.label);
const result = st => OozCalc.student(ST(), D.data.subsOf(st.classId), st, D.data.mk, (D.data.cls.get(st.classId) || {}).section);
const entered = (sub) => { const d = D.data; const studs = d.studsOf(sub.classId).filter(s => !(s.exempt || []).includes(sub.id)); const done = studs.filter(s => { const m = d.mk.get(s.id + ':' + sub.id); return m && (m.abs || m.value != null || !!m.grade); }).length; return { done, need: studs.length }; };
function classProgress(c) {
  const d = D.data, subs = d.subsOf(c.id), studs = d.studsOf(c.id);
  let need = 0, done = 0; subs.forEach(s => { const e = entered(s); need += e.need; done += e.done; });
  const cm = studs.filter(s => (d.cm.get(s.id) || {}).text).length, ap = studs.filter(s => d.ap.has(s.id)).length;
  const mp = need ? Math.round(done / need * 100) : 0, cp = isAr(c) ? 100 : studs.length ? Math.round(cm / studs.length * 100) : 0;
  const state = studs.length && ap === studs.length ? 'approved' : mp === 100 && cp === 100 ? 'waiting' : mp === 100 ? 'comments' : 'marks';
  return { mp, cp, ap, n: studs.length, state, need, done };
}
const topGrades = () => ST().bands.filter(b => b.from >= 70).map(b => b.g);
function warningsFor(st) {
  const d = D.data, c = (d.cm.get(st.id) || {}).text || '';
  if (!ST().checkComments && !ST().checkDuplicates) return c.trim() ? [] : [{ type: 'empty' }];
  const r = result(st), mates = d.studsOf(st.classId).filter(x => x.id !== st.id);
  const w = OozCheck.check(c, { rows: r.rows, name: st.name, classNames: mates.map(x => x.name), top: topGrades(), others: ST().checkDuplicates ? mates.map(x => ({ name: x.name, text: (d.cm.get(x.id) || {}).text })) : null, checkDuplicates: ST().checkDuplicates });
  return ST().checkComments ? w : w.filter(x => x.type === 'empty' || x.type === 'duplicate');
}
function warnText(w) {
  switch (w.type) {
    case 'empty': return t('لا يوجد تعليق', 'No comment');
    case 'praise_fail': return t('يمدح ' + w.subject + ' والتقدير ' + w.grade, 'Praises ' + w.subject + ' but the grade is ' + w.grade);
    case 'criticise_top': return t('ينتقد ' + w.subject + ' والتقدير ' + w.grade, 'Criticises ' + w.subject + ' but the grade is ' + w.grade);
    case 'other_name': return t('يذكر اسم طالب آخر: ' + w.name, 'Mentions another student: ' + w.name);
    case 'duplicate': return t('نفس تعليق ' + w.name, 'Same comment as ' + w.name);
  }
  return w.type;
}
function highlight(text, ws) {
  let h = E(text);
  for (const w of ws) { if (w.words) h = h.replace(new RegExp('(' + w.words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '<mark>$1</mark>'); if (w.subject) h = h.replace(new RegExp('\\b(' + OozCheck.names(w.subject).join('|') + ')\\b', 'i'), '<mark>$1</mark>'); if (w.name) h = h.replace(new RegExp('\\b(' + w.name + ')\\b', 'i'), '<mark>$1</mark>'); }
  return h;
}
const nameOf = id => { const u = D.data && D.data.usr.get(id); return u ? u.name : ''; };
const termLabel = tm => tm ? tm.name + ' · ' + tm.year : '';

/* ---------- layout ---------- */
const NAV = {
  admin: [['dash', 'dash', 'لوحة التحكم', 'Dashboard'], ['classes', 'cls', 'الفصول والمواد', 'Classes & subjects'], ['teachers', 'teach', 'المعلمون والحسابات', 'Teachers & accounts'], ['students', 'stud', 'الطلاب', 'Students'],
    ['marks', 'marks', 'الدرجات', 'Marks'], ['review', 'rep', 'المراجعة والاعتماد', 'Review & approve'], ['analysis', 'chart', 'تحليل النتيجة', 'Result analysis'], ['print', 'print', 'الطباعة', 'Printing'], ['settings', 'set', 'الإعدادات', 'Settings']],
  teacher: [['mine', 'cls', 'فصولي', 'My classes'], ['analysis', 'chart', 'التحليل', 'Analysis'], ['comments', 'chat', 'التعليقات', 'Comments'], ['account', 'user', 'حسابي', 'Account']],
  print: [['print', 'print', 'الطباعة', 'Printing'], ['account', 'user', 'حسابي', 'Account']],
};
const PHONE = { admin: ['dash', 'marks', 'review', 'print', 'more'] };
/* Principals: the system principal sees everything; a section or stage principal sees only their classes and does no setup. */
const scopeOf = u => (u && u.role === 'admin' && u.scope && u.scope.section) ? u.scope : null;
const isSys = () => D.me.user.role === 'admin' && !scopeOf(D.me.user);
const SCOPED_TABS = ['dash', 'marks', 'review', 'analysis', 'print'];
const SCOPES = () => { const a = (ST().ar && ST().ar.stages) || {}; return [
  ['', 'مدير النظام (كل الأقسام)', 'System principal (everything)'],
  ['en', 'مدير القسم الإنجليزي', 'English section principal'], ['en:primary', 'Primary Academic Director', 'Primary Academic Director'], ['en:lower,secondary', 'Secondary Academic Director (Lower Secondary + Secondary)', 'Secondary Academic Director (Lower Secondary + Secondary)'],
  ['ar', 'مدير القسم العربي', 'Arabic section principal'], ['ar:primary', 'مدير المرحلة ' + (a.primary || 'الابتدائية'), 'Arabic primary stage principal'], ['ar:lower', 'مدير المرحلة ' + (a.lower || 'المتوسطة'), 'Arabic middle stage principal'], ['ar:secondary', 'مدير المرحلة ' + (a.secondary || 'الثانوية'), 'Arabic secondary stage principal']]; };
const scopeKey = u => { const x = scopeOf(u); return x ? x.section + (x.stages && x.stages.length ? ':' + x.stages.join(',') : '') : ''; };
const scopeLabel = u => { const k = scopeKey(u), f = SCOPES().find(x => x[0] === k); return f ? t(f[1], f[2]) : k; };
const scopeFromKey = k => { if (!k) return {}; const [section, st] = k.split(':'); return { section, stages: st ? st.split(',') : [] }; };
function navItems() { let n = NAV[D.me.user.role] || []; if (scopeOf(D.me.user)) return n.filter(x => SCOPED_TABS.includes(x[0])).concat([['account', 'user', 'حسابي', 'Account']]); if (D.me.user.role === 'teacher' && !D.data.classes.some(c => c.classTeacherId === D.me.user.id && !isAr(c))) n = n.filter(x => x[0] !== 'comments'); return n; }
function go(name, params, push) { if (push !== false && D.view.name) D.stack.push(D.view); D.view = { name, params: params || {} }; render(true); }
async function tab(name) { D.stack = []; D.view = { name, params: {} }; if (D.data && D.data.term) { try { await load(D.data.term.id); } catch (e) { if (e.silent) return; } } render(true); }
D.back = () => { const o = $('.ov'); if (o) { o.remove(); return true; } if (D.stack.length) { D.view = D.stack.pop(); render(true); return true; } return false; };
function shell(title, sub, body, actions) {
  const role = D.me.user.role, items = navItems(), st = D.me.school.status;
  const side = '<aside><div class="brand">' + LOGO(44) + '<b class="ltr">Ooz <span>Marks</span></b></div>' +
    items.map(([k, i, a, e]) => '<button class="nav' + (k === D.view.name || (D.view.name === 'entry' && k === 'mine') ? ' on' : '') + '" data-tab="' + k + '">' + ic(i) + '<span>' + t(a, e) + '</span></button>').join('') +
    (st.state !== 'licensed' || st.daysLeft < 30 ? '<div class="lic">' + ic('key', 's') + ' ' + (st.state === 'expired' ? t('انتهت التجربة', 'Trial ended') : st.state === 'trial' ? t('نسخة تجريبية: باقٍ ' + st.daysLeft + ' يوماً', 'Trial: ' + st.daysLeft + ' days left') : t('الترخيص: باقٍ ' + st.daysLeft + ' يوماً', 'Licence: ' + st.daysLeft + ' days left')) + '<span>' + (st.state === 'expired' ? t('النظام للعرض فقط حتى التفعيل', 'View only until activated') : t('بعدها للعرض فقط حتى الترخيص', 'Then view only until licensed')) + '</span></div>' : '') + '</aside>';
  const ph = role === 'admin' ? PHONE.admin.map(k => k === 'more' ? ['more', 'more', 'المزيد', 'More'] : items.find(x => x[0] === k)) : items;
  const bottom = '<nav class="bottom">' + ph.map(([k, i, a, e]) => '<button data-tab="' + k + '" class="' + (k === D.view.name || (k === 'more' && !PHONE.admin.includes(D.view.name) && role === 'admin') || (D.view.name === 'entry' && k === 'mine') ? 'on' : '') + '">' + ic(i) + '<span>' + t(a, e) + '</span></button>').join('') + '</nav>';
  const terms = D.me.terms || [], cur = D.data.term;
  const top = '<header class="top">' + (D.stack.length ? '<button class="ib" data-back aria-label="' + t('رجوع', 'Back') + '">' + ic('next', 'flip') + '</button>' : '') + '<div class="tt"><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
    (terms.length > 1 && role !== 'teacher' ? '<select class="inp" id="termSel" aria-label="' + t('الفصل الدراسي', 'Term') + '">' + terms.map(x => '<option value="' + x.id + '"' + (cur && x.id === cur.id ? ' selected' : '') + '>' + E(termLabel(x)) + (x.current ? ' ✓' : '') + '</option>').join('') + '</select>' : '<span class="tag dk" style="min-height:32px">' + E(termLabel(cur)) + '</span>') +
    '<button class="ib" data-theme-toggle aria-label="' + t('الوضع الداكن', 'Dark mode') + '">' + ic(D.cfg.theme === 'dark' ? 'sun' : 'moon') + '</button><button class="ib" data-lang aria-label="Language"><b class="en" style="font-size:13px">' + (ar() ? 'EN' : 'ع') + '</b></button>' + (actions || '') + '</header>';
  return side + '<main>' + top + '<div class="content enter">' + body + '</div></main>' + bottom;
}
async function render(anim) {
  if (scopeOf(D.me && D.me.user) && !SCOPED_TABS.concat(['account']).includes(D.view.name)) D.view = { name: 'dash', params: {} };
  if (!D.me) return;
  const s = SCREENS[D.view.name]; if (!s) return tab(navItems()[0][0]);
  const app = $('#app');
  try {
    const out = await s(D.view.params || {});
    app.innerHTML = shell(out.title, out.sub, out.body, out.actions);
    if (!anim) $$('.enter', app).forEach(x => x.classList.remove('enter'));
    bindShell(); if (out.bind) out.bind($('main', app));
  } catch (e) { if (!e.silent) { app.innerHTML = '<main style="flex:1"><div class="content"><div class="empty">' + ic('warn', 'l') + '<b>' + E(errText(e)) + '</b><button class="btn g" id="retry">' + t('إعادة المحاولة', 'Try again') + '</button></div></div></main>'; $('#retry').onclick = () => render(); } }
}
function bindShell() {
  $$('[data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab === 'more') return moreSheet(); tab(b.dataset.tab); });
  $$('[data-back]').forEach(b => b.onclick = () => D.back());
  const th = $('[data-theme-toggle]'); if (th) th.onclick = () => { D.cfg.theme = D.cfg.theme === 'dark' ? 'light' : 'dark'; save(); applyLook(); render(); };
  const lg = $('[data-lang]'); if (lg) lg.onclick = () => { D.cfg.lang = ar() ? 'en' : 'ar'; save(); applyLook(); render(); };
  const ts = $('#termSel'); if (ts) ts.onchange = async () => { await run(() => load(+ts.value)); render(); };
}
function moreSheet() {
  const items = navItems().filter(x => !PHONE.admin.includes(x[0]));
  dialog('<h2>' + t('المزيد', 'More') + '</h2><div class="list">' + items.map(([k, i, a, e]) => '<button class="li" data-go="' + k + '">' + ic(i) + '<span class="mid"><b>' + t(a, e) + '</b></span></button>').join('') + '</div>', (o, close) => $$('[data-go]', o).forEach(b => b.onclick = () => { close(); tab(b.dataset.go); }));
}
function dialog(html, bind) {
  const o = document.createElement('div'); o.className = 'ov'; o.innerHTML = '<div class="dlg" role="dialog" aria-modal="true">' + html + '</div>';
  const close = () => o.remove(); o.addEventListener('click', e => { if (e.target === o) close(); }); document.body.appendChild(o);
  const f = $('input,select,textarea', o); if (f && !f.disabled) setTimeout(() => f.focus(), 60);
  if (bind) bind(o, close); return o;
}
const confirmBox = (msg, yes, danger) => new Promise(res => dialog('<p style="margin:0;font-size:15px;line-height:1.7">' + msg + '</p><div class="acts"><button class="btn g" data-no>' + t('إلغاء', 'Cancel') + '</button><button class="btn' + (danger ? ' d' : '') + '" data-yes>' + (yes || t('تأكيد', 'Confirm')) + '</button></div>', (o, close) => { $('[data-no]', o).onclick = () => { close(); res(false); }; $('[data-yes]', o).onclick = () => { close(); res(true); }; }));
const askText = (title, label, value) => new Promise(res => dialog('<h2>' + title + '</h2><div class="f"><label for="ask">' + label + '</label><textarea id="ask" rows="3">' + E(value || '') + '</textarea></div><div class="acts"><button class="btn g" data-no>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-yes>' + t('حفظ', 'Save') + '</button></div>', (o, close) => { $('[data-no]', o).onclick = () => { close(); res(null); }; $('[data-yes]', o).onclick = () => { const v = $('#ask', o).value.trim(); close(); res(v); }; }));
const classSelect = (id, sel, filter) => '<select class="inp" id="' + id + '" aria-label="' + t('الفصل', 'Class') + '">' + D.data.classes.filter(filter || (() => true)).map(c => '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + E(c.name) + ' · ' + stageOf(c) + '</option>').join('') + '</select>';
const pickClass = p => { const cs = D.data.classes; return cs.find(c => c.id === +p.classId) || cs.find(c => c.id === D.lastClass) || cs[0]; };
const noClasses = () => '<div class="empty">' + ic('cls', 'l') + '<b>' + t('لا توجد فصول بعد', 'No classes yet') + '</b>' + (isSys() ? '<button class="btn" data-goto="classes">' + ic('plus') + t('إضافة فصل', 'Add a class') + '</button>' : '') + '</div>';
document.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) tab(g.dataset.goto); });
const bar = p => '<div class="bar"><i><b style="width:' + p + '%"></b></i><span>' + p + '%</span></div>';
const STATE = { approved: ['ok', 'معتمد', 'Approved'], waiting: ['in', 'بانتظار الاعتماد', 'Awaiting approval'], comments: ['wa', 'التعليقات', 'Comments'], marks: ['wa', 'إدخال الدرجات', 'Entering marks'] };

/* ---------- screens ---------- */
const SCREENS = {};
SCREENS.dash = async () => {
  const d = D.data, teachers = d.users.filter(u => u.role === 'teacher' && u.active);
  let need = 0, done = 0; d.subjects.forEach(s => { const e = entered(s); need += e.need; done += e.done; });
  const prog = d.classes.map(c => [c, classProgress(c)]), appr = prog.filter(x => x[1].state === 'approved' && x[1].n).length;
  const late = []; d.subjects.forEach(s => { if (d.sb.has(s.id)) return; const e = entered(s); if (!e.need) return; late.push({ s, e, teacher: s.teacherId ? nameOf(s.teacherId) : null }); });
  const alerts = [];
  d.subjects.filter(s => !s.teacherId).slice(0, 6).forEach(s => alerts.push(t('بلا معلم: ', 'No teacher: ') + s.name + ' · ' + (d.cls.get(s.classId) || {}).name));
  d.classes.filter(c => !c.classTeacherId).forEach(c => alerts.push(t('بلا مربي فصل: ', 'No class teacher: ') + c.name));
  d.students.forEach(st => { const c = d.cm.get(st.id); if (!c || !c.text) return; warningsFor(st).filter(w => w.type !== 'empty').forEach(w => alerts.push(st.name.split(' ')[0] + ' (' + (d.cls.get(st.classId) || {}).name + '): ' + warnText(w))); });
  const code = D.me.school.code;
  const body = '<div class="kpis">' +
    [[t('الطلاب', 'Students'), d.students.length, d.classes.length + ' ' + t('فصل', 'classes')], [t('المعلمون', 'Teachers'), teachers.length, late.length ? new Set(late.map(x => x.s.teacherId)).size + ' ' + t('لم يكملوا', 'not finished') : t('أكملوا الإرسال', 'all sent')],
      [t('الدرجات المُدخلة', 'Marks entered'), (need ? Math.round(done / need * 100) : 0) + '%', done + ' / ' + need], [t('فصول معتمدة', 'Approved classes'), appr, t('من ', 'of ') + d.classes.length]]
      .map(([a, b, c], i) => '<div class="c kpi"><small>' + a + '</small><b' + (i === 2 ? ' style="color:var(--goldd)"' : i === 3 ? ' style="color:var(--green)"' : '') + '>' + b + '</b><span>' + c + '</span></div>').join('') + '</div>' +
    '<div class="c pad row" style="gap:10px"><span>' + ic('key') + '</span><span class="grow">' + t('رمز المدرسة الذي يكتبه المعلمون عند الدخول:', 'School code teachers enter to sign in:') + '</span><b class="en ltr" style="font-size:22px;letter-spacing:2px;color:var(--goldd)">' + E(code) + '</b><button class="btn g sm" id="cpcode">' + ic('copy', 's') + t('نسخ', 'Copy') + '</button><button class="btn g sm" id="cplink" title="' + t('رابط الدخول من المتصفح', 'Browser sign-in link') + '">' + ic('copy', 's') + t('الرابط', 'Link') + '</button></div>' +
    '<div class="split"><section class="c pad main"><div class="row" style="margin-bottom:6px"><h2 class="grow">' + t('تقدم الفصول', 'Class progress') + '</h2></div>' +
    (d.classes.length ? '<div class="tw"><table><thead><tr><th>' + t('الفصل', 'Class') + '</th><th>' + t('المرحلة', 'Stage') + '</th><th>' + t('الدرجات', 'Marks') + '</th><th>' + t('التعليقات', 'Comments') + '</th><th>' + t('الحالة', 'Status') + '</th></tr></thead><tbody>' +
      prog.map(([c, p]) => '<tr data-cls="' + c.id + '" style="cursor:pointer"><td class="en"><b>' + E(c.name) + '</b></td><td class="mu en">' + stageOf(c) + '</td><td>' + bar(p.mp) + '</td><td>' + bar(p.cp) + '</td><td><span class="tag ' + STATE[p.state][0] + '">' + t(STATE[p.state][1], STATE[p.state][2]) + '</span></td></tr>').join('') + '</tbody></table></div>' : noClasses()) + '</section>' +
    '<div class="side col"><section class="c pad"><h2>' + t('لم يكملوا الإرسال', 'Not sent yet') + '</h2>' + (late.length ? late.slice(0, 10).map(x => '<div class="row" style="padding:9px 0;border-top:1px solid var(--line)"><span class="grow"><b>' + E(x.teacher || t('بلا معلم', 'No teacher')) + '</b><br><small class="mu en">' + E(x.s.name + ' · ' + (d.cls.get(x.s.classId) || {}).name) + '</small></span><b class="en" style="color:var(--red)">' + x.e.done + '/' + x.e.need + '</b></div>').join('') : '<p class="mu">' + t('لا شيء', 'Nothing') + '</p>') + '</section>' +
    '<section class="c pad"><h2>' + t('تنبيهات', 'Alerts') + '</h2>' + (alerts.length ? alerts.slice(0, 12).map(a => '<div class="row" style="padding:9px 0;border-top:1px solid var(--line);flex-wrap:nowrap;align-items:flex-start"><span style="color:var(--red)">' + ic('warn', 's') + '</span><span style="font-size:14px">' + E(a) + '</span></div>').join('') : '<p class="mu">' + t('لا توجد تنبيهات', 'No alerts') + '</p>') + '</section></div></div>';
  return { title: t('لوحة التحكم', 'Dashboard'), sub: E(ST().schoolName) + (scopeOf(D.me.user) ? ' · ' + E(scopeLabel(D.me.user)) : ''), body, bind(m) { $$('[data-cls]', m).forEach(r => r.onclick = () => { D.lastClass = +r.dataset.cls; tab('review'); }); $('#cpcode', m).onclick = async () => { await N.copy(code); toast(t('تم النسخ', 'Copied')); }; $('#cplink', m).onclick = async () => { const l = webLink(code), ok = await N.copy(l); toast(ok === false ? l : t('تم نسخ رابط الدخول من المتصفح', 'Browser sign-in link copied')); }; } };
};

SCREENS.classes = async p => {
  const d = D.data, stage = p.stage || 'all', list = d.classes.filter(c => stage === 'all' || c.stage === stage), c = pickClass(p);
  const subs = c ? d.subsOf(c.id) : [];
  const body = '<div class="split"><section class="c pad side col"><div class="row"><h2 class="grow">' + t('الفصول', 'Classes') + '</h2><button class="btn sm" id="addc">' + ic('plus', 's') + t('فصل', 'Class') + '</button></div>' +
    '<div class="chips">' + [['all', 'الكل', 'All'], ['primary', 'Primary', 'Primary'], ['lower', 'Lower Sec.', 'Lower Sec.'], ['secondary', 'Secondary', 'Secondary']].map(([k, a, e]) => '<button class="chip' + (k === stage ? ' on' : '') + '" data-stage="' + k + '">' + t(a, e) + '</button>').join('') + '</div>' +
    '<div class="list">' + list.map(x => '<button class="li' + (c && x.id === c.id ? ' on' : '') + '" data-c="' + x.id + '"><span class="mid"><b class="en">' + E(x.name) + '</b><small>' + stageOf(x) + ' · ' + d.studsOf(x.id).length + ' ' + t('طالباً', 'students') + ' · ' + d.subsOf(x.id).length + ' ' + t('مواد', 'subjects') + '</small></span>' + ic('next', 'flip s') + '</button>').join('') + '</div></section>' +
    '<section class="c pad main col">' + (c ? '<div class="row"><div class="grow"><h2 class="en" style="font-size:22px">' + E(c.name) + '</h2><span class="mu">' + stageOf(c) + ' · ' + t('مربي الفصل: ', 'Class teacher: ') + '<b style="color:var(--ink)">' + E(nameOf(c.classTeacherId) || '—') + '</b></span></div><button class="btn g" id="edc">' + ic('edit', 's') + t('تعديل الفصل', 'Edit class') + '</button><button class="btn" id="adds">' + ic('plus', 's') + t('إضافة مادة', 'Add subject') + '</button></div>' +
      (subs.length ? '<div class="tw"><table><thead><tr><th>' + t('المادة', 'Subject') + '</th><th>' + t('المعلم', 'Teacher') + '</th><th class="n">' + t('الدرجة النهائية', 'Max') + '</th><th class="n">' + t('الحد الأدنى', 'Min') + '</th><th>' + t('في الشهادة', 'On report') + '</th><th></th></tr></thead><tbody>' +
        subs.map(s => '<tr><td class="en"><b>' + E(s.name) + '</b></td><td>' + (s.teacherId ? E(nameOf(s.teacherId)) : '<span class="tag bad">' + t('بلا معلم', 'No teacher') + '</span>') + '</td><td class="n en">' + s.max + '</td><td class="n en">' + s.min + '</td><td>' + (s.counted ? '<span class="tag ok">' + t('يُحتسب', 'Counted') + '</span>' : '<span class="tag">' + t('لا يظهر', 'Hidden') + '</span>') + '</td><td><button class="ib sm" data-s="' + s.id + '" aria-label="' + t('تعديل', 'Edit') + '">' + ic('edit', 's') + '</button></td></tr>').join('') + '</tbody></table></div>'
        : '<div class="empty">' + t('لا توجد مواد لهذا الفصل', 'No subjects in this class') + '</div>') +
      (d.classes.length > 1 ? '<div class="note">' + ic('copy', 's') + '<span class="grow">' + t('المواد تختلف من فصل لآخر. انسخ مواد فصل آخر ثم عدّل ما يلزم.', 'Subjects differ by class. Copy another class’s subjects, then adjust.') + '</span><button class="btn g sm" id="cps">' + t('نسخ من فصل', 'Copy from class') + '</button></div>' : '')
      : noClasses()) + '</section></div>';
  return { title: t('الفصول والمواد', 'Classes & subjects'), sub: t('لكل فصل مرحلته ومواده ومعلم كل مادة', 'Each class has its stage, subjects and a teacher per subject'), body, bind(m) {
    $$('[data-stage]', m).forEach(b => b.onclick = () => { D.view.params = { stage: b.dataset.stage }; render(); });
    $$('[data-c]', m).forEach(b => b.onclick = () => { D.lastClass = +b.dataset.c; D.view.params = { stage, classId: +b.dataset.c }; render(); });
    $('#addc', m).onclick = () => classDialog(null);
    if (c) { $('#edc', m).onclick = () => classDialog(c); $('#adds', m).onclick = () => subjectDialog(c, null); $$('[data-s]', m).forEach(b => b.onclick = () => subjectDialog(c, d.subjects.find(s => s.id === +b.dataset.s)));
      const cp = $('#cps', m); if (cp) cp.onclick = () => dialog('<h2>' + t('نسخ المواد إلى ', 'Copy subjects to ') + E(c.name) + '</h2><div class="f"><label for="from">' + t('من فصل', 'From class') + '</label>' + classSelect('from', null, x => x.id !== c.id).replace('class="inp"', 'class="inp" style="width:100%"') + '</div><p class="mu" style="margin:0">' + t('تُنسخ المواد غير الموجودة فقط، بدون المعلمين.', 'Only missing subjects are copied, without teachers.') + '</p><div class="acts"><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('نسخ', 'Copy') + '</button></div>', (o, close) => {
        $('[data-x]', o).onclick = close; $('[data-ok]', o).onclick = async () => { const r = await run(() => api('copySubjects', { fromId: +$('#from', o).value, toId: c.id })); close(); toast(t('أُضيفت ' + r.added + ' مواد', r.added + ' subjects added')); await load(D.data.term.id); render(); }; }); }
  } };
};
const teacherOptions = sel => '<option value="">' + t('— بلا —', '— none —') + '</option>' + D.data.users.filter(u => (u.role === 'teacher' || u.role === 'admin') && u.active).map(u => '<option value="' + u.id + '"' + (u.id === sel ? ' selected' : '') + '>' + E(u.name) + '</option>').join('');
function classDialog(c) {
  dialog('<h2>' + (c ? t('تعديل الفصل', 'Edit class') : t('فصل جديد', 'New class')) + '</h2>' +
    '<div class="f"><span class="lb">' + t('القسم (شكل الشهادة)', 'Section (report layout)') + '</span><div class="chips">' + [['en', 'الإنجليزي', 'English'], ['ar', 'العربي', 'Arabic']].map(([k, a, e]) => '<button class="chip' + ((c ? c.section || 'en' : 'en') === k ? ' on' : '') + '" data-sec="' + k + '">' + t(a, e) + '</button>').join('') + '</div></div>' +
    '<div class="f"><label for="cn">' + t('اسم الفصل (كما في الشهادة)', 'Class name (as on the report)') + '</label><input id="cn" dir="auto" maxlength="40" placeholder="Grade 7" value="' + E(c ? c.name : '') + '"></div>' +
    '<div class="f"><span class="lb">' + t('المرحلة', 'Stage') + '</span><div class="chips" id="stg">' + ['primary', 'lower', 'secondary'].map(k => '<button class="chip' + ((c ? c.stage : 'primary') === k ? ' on' : '') + '" data-k="' + k + '"><span class="se">' + stageName(k) + '</span><span class="sa">' + E(ST().ar.stages[k]) + '</span></button>').join('') + '</div></div>' +
    '<div class="f"><label for="ct" id="ctl">' + t('مربي الفصل (يكتب التعليقات)', 'Class teacher (writes the comments)') + '</label><select id="ct">' + teacherOptions(c && c.classTeacherId) + '</select></div>' +
    '<div class="f"><label for="cs">' + t('الترتيب', 'Order') + '</label><input id="cs" type="number" value="' + (c ? c.sort : D.data.classes.length + 1) + '"></div>' +
    '<div class="acts">' + (c ? '<button class="btn d" data-del>' + ic('trash', 's') + t('حذف', 'Delete') + '</button>' : '') + '<span class="grow"></span><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>', (o, close) => {
    let stage = c ? c.stage : 'primary', section = c ? c.section || 'en' : 'en';
    const sec = () => { $$('[data-sec]', o).forEach(x => x.classList.toggle('on', x.dataset.sec === section)); $$('.se', o).forEach(x => x.hidden = section === 'ar'); $$('.sa', o).forEach(x => x.hidden = section !== 'ar'); $('#cn', o).placeholder = section === 'ar' ? 'الخامس' : 'Grade 7'; $('#ctl', o).textContent = section === 'ar' ? t('مشرف الصف', 'Class supervisor') : t('مربي الفصل (يكتب التعليقات)', 'Class teacher (writes the comments)'); };
    $$('[data-sec]', o).forEach(b => b.onclick = () => { section = b.dataset.sec; sec(); }); sec();
    $$('[data-k]', o).forEach(b => b.onclick = () => { stage = b.dataset.k; $$('[data-k]', o).forEach(x => x.classList.toggle('on', x === b)); });
    $('[data-x]', o).onclick = close;
    $('[data-ok]', o).onclick = async () => { const r = await run(() => api('saveClass', { id: c && c.id, name: $('#cn', o).value, stage, section, classTeacherId: +$('#ct', o).value || null, sort: +$('#cs', o).value })); close(); D.lastClass = r.id; await load(D.data.term.id); D.view.params = { classId: r.id }; render(); };
    const del = $('[data-del]', o); if (del) del.onclick = async () => { close(); if (!(await confirmBox(t('حذف «' + E(c.name) + '» بطلابه ومواده ودرجاته؟ لا يمكن التراجع.', 'Delete “' + E(c.name) + '” with its students, subjects and marks? This cannot be undone.'), t('حذف', 'Delete'), true))) return; await run(() => api('deleteClass', { id: c.id })); await load(D.data.term.id); D.view.params = {}; render(); };
  });
}
function subjectDialog(c, s) {
  let kind = s ? s.kind || 'mark' : 'mark';
  dialog('<h2>' + (s ? t('تعديل المادة', 'Edit subject') : t('مادة جديدة · ', 'New subject · ') + E(c.name)) + '</h2>' +
    '<div class="f"><label for="sn">' + t('اسم المادة (كما في الشهادة)', 'Subject (as on the report)') + '</label><input id="sn" dir="auto" maxlength="60" placeholder="' + (isAr(c) ? 'الرياضيات' : 'Math') + '" value="' + E(s ? s.name : '') + '"></div>' +
    '<div class="f"><span class="lb">' + t('طريقة التقييم', 'Assessed by') + '</span><div class="chips">' + [['mark', 'درجة', 'A mark'], ['grade', 'تقدير (ممتاز، جيد…)', 'A grade word']].map(([k, a, e]) => '<button class="chip' + ((s ? s.kind || 'mark' : 'mark') === k ? ' on' : '') + '" data-kind="' + k + '">' + t(a, e) + '</button>').join('') + '</div></div>' +
    '<div class="grid2" id="mx"><div class="f"><label for="sx">' + t(isAr(c) ? 'الدرجة الكاملة' : 'الدرجة النهائية', 'Max. marks') + '</label><input id="sx" type="number" inputmode="decimal" value="' + (s ? s.max : 50) + '"></div><div class="f"><label for="sm">' + t(isAr(c) ? 'درجة النجاح' : 'الحد الأدنى', isAr(c) ? 'Pass mark' : 'Min. marks') + '</label><input id="sm" type="number" inputmode="decimal" value="' + (s ? s.min : 25) + '"></div></div>' +
    '<p class="mu" id="gnote" style="margin:0;font-size:13px">' + t('تُختار له كلمة التقدير ولا يدخل في المجموع.', 'Given a grade word; not counted in the total.') + '</p>' +
    '<div class="f"><label for="st">' + t('المعلم', 'Teacher') + '</label><select id="st">' + teacherOptions(s && s.teacherId) + '</select></div>' +
    '<label class="check"><input type="checkbox" id="sc"' + (!s || s.counted ? ' checked' : '') + '><span>' + t('تظهر في الشهادة وتُحسب في المجموع', 'Shown on the report and counted in the total') + '</span></label>' +
    '<div class="f"><label for="so">' + t('الترتيب', 'Order') + '</label><input id="so" type="number" value="' + (s ? s.sort : D.data.subsOf(c.id).length + 1) + '"></div>' +
    '<div class="acts">' + (s ? '<button class="btn d" data-del>' + ic('trash', 's') + t('حذف', 'Delete') + '</button>' : '') + '<span class="grow"></span><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>', (o, close) => {
    $('[data-x]', o).onclick = close;
    const kd = () => { $$('[data-kind]', o).forEach(x => x.classList.toggle('on', x.dataset.kind === kind)); $('#mx', o).hidden = kind === 'grade'; $('#gnote', o).hidden = kind !== 'grade'; };
    $$('[data-kind]', o).forEach(b => b.onclick = () => { kind = b.dataset.kind; kd(); }); kd();
    // the pass mark follows half the full mark until it is typed
    let touched = !!s; $('#sm', o).oninput = () => { touched = true; }; $('#sx', o).oninput = () => { if (!touched) $('#sm', o).value = Math.round(+$('#sx', o).value / 2 * 2) / 2 || ''; };
    $('[data-ok]', o).onclick = async () => { await run(() => api('saveSubject', { id: s && s.id, classId: c.id, kind, name: $('#sn', o).value, max: $('#sx', o).value, min: $('#sm', o).value, teacherId: +$('#st', o).value || null, counted: $('#sc', o).checked, sort: +$('#so', o).value })); close(); await load(D.data.term.id); render(); };
    const del = $('[data-del]', o); if (del) del.onclick = async () => { close(); if (!(await confirmBox(t('حذف مادة «' + E(s.name) + '» ودرجاتها؟', 'Delete “' + E(s.name) + '” and its marks?'), t('حذف', 'Delete'), true))) return; await run(() => api('deleteSubject', { id: s.id })); await load(D.data.term.id); render(); };
  });
}

SCREENS.teachers = async p => {
  const d = D.data, q = (p.q || '').toLowerCase();
  const users = d.users.filter(u => !q || (u.name + ' ' + u.username).toLowerCase().includes(q));
  const roleName = (r, u) => r === 'admin' && u && scopeOf(u) ? E(scopeLabel(u)) : ({ admin: t('مدير', 'Principal'), teacher: t('معلم', 'Teacher'), print: t('طباعة', 'Printing') })[r];
  const body = '<section class="c pad col"><div class="row"><h2 class="grow">' + t('الحسابات', 'Accounts') + ' (' + d.users.length + ')</h2><label class="row" style="gap:6px;min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--field)">' + ic('search', 's') + '<input id="q" aria-label="' + t('بحث', 'Search') + '" placeholder="' + t('بحث', 'Search') + '" value="' + E(p.q || '') + '" style="border:none;outline:none;background:none;width:140px"></label><button class="btn" id="addu">' + ic('plus', 's') + t('حساب جديد', 'New account') + '</button></div>' +
    '<div class="tw"><table><thead><tr><th>' + t('الاسم', 'Name') + '</th><th>' + t('الدخول', 'Username') + '</th><th>' + t('النوع', 'Role') + '</th><th>' + t('المواد والفصول', 'Subjects & classes') + '</th><th>' + t('مربي فصل', 'Class teacher') + '</th><th></th></tr></thead><tbody>' +
    users.map(u => { const subs = d.subjects.filter(s => s.teacherId === u.id), cts = d.classes.filter(c => c.classTeacherId === u.id);
      return '<tr' + (u.active ? '' : ' style="opacity:.55"') + '><td><b>' + E(u.name) + '</b>' + (u.active ? '' : ' <span class="tag">' + t('معطّل', 'Disabled') + '</span>') + '</td><td class="en mu ltr">' + E(u.username) + '</td><td>' + roleName(u.role, u) + '</td><td><div class="chips">' + (subs.map(s => '<span class="tag en">' + E(s.name + ' · ' + (d.cls.get(s.classId) || {}).name) + '</span>').join('') || '<span class="mu">—</span>') + '</div></td><td class="en">' + (cts.map(c => E(c.name)).join(', ') || '—') + '</td><td><button class="ib sm" data-u="' + u.id + '" aria-label="' + t('تعديل', 'Edit') + '">' + ic('edit', 's') + '</button></td></tr>'; }).join('') + '</tbody></table></div></section>';
  return { title: t('المعلمون والحسابات', 'Teachers & accounts'), sub: t('حدد لكل معلم مواده وفصوله، ومربي كل فصل يكتب التعليقات', 'Give each teacher their subjects and classes; the class teacher writes comments'), body, bind(m) {
    const qi = $('#q', m); qi.oninput = () => { clearTimeout(qi._t); qi._t = setTimeout(() => { D.view.params = { q: qi.value }; render().then(() => { const x = $('#q'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }); }, 300); };
    $('#addu', m).onclick = () => userDialog(null); $$('[data-u]', m).forEach(b => b.onclick = () => userDialog(d.usr.get(+b.dataset.u)));
  } };
};
function userDialog(u) {
  const d = D.data, me = D.me.user.id;
  const groups = d.classes.map(c => { const subs = d.subsOf(c.id); if (!subs.length) return ''; return '<div style="padding:8px 0;border-top:1px solid var(--line)"><b class="en">' + E(c.name) + '</b><div class="chips" style="margin-top:6px">' + subs.map(s => { const other = s.teacherId && (!u || s.teacherId !== u.id); return '<label class="chip' + (u && s.teacherId === u.id ? ' on' : '') + '" style="display:inline-flex;align-items:center;gap:6px" title="' + (other ? E(nameOf(s.teacherId)) : '') + '"><input type="checkbox" data-sub="' + s.id + '"' + (u && s.teacherId === u.id ? ' checked' : '') + ' style="accent-color:#B97A1C">' + E(s.name) + (other ? ' <small class="mu">(' + E(nameOf(s.teacherId).split(' ').slice(0, 2).join(' ')) + ')</small>' : '') + '</label>'; }).join('') + '</div></div>'; }).join('');
  dialog('<h2>' + (u ? t('تعديل الحساب', 'Edit account') : t('حساب جديد', 'New account')) + '</h2>' +
    '<div class="f"><label for="un">' + t('الاسم', 'Name') + '</label><input id="un" maxlength="80" value="' + E(u ? u.name : '') + '"></div>' +
    '<div class="f"><label for="uu">' + t('اسم الدخول', 'Username') + '</label><input id="uu" dir="ltr" maxlength="40" autocapitalize="off" value="' + E(u ? u.username : '') + '" placeholder="sara.m"></div>' +
    '<div class="f"><span class="lb">' + t('نوع الحساب', 'Role') + '</span><div class="chips" id="ur">' + [['teacher', 'معلم', 'Teacher'], ['print', 'طباعة', 'Printing'], ['admin', 'مدير', 'Principal']].map(([k, a, e]) => '<button class="chip' + ((u ? u.role : 'teacher') === k ? ' on' : '') + '" data-r="' + k + '">' + t(a, e) + '</button>').join('') + '</div></div>' +
    '<div class="f" id="scp"><label for="us">' + t('صلاحية المدير: ماذا يرى', 'What this principal sees') + '</label><select id="us" class="inp" style="width:100%"' + (u && u.id === me ? ' disabled' : '') + '>' + SCOPES().map(([k, a, e]) => '<option value="' + k + '"' + (scopeKey(u) === k ? ' selected' : '') + '>' + E(t(a, e)) + '</option>').join('') + '</select></div>' +
    '<div id="assign"><div class="f"><span class="lb">' + t('المواد والفصول التي يدرّسها (يمكن أكثر من مادة وأكثر من فصل)', 'Subjects and classes taught (any number)') + '</span>' + (groups || '<p class="mu" style="margin:0">' + t('أضف الفصول والمواد أولاً', 'Add classes and subjects first') + '</p>') + '</div>' +
    '<div class="f" style="margin-top:10px"><span class="lb">' + t('مربي فصل', 'Class teacher of') + '</span><div class="chips">' + d.classes.map(c => '<label class="chip" style="display:inline-flex;align-items:center;gap:6px"><input type="checkbox" data-ct="' + c.id + '"' + (u && c.classTeacherId === u.id ? ' checked' : '') + ' style="accent-color:#B97A1C">' + E(c.name) + '</label>').join('') + '</div></div></div>' +
    (u ? '<label class="check"><input type="checkbox" id="ua"' + (u.active ? ' checked' : '') + (u.id === me ? ' disabled' : '') + '><span>' + t('الحساب فعّال', 'Account active') + '</span></label>' : '<div class="note">' + ic('key', 's') + t('تُنشأ كلمة مرور مؤقتة يغيّرها صاحب الحساب عند أول دخول.', 'A temporary password is created; the user changes it at first sign-in.') + '</div>') +
    '<div class="acts">' + (u ? '<button class="btn g" data-reset>' + ic('key', 's') + t('كلمة مرور جديدة', 'New password') + '</button>' : '') + '<span class="grow"></span><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>', (o, close) => {
    let role = u ? u.role : 'teacher';
    const showAssign = () => { $('#assign', o).style.display = role === 'print' ? 'none' : ''; $('#scp', o).style.display = role === 'admin' ? '' : 'none'; };
    $$('[data-r]', o).forEach(b => b.onclick = () => { role = b.dataset.r; $$('[data-r]', o).forEach(x => x.classList.toggle('on', x === b)); showAssign(); }); showAssign();
    $$('[data-sub]', o).forEach(x => x.onchange = () => x.parentElement.classList.toggle('on', x.checked));
    $('[data-x]', o).onclick = close;
    $('[data-ok]', o).onclick = async () => {
      const r = await run(() => api('saveUser', { id: u && u.id, name: $('#un', o).value, username: $('#uu', o).value, role, scope: role === 'admin' ? scopeFromKey($('#us', o).value) : {}, active: u ? $('#ua', o).checked : true }));
      const uid = r.user.id;
      if (role !== 'print') {
        for (const x of $$('[data-sub]', o)) { const s = d.subjects.find(z => z.id === +x.dataset.sub), want = x.checked; if (want && s.teacherId !== uid) await run(() => api('saveSubject', Object.assign({}, s, { teacherId: uid }))); else if (!want && s.teacherId === uid) await run(() => api('saveSubject', Object.assign({}, s, { teacherId: null }))); }
        for (const x of $$('[data-ct]', o)) { const c = d.cls.get(+x.dataset.ct); if (x.checked && c.classTeacherId !== uid) await run(() => api('saveClass', Object.assign({}, c, { classTeacherId: uid }))); else if (!x.checked && c.classTeacherId === uid) await run(() => api('saveClass', Object.assign({}, c, { classTeacherId: null }))); }
      }
      close(); await load(D.data.term.id); render();
      if (r.password) showPassword2(r.user, r.password);
    };
    const rs = $('[data-reset]', o); if (rs) rs.onclick = async () => { if (!(await confirmBox(t('إنشاء كلمة مرور جديدة لـ ', 'Create a new password for ') + E(u.name) + '?'))) return; const r = await run(() => api('resetPassword', { id: u.id })); close(); showPassword2(u, r.password); };
  });
}
function showPassword2(u, pw) {
  const txt = t('بيانات الدخول إلى Ooz Marks', 'Ooz Marks sign-in') + '\n' + t('رمز المدرسة: ', 'School code: ') + D.me.school.code + '\n' + t('اسم الدخول: ', 'Username: ') + u.username + '\n' + t('كلمة المرور المؤقتة: ', 'Temporary password: ') + pw;
  dialog('<h2>' + t('بيانات دخول ', 'Sign-in for ') + E(u.name) + '</h2><div class="c pad col" style="gap:6px;box-shadow:none"><div class="row"><span class="grow mu">' + t('رمز المدرسة', 'School code') + '</span><b class="en ltr">' + E(D.me.school.code) + '</b></div><div class="row"><span class="grow mu">' + t('اسم الدخول', 'Username') + '</span><b class="en ltr">' + E(u.username) + '</b></div><div class="row"><span class="grow mu">' + t('كلمة المرور المؤقتة', 'Temporary password') + '</span><b class="en ltr" style="font-size:20px;color:var(--goldd);letter-spacing:1px">' + E(pw) + '</b></div></div><p class="mu" style="margin:0">' + t('سلّمها لصاحب الحساب. لن تظهر مرة أخرى، ويغيّرها عند أول دخول.', 'Give these to the user. The password is not shown again; they change it at first sign-in.') + '</p><div class="acts"><button class="btn g" data-cp>' + ic('copy', 's') + t('نسخ', 'Copy') + '</button><button class="btn" data-x>' + t('تم', 'Done') + '</button></div>', (o, close) => { $('[data-x]', o).onclick = close; $('[data-cp]', o).onclick = async () => { await N.copy(txt); toast(t('تم النسخ', 'Copied')); }; });
}

SCREENS.students = async p => {
  const d = D.data, c = pickClass(p);
  const imp = D.imp || null;
  const subsN = c ? new Map(d.subsOf(c.id).map(s => [s.id, s.name])) : new Map();
  const list = c ? d.studsOf(c.id) : [];
  const body = '<div class="split"><section class="c pad side col"><h2>' + t('استيراد من Excel', 'Import from Excel') + '</h2>' +
    '<div class="step"><i>1</i><div class="col" style="gap:6px"><b>' + t('حمّل النموذج', 'Download the template') + '</b><span class="mu" style="font-size:13px;line-height:1.6">' + t('الأعمدة: الاسم الكامل، الفصل، رقم الطالب، مواد الإعفاء. والصف الأصفر مثال.', 'Columns: full name, class, student number, exempt subjects. The yellow row is an example.') + '</span><button class="btn g sm" id="tpl" style="align-self:flex-start">' + ic('dl', 's') + t('نموذج الطلاب.xlsx', 'Students template.xlsx') + '</button></div></div>' +
    '<div class="step"><i>2</i><div class="col" style="gap:6px"><b>' + t('املأه ثم ارفعه', 'Fill it in, then upload it') + '</b><button class="btn sm" id="upl" style="align-self:flex-start">' + ic('up', 's') + t('رفع الملف', 'Upload file') + '</button></div></div>' +
    (imp ? '<div class="step"><i>3</i><div class="col grow" style="gap:8px"><b>' + t('راجع قبل الحفظ', 'Review before saving') + '</b>' + (imp.ok.length ? '<div class="note ok">' + ic('check', 's') + imp.ok.length + ' ' + t('طالباً جاهزون', 'students ready') + '</div>' : '') +
      (imp.errors.length ? '<div class="note bad" style="flex-direction:column;gap:2px"><b style="color:var(--red)">' + imp.errors.length + ' ' + t('صفوف بها مشكلة (صححها في الملف وارفعه مرة أخرى):', 'rows with a problem (fix the file and upload again):') + '</b>' + imp.errors.slice(0, 12).map(e => '<span>' + t('الصف ', 'Row ') + e.row + ': ' + E(e.msg) + '</span>').join('') + '</div>' : '') +
      '<div class="row"><button class="btn sm" id="impgo"' + (imp.errors.length || !imp.ok.length ? ' disabled' : '') + '>' + ic('check', 's') + t('إضافة ', 'Add ') + imp.ok.length + t(' طالباً', ' students') + '</button><button class="btn g sm" id="impx">' + t('إلغاء', 'Cancel') + '</button></div></div></div>' : '') + '</section>' +
    '<section class="c pad main col">' + (c ? '<div class="row"><h2 class="grow en" style="font-size:20px">' + E(c.name) + ' <span class="mu" style="font-size:14px;font-family:A,S">· ' + list.length + ' ' + t('طالباً', 'students') + '</span></h2>' + classSelect('cls', c.id) + '<button class="btn" id="adds">' + ic('plus', 's') + t('إضافة طالب', 'Add student') + '</button></div>' +
      (list.length ? '<div class="tw"><table><thead><tr><th>#</th><th>' + t('الاسم الكامل (كما في الشهادة)', 'Full name (as on the report)') + '</th><th>' + t('رقم الطالب', 'Number') + '</th><th>' + t('الإعفاء', 'Exempt') + '</th><th></th></tr></thead><tbody>' +
        list.map((s, i) => '<tr><td class="en mu">' + (i + 1) + '</td><td class="en"><b>' + E(s.name) + '</b></td><td class="en mu">' + E(s.number || '') + '</td><td>' + ((s.exempt || []).map(id => '<span class="tag en">' + E(subsN.get(id) || '') + '</span>').join(' ') || '<span class="mu">—</span>') + '</td><td><button class="ib sm" data-st="' + s.id + '" aria-label="' + t('تعديل', 'Edit') + '">' + ic('edit', 's') + '</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">' + t('لا يوجد طلاب في هذا الفصل', 'No students in this class') + '</div>') +
      '<p class="mu" style="margin:0;font-size:13px">' + t('الطالب المعفى من مادة لا تظهر له في الشهادة، ويُحسب مجموعه من باقي المواد.', 'An exempt subject is left off that student’s report and total.') + '</p>' : noClasses()) + '</section></div>';
  return { title: t('الطلاب', 'Students'), sub: t('إدخال يدوي أو استيراد من نموذج Excel', 'Add by hand or import from the Excel template'), body, bind(m) {
    const cs = $('#cls', m); if (cs) cs.onchange = () => { D.lastClass = +cs.value; D.view.params = { classId: +cs.value }; render(); };
    const ad = $('#adds', m); if (ad) ad.onclick = () => studentDialog(c, null);
    $$('[data-st]', m).forEach(b => b.onclick = () => studentDialog(c, d.stu.get(+b.dataset.st)));
    $('#tpl', m).onclick = template; $('#upl', m).onclick = importFile;
    const go = $('#impgo', m); if (go) go.onclick = async () => { const r = await run(() => api('importStudents', { rows: D.imp.ok })); if (r.errors && r.errors.length) { toast(t('لم يُحفظ شيء: في الملف أخطاء', 'Nothing saved: the file has errors'), true); return; } D.imp = null; toast(t('أُضيف ', 'Added ') + r.added + t(' طالباً', ' students')); await load(D.data.term.id); render(); };
    const ix = $('#impx', m); if (ix) ix.onclick = () => { D.imp = null; render(); };
  } };
};
function studentDialog(c, s) {
  const subs = D.data.subsOf(c.id);
  dialog('<h2>' + (s ? t('تعديل الطالب', 'Edit student') : t('طالب جديد · ', 'New student · ') + E(c.name)) + '</h2>' +
    '<div class="f"><label for="sn">' + t('الاسم الكامل (كما في الشهادة)', 'Full name (as on the report)') + '</label><input id="sn" dir="ltr" maxlength="120" value="' + E(s ? s.name : '') + '"></div>' +
    '<div class="grid2"><div class="f"><label for="sr">' + t('رقم الطالب', 'Student number') + '</label><input id="sr" dir="ltr" maxlength="30" value="' + E(s ? s.number : '') + '"></div><div class="f"><label for="sc">' + t('الفصل', 'Class') + '</label>' + classSelect('sc', c.id).replace('class="inp"', '') + '</div></div>' +
    (subs.length ? '<div class="f"><span class="lb">' + t('معفى من (لا تظهر في شهادته)', 'Exempt from (left off the report)') + '</span><div class="chips">' + subs.map(x => '<label class="chip" style="display:inline-flex;align-items:center;gap:6px"><input type="checkbox" data-ex="' + x.id + '"' + (s && (s.exempt || []).includes(x.id) ? ' checked' : '') + ' style="accent-color:#B97A1C">' + E(x.name) + '</label>').join('') + '</div></div>' : '') +
    '<div class="acts">' + (s ? '<button class="btn d" data-del>' + ic('trash', 's') + t('حذف', 'Delete') + '</button>' : '') + '<span class="grow"></span><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>', (o, close) => {
    $('[data-x]', o).onclick = close;
    $('[data-ok]', o).onclick = async () => { const cid = +$('#sc', o).value; const ex = cid === c.id ? $$('[data-ex]', o).filter(x => x.checked).map(x => +x.dataset.ex) : [];
      await run(() => api('saveStudent', { id: s && s.id, classId: cid, name: $('#sn', o).value, number: $('#sr', o).value, exempt: ex, sort: s ? s.sort : 0 })); close(); await load(D.data.term.id); render(); };
    const del = $('[data-del]', o); if (del) del.onclick = async () => { close(); if (!(await confirmBox(t('حذف ', 'Delete ') + E(s.name) + t(' ودرجاته؟', ' and their marks?'), t('حذف', 'Delete'), true))) return; await run(() => api('deleteStudent', { id: s.id })); await load(D.data.term.id); render(); };
  });
}
const HEAD = ['Full name', 'Class', 'Student number', 'Exempt subjects (comma separated)'];
async function template() {
  const X = window.XLSX, wb = X.utils.book_new(), d = D.data;
  const ex = d.classes[0] ? [['Ahmed Mazin Esameldin', d.classes[0].name, '7-01', '']] : [['Ahmed Mazin Esameldin', 'Grade 7', '7-01', '']];
  const ws = X.utils.aoa_to_sheet([HEAD, ...ex]); ws['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 16 }, { wch: 36 }];
  X.utils.book_append_sheet(wb, ws, 'Students');
  const ref = [['Class', 'Stage', 'Subjects (for the exempt column)'], ...d.classes.map(c => [c.name, stageOf(c), d.subsOf(c.id).map(s => s.name).join(', ')])];
  const ws2 = X.utils.aoa_to_sheet(ref); ws2['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 60 }]; X.utils.book_append_sheet(wb, ws2, 'Classes');
  const guide = X.utils.aoa_to_sheet([['Ooz Marks — students template'], ['One student per row, starting at row 3 (row 2 is an example: replace or delete it).'], ['Class must match a class name exactly as in the Classes sheet.'], ['Exempt subjects: subject names from that class, separated by commas. Leave empty if none.'],
    [''], ['قالب الطلاب — Ooz Marks'], ['طالب في كل صف، ابتداءً من الصف 3 (الصف 2 مثال: استبدله أو احذفه).'], ['اسم الفصل يطابق تماماً ما في ورقة Classes.'], ['مواد الإعفاء: أسماء المواد مفصولة بفواصل، أو اتركها فارغة.']]);
  guide['!cols'] = [{ wch: 90 }]; X.utils.book_append_sheet(wb, guide, 'Guide');
  const b64 = X.write(wb, { type: 'base64', bookType: 'xlsx' });
  const r = await N.saveFile({ name: 'Ooz-Marks-students-template.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: b64 });
  if (r) toast(t('تم حفظ النموذج', 'Template saved'));
}
async function importFile() {
  let f; try { f = await N.pickFile('.xlsx,.xls,.csv'); } catch (e) { return toast(errText(e), true); }
  if (!f) return;
  let rows; try { const wb = XLSX.read(f.base64, { type: 'base64' }); const ws = wb.Sheets[wb.SheetNames[0]]; rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }); }
  catch (e) { return toast(t('تعذّرت قراءة الملف', 'Could not read the file'), true); }
  const d = D.data, byName = new Map(d.classes.map(c => [c.name.trim().toLowerCase(), c])), ok = [], errors = [];
  const seen = new Set(d.students.map(s => s.classId + '|' + s.name.trim().toLowerCase()));
  rows.slice(1).forEach((r, i) => {
    const row = i + 2, name = String(r[0] || '').trim(), cn = String(r[1] || '').trim(), num = String(r[2] || '').trim(), ex = String(r[3] || '').split(/[,،;]/).map(x => x.trim()).filter(Boolean);
    if (!name && !cn) return;
    if (name === 'Ahmed Mazin Esameldin' && num === '7-01') return;
    if (!name) return errors.push({ row, msg: t('الاسم فارغ', 'Name is empty') });
    const c = byName.get(cn.toLowerCase()); if (!c) return errors.push({ row, msg: t('الفصل «' + cn + '» غير موجود', 'Class “' + cn + '” not found') });
    const subs = d.subsOf(c.id); const bad = ex.find(x => !subs.some(s => s.name.toLowerCase() === x.toLowerCase())); if (bad) return errors.push({ row, msg: t('المادة «' + bad + '» ليست في ', 'Subject “' + bad + '” is not in ') + c.name });
    const key = c.id + '|' + name.toLowerCase(); if (seen.has(key)) return errors.push({ row, msg: t('الاسم مكرر: ', 'Duplicate name: ') + name });
    seen.add(key); ok.push({ row, name, className: c.name, number: num, exempt: ex });
  });
  D.imp = { ok, errors }; if (!ok.length && !errors.length) toast(t('الملف لا يحتوي طلاباً', 'The file has no students'), true); render();
}

SCREENS.marks = async p => {
  const d = D.data, c = pickClass(p);
  if (!c) return { title: t('الدرجات', 'Marks'), body: noClasses() };
  const subs = d.subsOf(c.id), studs = d.studsOf(c.id), st = ST();
  const head = subs.map(s => { const e = entered(s); return '<th class="n en">' + E(s.name) + '<br><span style="font-weight:400">' + (s.kind === 'grade' ? t('تقدير', 'Grade') : '/' + s.max) + '</span> ' + (d.sb.has(s.id) ? '<button class="tag ok" data-reopen="' + s.id + '" title="' + t('إعادة فتح للمعلم', 'Reopen for the teacher') + '" style="border:none;cursor:pointer">' + ic('lock', 's') + '</button>' : '<span class="tag wa">' + e.done + '/' + e.need + '</span>') + '</th>'; }).join('');
  const rows = studs.map(s => { const r = result(s), ex = new Set(s.exempt || []);
    return '<tr><td class="en" style="white-space:nowrap"><b>' + E(s.name) + '</b>' + (d.ap.has(s.id) ? ' <span class="tag ok">' + ic('check', 's') + '</span>' : '') + '</td>' + subs.map(sb => { if (ex.has(sb.id)) return '<td class="n mu">' + t('معفى', 'Exempt') + '</td>';
      const m = d.mk.get(s.id + ':' + sb.id), row = r.rows.find(x => x.subject.id === sb.id); const fail = row && row.fail;
      return '<td class="n en cell' + (fail ? ' fail' : '') + '" data-cell="' + s.id + ':' + sb.id + '" tabindex="0">' + (m && m.abs ? '<span class="tag">Abs</span>' : m && m.grade ? E(m.grade) : m && m.value != null ? OozCalc.fmt(m.value, 2) : '<span class="mu">—</span>') + '</td>'; }).join('') +
      '<td class="n en"><b>' + OozCalc.fmt(r.total.got, 2) + '/' + r.total.max + '</b></td><td class="n en' + (r.total.fail ? ' fail' : '') + '"><b>' + (r.total.pct == null ? '' : OozCalc.show(st, r.total.pct) + '%') + '</b></td><td class="n en' + (r.total.fail ? ' fail' : '') + '"><b>' + (r.total.grade || '') + '</b></td></tr>'; }).join('');
  const body = '<div class="row">' + classSelect('cls', c.id) + '<span class="grow"></span><button class="btn g" id="xl">' + ic('dl', 's') + 'Excel</button><button class="btn" id="torev">' + ic('rep', 's') + t('المراجعة والاعتماد', 'Review & approve') + '</button></div>' +
    (studs.length && subs.length ? '<section class="c" style="padding:6px 6px 0"><div class="tw"><table><thead><tr><th>' + t('الطالب', 'Student') + '</th>' + head + '<th class="n">' + t('المجموع', 'Total') + '</th><th class="n">' + t('النسبة', '%') + '</th><th class="n">' + t('التقدير', 'Grade') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' : '<div class="empty">' + t('أضف الطلاب والمواد لهذا الفصل', 'Add students and subjects to this class') + '</div>') +
    '<div class="row mu" style="font-size:13px;gap:16px"><span><b style="color:var(--red)">' + t('أحمر', 'Red') + '</b> = ' + (st.failRule === 'min' ? t('تحت الحد الأدنى', 'below the minimum') : t('تقدير ', 'grade ') + OozCalc.lowest(st).g) + '</span><span><b>Abs</b> = ' + t('غائب', 'absent') + '</span><span>' + ic('lock', 's') + ' = ' + t('أرسلها المعلم (اضغط لإعادة فتحها له)', 'sent by the teacher (tap to reopen)') + '</span><span>' + t('اضغط أي درجة لتعديلها. كل تعديل يُسجَّل.', 'Tap a mark to change it. Every change is logged.') + '</span></div>';
  return { title: t('الدرجات', 'Marks'), sub: t('تتجمع هنا من حسابات المعلمين', 'Collected from the teachers’ accounts'), body, bind(m) {
    $('#cls', m).onchange = e => { D.lastClass = +e.target.value; D.view.params = { classId: +e.target.value }; render(); };
    $('#torev', m).onclick = () => { D.lastClass = c.id; tab('review'); };
    $('#xl', m).onclick = () => exportMarks(c);
    $$('[data-reopen]', m).forEach(b => b.onclick = async () => { const s = d.subjects.find(x => x.id === +b.dataset.reopen); if (!(await confirmBox(t('إعادة فتح ' + E(s.name) + ' للمعلم ليعدّل ويرسل من جديد؟', 'Reopen ' + E(s.name) + ' so the teacher can edit and send again?')))) return; await run(() => api('reopenMarks', { termId: d.term.id, subjectId: s.id })); await load(d.term.id); render(); });
    $$('[data-cell]', m).forEach(td => { const open = () => { const [sid, sbid] = td.dataset.cell.split(':').map(Number); markDialog(d.stu.get(sid), d.subjects.find(x => x.id === sbid)); }; td.onclick = open; td.onkeydown = e => { if (e.key === 'Enter') open(); }; });
  } };
};
function markDialog(s, sb) {
  const d = D.data, m = d.mk.get(s.id + ':' + sb.id) || {};
  const word = sb.kind === 'grade';
  dialog('<h2 class="en">' + E(s.name) + '</h2><p class="mu en" style="margin:0">' + E(sb.name) + (word ? '' : ' · /' + sb.max) + '</p><div class="row">' + (word ? '<select class="mark gsel" id="mv" aria-label="' + t('التقدير', 'Grade') + '"' + (m.abs ? ' disabled' : '') + '><option value="">—</option>' + gradeWords().map(g => '<option' + (m.grade === g ? ' selected' : '') + '>' + E(g) + '</option>').join('') + '</select>' : '<input class="mark" id="mv" inputmode="decimal" aria-label="' + t('الدرجة', 'Mark') + '" value="' + (m.abs ? '' : m.value == null ? '' : m.value) + '"' + (m.abs ? ' disabled' : '') + '>') + '<button class="absb' + (m.abs ? ' on' : '') + '" id="ma">Abs</button></div>' +
    (d.ap.has(s.id) ? '<div class="note">' + ic('warn', 's') + t('هذه النتيجة معتمدة. التعديل يغيّر الشهادة المطبوعة.', 'This result is approved. Changing it changes the printed report.') + '</div>' : '') +
    '<div class="acts"><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>', (o, close) => {
    let abs = !!m.abs; $('#ma', o).onclick = () => { abs = !abs; $('#ma', o).classList.toggle('on', abs); $('#mv', o).disabled = abs; };
    $('[data-x]', o).onclick = close;
    $('[data-ok]', o).onclick = async () => { await run(() => api('saveMarks', { termId: d.term.id, subjectId: sb.id, entries: [{ studentId: s.id, value: word ? null : $('#mv', o).value, grade: word ? $('#mv', o).value : null, abs }] })); close(); await load(d.term.id); render(); };
  });
}
async function exportMarks(c) {
  const d = D.data, subs = d.subsOf(c.id), rows = [['Student', ...subs.map(s => s.kind === 'grade' ? s.name : s.name + ' /' + s.max), 'Total', 'Max', '%', 'Grade']];
  d.studsOf(c.id).forEach(s => { const r = result(s), ex = new Set(s.exempt || []); rows.push([s.name, ...subs.map(sb => { if (ex.has(sb.id)) return 'Exempt'; const m = d.mk.get(s.id + ':' + sb.id); return m ? (m.abs ? 'Abs' : m.grade ? m.grade : m.value == null ? '' : m.value) : ''; }), r.total.got, r.total.max, r.total.pct == null ? '' : r.total.pct, r.total.grade || '']); });
  const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 34 }]; XLSX.utils.book_append_sheet(wb, ws, c.name.slice(0, 30));
  await N.saveFile({ name: 'Ooz-Marks-' + c.name.replace(/[^A-Za-z0-9]+/g, '-') + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) });
}

function marksTable(r, ar) {
  const st = ST(), H = ar ? ['المادة', 'الكاملة', 'النجاح', 'الدرجة', '%', 'التقدير', 'المجموع'] : ['Subject', 'Max', 'Min', 'Marks', '%', 'Grade', 'Total'];
  return '<div class="tw"><table><thead><tr><th>' + H[0] + '</th><th class="n">' + H[1] + '</th><th class="n">' + H[2] + '</th><th class="n">' + H[3] + '</th><th class="n">%</th><th class="n">' + H[5] + '</th></tr></thead><tbody>' +
    r.rows.map(x => x.kind === 'grade' ? '<tr><td class="en">' + E(x.subject.name) + '</td><td class="n mu" colspan="2">' + t('تقدير', 'Grade') + '</td><td class="n" colspan="3"><b>' + (x.abs ? 'Abs' : E(x.word || '—')) + '</b></td></tr>' : '<tr><td class="en">' + E(x.subject.name) + '</td><td class="n en">' + x.max + '</td><td class="n en">' + x.min + '</td><td class="n en' + (x.fail ? ' fail' : '') + '">' + (x.abs ? '<b>Abs</b>' : x.value == null ? '<span class="mu">—</span>' : OozCalc.fmt(x.value, 2)) + '</td><td class="n en' + (x.fail ? ' fail' : '') + '">' + (x.abs ? '—' : OozCalc.show(st, x.pct)) + '</td><td class="n en' + (x.fail ? ' fail' : '') + '"><b>' + (x.abs ? '—' : x.grade || '') + '</b></td></tr>').join('') +
    '<tr><td><b>' + H[6] + '</b></td><td class="n en"><b>' + r.total.max + '</b></td><td class="n en">' + r.total.min + '</td><td class="n en"><b>' + OozCalc.fmt(r.total.got, 2) + '</b></td><td class="n en' + (r.total.fail ? ' fail' : '') + '"><b>' + (r.total.pct == null ? '' : OozCalc.show(st, r.total.pct) + '%') + '</b></td><td class="n en' + (r.total.fail ? ' fail' : '') + '"><b>' + (r.total.grade || '') + '</b></td></tr></tbody></table></div>' +
    (r.exempt.length ? '<p class="mu" style="margin:6px 0 0;font-size:13px">' + t('معفى من: ', 'Exempt from: ') + r.exempt.map(s => E(s.name)).join(', ') + '</p>' : '');
}
SCREENS.review = async p => {
  const d = D.data, c = pickClass(p);
  if (!c) return { title: t('المراجعة والاعتماد', 'Review & approve'), body: noClasses() };
  const studs = d.studsOf(c.id); const sel = studs.find(s => s.id === +p.studentId) || studs[0];
  const info = s => { const r = result(s), w = warningsFor(s).filter(x => x.type !== 'empty'), cm = (d.cm.get(s.id) || {}); return isAr(c) ? { r, w: [], cm: {}, ready: r.complete } : { r, w, cm, ready: r.complete && !!(cm.text || '').trim() && !cm.returned }; };
  const tagOf = s => { const i = info(s); if (d.ap.has(s.id)) return '<span class="tag ok">' + ic('check', 's') + t('معتمد', 'Approved') + '</span>'; if (!i.r.complete) return '<span class="tag wa">' + t('درجات ناقصة', 'Marks missing') + '</span>'; if (i.cm.returned) return '<span class="tag in">' + t('أُرجع للمعلم', 'Returned') + '</span>'; if (!isAr(c) && !(i.cm.text || '').trim()) return '<span class="tag wa">' + t('بلا تعليق', 'No comment') + '</span>'; if (i.w.length) return '<span class="tag bad">' + t('تنبيه', 'Check') + '</span>'; return '<span class="tag in">' + t('جاهز', 'Ready') + '</span>'; };
  const ready = studs.filter(s => !d.ap.has(s.id) && info(s).ready);
  let det = '';
  if (sel) { const i = info(sel), ap = d.ap.has(sel.id);
    det = '<div class="row"><div class="grow"><h2 class="en" style="font-size:21px">' + E(sel.name) + '</h2><span class="mu en">' + E(c.name) + ' · ' + stageOf(c) + '</span></div><div class="sumg"><b>' + (i.r.total.pct == null ? '—' : OozCalc.show(ST(), i.r.total.pct) + '%') + '</b><span>' + (isAr(c) ? E(i.r.total.label || '—') : 'Grade ' + (i.r.total.grade || '—')) + '</span></div></div>' + marksTable(i.r, isAr(c)) +
      (isAr(c) ? '' : '<div class="col" style="gap:8px"><div class="row"><b>Comment</b><span class="mu" style="font-size:13px">' + t('كتبه: ', 'By: ') + E(nameOf(c.classTeacherId) || t('مربي الفصل', 'class teacher')) + '</span></div>' +
      (i.cm.text ? '<div class="comment">' + highlight(i.cm.text, i.w) + '</div>' : '<div class="empty" style="padding:18px">' + t('لم يُكتب تعليق بعد', 'No comment yet') + '</div>') +
      (i.cm.returned ? '<div class="note">' + ic('chat', 's') + t('أُرجع للمعلم: ', 'Returned to the teacher: ') + E(i.cm.returned) + '</div>' : '') +
      i.w.map(w => '<div class="note bad">' + ic('warn', 's') + '<span>' + E(warnText(w)) + '</span></div>').join('') + '</div>') +
      '<div class="row">' + (ap ? '<span class="tag ok" style="min-height:36px">' + ic('check', 's') + t('معتمد ويظهر في الطباعة', 'Approved: ready to print') + '</span><span class="grow"></span><button class="btn g" id="unap">' + ic('undo', 's') + t('إلغاء الاعتماد', 'Undo approval') + '</button>'
        : (isAr(c) ? '' : '<button class="btn g" id="ret">' + ic('chat', 's') + t('إرجاع مع ملاحظة', 'Return with a note') + '</button><button class="btn g" id="edcm">' + ic('edit', 's') + t('تعديل التعليق', 'Edit comment') + '</button>') + '<span class="grow"></span><button class="btn" id="ap1"' + (i.r.complete ? '' : ' disabled') + '>' + ic('check', 's') + t('اعتماد ', 'Approve ') + E(sel.name.split(' ')[0]) + '</button>') + '</div>'; }
  const body = '<div class="row">' + classSelect('cls', c.id) + '<span class="tag" style="min-height:32px">' + studs.filter(s => d.ap.has(s.id)).length + ' / ' + studs.length + ' ' + t('معتمد', 'approved') + '</span><span class="grow"></span><button class="btn" id="apall"' + (ready.length ? '' : ' disabled') + '>' + ic('lock', 's') + t('اعتماد الجاهزين (' + ready.length + ')', 'Approve ready (' + ready.length + ')') + '</button></div>' +
    (studs.length ? '<div class="split"><section class="c pad side"><div class="list">' + studs.map(s => '<button class="li' + (sel && s.id === sel.id ? ' on' : '') + '" data-st="' + s.id + '"><span class="mid"><b class="en ltr">' + E(s.name) + '</b></span>' + tagOf(s) + '</button>').join('') + '</div></section><section class="c pad main col">' + det + '</section></div>' : '<div class="empty">' + t('لا يوجد طلاب', 'No students') + '</div>');
  return { title: t('المراجعة والاعتماد', 'Review & approve'), sub: t('المعتمد فقط يظهر في حساب الطباعة', 'Only approved results reach the printing account'), body, bind(m) {
    $('#cls', m).onchange = e => { D.lastClass = +e.target.value; D.view.params = { classId: +e.target.value }; render(); };
    $$('[data-st]', m).forEach(b => b.onclick = () => { D.view.params = { classId: c.id, studentId: +b.dataset.st }; render(); });
    const re = async () => { await load(d.term.id); render(); };
    const aa = $('#apall', m); if (aa) aa.onclick = async () => { const warn = ready.filter(s => info(s).w.length); if (!(await confirmBox(t('اعتماد ' + ready.length + ' طالباً من ' + E(c.name) + '؟', 'Approve ' + ready.length + ' students in ' + E(c.name) + '?') + (warn.length ? '<br><b style="color:var(--red)">' + t(warn.length + ' منهم عليهم تنبيه في التعليق.', warn.length + ' of them have a comment warning.') + '</b>' : '')))) return; await run(() => api('approve', { termId: d.term.id, studentIds: ready.map(s => s.id) }), t('تم الاعتماد', 'Approved')); re(); };
    if (!sel) return;
    const a1 = $('#ap1', m); if (a1) a1.onclick = async () => { if (info(sel).w.length && !(await confirmBox(t('على التعليق تنبيه. اعتماد على أي حال؟', 'The comment has a warning. Approve anyway?')))) return; await run(() => api('approve', { termId: d.term.id, studentIds: [sel.id] }), t('تم الاعتماد', 'Approved')); const nx = studs.find(s => !d.ap.has(s.id) && s.id !== sel.id); D.view.params = { classId: c.id, studentId: nx ? nx.id : sel.id }; re(); };
    const un = $('#unap', m); if (un) un.onclick = async () => { await run(() => api('unapprove', { termId: d.term.id, studentIds: [sel.id] })); re(); };
    const rt = $('#ret', m); if (rt) rt.onclick = async () => { const note = await askText(t('إرجاع لمربي الفصل', 'Return to the class teacher'), t('ملاحظتك للمعلم', 'Your note to the teacher')); if (!note) return; await run(() => api('returnComment', { termId: d.term.id, studentId: sel.id, note }), t('أُرجع للمعلم', 'Returned')); re(); };
    const ec = $('#edcm', m); if (ec) ec.onclick = async () => { const v = await askText(t('تعديل التعليق', 'Edit comment'), sel.name, (d.cm.get(sel.id) || {}).text); if (v == null) return; await run(() => api('saveComment', { termId: d.term.id, studentId: sel.id, text: v })); re(); };
  } };
};

/* ---------- printing ---------- */
async function makePdf(c, studs) {
  const d = D.data;
  const pages = studs.map(s => ({ student: s, cls: c, result: result(s), comment: (d.cm.get(s.id) || {}).text || '' }));
  const bytes = await (isAr(c) ? OozReportAr : OozReport).build(pages, { settings: ST(), logo: D.me.logo, term: d.term });
  let bin = ''; for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  return btoa(bin);
}
const fileSafe = s => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
async function printClass(c, studs, single) {
  busy(true);
  try { const b64 = await makePdf(c, studs); busy(false);
    const name = 'Report-' + (single ? fileSafe(studs[0].name) + '-' : '') + fileSafe(c.name) + '-' + fileSafe(D.data.term.name) + '.pdf';
    const r = await N.saveFile({ name, mime: 'application/pdf', base64: b64 }); if (r) toast(t('تم حفظ الملف', 'File saved'));
  } catch (e) { busy(false); toast(errText(e), true); }
}
/* ---------- the class spreadsheet (all students × subjects, total, %, rank) ---------- */
function sheetsOf(classes) {
  const d = D.data;
  return classes.map(c => ({ cls: c, ar: isAr(c), subjects: d.subsOf(c.id), teacher: nameOf(c.classTeacherId), students: d.studsOf(c.id).map(s => ({ student: s, result: result(s) })) }));
}
const sheetPaper = () => { try { return localStorage.getItem('ooz-marks-paper') === 'A3' ? 'A3' : 'A4'; } catch (e) { return 'A4'; } };
async function printSheets(classes) {
  busy(true);
  try { const paper = sheetPaper(); const bytes = await OozSpread.build(sheetsOf(classes), { settings: ST(), logo: D.me.logo, term: D.data.term, paper }); busy(false);
    let bin = ''; for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    const name = 'Spreadsheet-' + (classes.length === 1 ? fileSafe(classes[0].name) : 'All-classes') + '-' + fileSafe(D.data.term.name) + '-' + paper + '.pdf';
    const r = await N.saveFile({ name, mime: 'application/pdf', base64: btoa(bin) }); if (r) toast(t('تم حفظ الملف', 'File saved'));
  } catch (e) { busy(false); toast(errText(e), true); }
}
async function excelSheets(classes) {
  const X = window.XLSX, wb = X.utils.book_new(), used = new Set();
  for (const sh of sheetsOf(classes)) {
    const T = OozSpread.rows(sh), ar = sh.ar;
    const head = ['#', ar ? 'اسم الطالب' : 'Name of the student'].concat(T.marks.map(s => s.name + ' (' + s.max + ')'), T.words.map(s => s.name + (ar ? ' (تقدير)' : ' (grade)')), [(ar ? 'المجموع (' : 'Total (') + T.full + ')', '%', ar ? 'الترتيب' : 'Rank']);
    const body = T.list.map((x, i) => [i + 1, x.student.name].concat(T.marks.map(s => { const c = x.cells[s.id]; return !c ? '' : c.exempt ? '—' : c.abs ? (ar ? 'غ' : 'Abs') : c.value == null ? '' : c.value; }),
      T.words.map(s => { const c = x.cells[s.id]; return !c ? '' : c.exempt ? '—' : c.abs ? (ar ? 'غ' : 'Abs') : (c.word || ''); }), [x.pct == null ? '' : x.got, x.pct == null ? '' : Math.round(x.pct), x.rank || '']));
    const avg = ['', ar ? 'متوسط الفصل' : 'Class average'].concat(T.marks.map(s => T.avg[s.id] == null ? '' : Math.round(T.avg[s.id] * 10) / 10), T.words.map(() => ''), [T.avgTotal == null ? '' : Math.round(T.avgTotal * 10) / 10, T.avgPct == null ? '' : Math.round(T.avgPct), '']);
    const title = [[(ST().schoolName || '')], [(ar ? 'الكشف التجميعي — ' : 'Spreadsheet — ') + termLabel(D.data.term) + ' — ' + sh.cls.name + (sh.teacher ? ' — ' + sh.teacher : '')], []];
    const ws = X.utils.aoa_to_sheet(title.concat([head], body, [avg]));
    ws['!cols'] = [{ wch: 4 }, { wch: 30 }].concat(head.slice(2).map(() => ({ wch: 12 })));
    if (ar) ws['!views'] = [{ RTL: true }];
    let nm = String(sh.cls.name).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 28) || 'Class'; while (used.has(nm)) nm = nm.slice(0, 26) + '_' + used.size; used.add(nm);
    X.utils.book_append_sheet(wb, ws, nm);
  }
  const name = 'Spreadsheet-' + (classes.length === 1 ? fileSafe(classes[0].name) : 'All-classes') + '-' + fileSafe(D.data.term.name) + '.xlsx';
  const r = await N.saveFile({ name, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: X.write(wb, { type: 'base64', bookType: 'xlsx' }) }); if (r) toast(t('تم حفظ الملف', 'File saved'));
}
SCREENS.print = async p => {
  const d = D.data, approved = s => d.ap.has(s.id);
  const open = d.classes.find(c => c.id === +p.classId);
  const body = (d.classes.length ? '<section class="c pad row" id="sheetcard"><div style="width:48px;height:48px;border-radius:14px;background:var(--side);color:#F5C451;display:flex;align-items:center;justify-content:center">' + ic('list') + '</div>' +
      '<div class="grow" style="min-width:200px"><b style="font-size:17px">' + t('الكشف التجميعي (Spreadsheet)', 'Class spreadsheet') + '</b><br><span class="mu" style="font-size:13px">' + t('كل طلاب الفصل والمواد والمجموع والنسبة والترتيب في ورقة عرضية A4 أو A3 — بلغة كل قسم', 'Every student, subject, total, % and rank on one landscape page (A4 or A3) — in each section\'s language') + '</span></div>' +
      '<div class="chips" style="margin:0">' + ['A4', 'A3'].map(k => '<button class="chip en' + (sheetPaper() === k ? ' on' : '') + '" data-paper="' + k + '">' + k + '</button>').join('') + '</div><button class="btn g" id="shx">' + ic('down', 's') + 'Excel</button><button class="btn" id="shall">' + ic('pdf', 's') + t('كل الفصول PDF', 'All classes PDF') + '</button></section>' : '') +
    '<p class="mu" style="margin:0">' + t('تظهر هنا الشهادات التي اعتمدها المدير. اطبع على ورق A4، ثم التوقيع والختم باليد.', 'Results approved by the principal appear here. Print on A4, then sign and stamp by hand.') + '</p>' +
    (d.classes.length ? d.classes.map(c => { const studs = d.studsOf(c.id), ok = studs.filter(approved), all = studs.length && ok.length === studs.length;
      return '<div class="c pad row"' + (ok.length ? '' : ' style="opacity:.65"') + '><div style="width:48px;height:48px;border-radius:14px;background:' + (ok.length ? 'var(--side)' : 'var(--soft)') + ';color:' + (ok.length ? '#F5C451' : 'var(--mute)') + ';display:flex;align-items:center;justify-content:center">' + ic(ok.length ? 'rep' : 'lock', 'l') + '</div>' +
        '<div class="grow" style="min-width:180px"><b class="en" style="font-size:17px">' + E(c.name) + '</b><br><span class="mu" style="font-size:13px">' + stageOf(c) + ' · ' + ok.length + ' / ' + studs.length + ' ' + t('شهادة معتمدة', 'approved') + (all ? ' · ' + t('الفصل كامل', 'whole class') : '') + '</span></div>' +
        '<button class="btn g" data-sheet="' + c.id + '" title="' + t('الكشف التجميعي', 'Spreadsheet') + '">' + ic('list', 's') + t('الكشف', 'Spreadsheet') + '</button>' +
        (ok.length ? '<button class="btn g" data-pick="' + c.id + '">' + ic('list', 's') + t('اختيار طالب', 'One student') + '</button><button class="btn" data-pdf="' + c.id + '">' + ic('pdf', 's') + t('PDF الفصل (' + ok.length + ')', 'Class PDF (' + ok.length + ')') + '</button>' : '<span class="tag">' + t('بانتظار الاعتماد', 'Awaiting approval') + '</span>') + '</div>' +
        (open && open.id === c.id ? '<section class="c pad"><div class="chips">' + ok.map(s => '<button class="chip en" data-one="' + s.id + '">' + ic('pdf', 's') + ' ' + E(s.name) + '</button>').join('') + '</div></section>' : ''); }).join('') : noClasses());
  return { title: t('الطباعة', 'Printing'), sub: t('PDF لكل طالب أو ملف واحد للفصل', 'A PDF per student, or one file for the class'), body, bind(m) {
    $$('[data-pdf]', m).forEach(b => b.onclick = () => { const c = d.cls.get(+b.dataset.pdf); printClass(c, d.studsOf(c.id).filter(approved)); });
    $$('[data-sheet]', m).forEach(b => b.onclick = () => printSheets([d.cls.get(+b.dataset.sheet)]));
    const sa = $('#shall', m); if (sa) sa.onclick = () => printSheets(d.classes.slice());
    $$('[data-paper]', m).forEach(b => b.onclick = () => { try { localStorage.setItem('ooz-marks-paper', b.dataset.paper); } catch (e) {} $$('[data-paper]', m).forEach(x => x.classList.toggle('on', x === b)); toast(t('مقاس الكشف: ', 'Spreadsheet paper: ') + b.dataset.paper); });
    const sx = $('#shx', m); if (sx) sx.onclick = () => run(() => excelSheets(d.classes.slice()));
    $$('[data-pick]', m).forEach(b => b.onclick = () => { D.view.params = { classId: +b.dataset.pick === +p.classId ? 0 : +b.dataset.pick }; render(); });
    $$('[data-one]', m).forEach(b => b.onclick = () => { const s = d.stu.get(+b.dataset.one); printClass(d.cls.get(s.classId), [s], true); });
  } };
};

/* ---------- settings ---------- */
SCREENS.settings = async () => {
  const st = ST(), me = D.me, stt = me.school.status, bands = st.bands.slice().sort((a, b) => b.from - a.from);
  const radio = (name, opts, val) => '<div class="radio">' + opts.map(([v, a, e]) => '<label class="' + (v === val ? 'on' : '') + '"><input type="radio" name="' + name + '" value="' + v + '"' + (v === val ? ' checked' : '') + '><span>' + t(a, e) + '</span></label>').join('') + '</div>';
  const terms = me.terms || [];
  const body = '<div class="cards">' +
    '<section class="c pad col"><h2>' + t('هوية الشهادة', 'Report identity') + '</h2><div class="row"><button class="pick" id="logo" aria-label="' + t('الشعار', 'Logo') + '">' + (me.logo ? '<img src="' + me.logo + '" alt="">' : ic('up', 'l') + '<span>' + t('الشعار', 'Logo') + '</span>') + '</button><span class="mu grow" style="font-size:13px;line-height:1.7">' + t('يظهر أعلى الشهادة وكعلامة مائية باهتة في الخلفية', 'Shown at the top and as a faint watermark') + (me.logo ? '<br><button class="btn g sm" id="nologo" style="margin-top:6px">' + t('إزالة', 'Remove') + '</button>' : '') + '</span></div>' +
    '<div class="f"><label for="sn">' + t('اسم المدرسة', 'School name') + '</label><input id="sn" dir="ltr" value="' + E(st.schoolName) + '"></div><div class="f"><label for="cu">' + t('المنهج', 'Curriculum') + '</label><input id="cu" dir="ltr" value="' + E(st.curriculum) + '"></div>' +
    '<div class="f"><label for="ft">' + t('العنوان والإيميل (أسفل الشهادة)', 'Address and email (page footer)') + '</label><input id="ft" dir="ltr" value="' + E(st.footer) + '"></div><label class="check"><input type="checkbox" id="wm"' + (st.watermark ? ' checked' : '') + '><span>' + t('علامة مائية بالشعار', 'Logo watermark') + '</span></label></section>' +
    '<section class="c pad col"><h2>' + t('عنوان القسم حسب المرحلة', 'Department line by stage') + '</h2>' + ['primary', 'lower', 'secondary'].map(k => '<div class="f"><label for="dp-' + k + '">' + stageName(k) + '</label><input id="dp-' + k + '" dir="ltr" value="' + E(st.departments[k]) + '"></div>').join('') +
    '<h2 style="margin-top:6px">' + t('الفصول الدراسية', 'Terms') + '</h2><div class="list">' + terms.map(x => '<div class="li" style="cursor:default"><span class="mid"><b class="en">' + E(termLabel(x)) + '</b><small>' + (x.current ? t('الحالي', 'Current') : '') + (x.locked ? ' · ' + t('مقفل', 'Locked') : '') + '</small></span>' + (x.current ? '' : '<button class="btn g sm" data-cur="' + x.id + '">' + t('اجعله الحالي', 'Make current') + '</button>') + '<button class="ib sm" data-term="' + x.id + '" aria-label="' + t('تعديل', 'Edit') + '">' + ic('edit', 's') + '</button></div>').join('') + '</div><button class="btn g sm" id="addterm" style="align-self:flex-start">' + ic('plus', 's') + t('فصل دراسي جديد', 'New term') + '</button></section>' +
    '<section class="c pad col"><h2>' + t('سلم التقديرات', 'Grading scale') + '</h2><div class="tw"><table><thead><tr><th>' + t('التقدير', 'Grade') + '</th><th>' + t('من %', 'From %') + '</th><th>' + t('الوصف', 'Description') + '</th></tr></thead><tbody>' + bands.map((b, i) => '<tr><td><input class="inp en" data-bg="' + i + '" value="' + E(b.g) + '" style="width:64px;min-height:36px"></td><td><input class="inp en" data-bf="' + i + '" type="number" value="' + b.from + '" style="width:80px;min-height:36px"' + (b.from === 0 ? ' disabled' : '') + '></td><td><input class="inp en" data-bl="' + i + '" value="' + E(b.label) + '" style="min-height:36px;width:150px"></td></tr>').join('') + '</tbody></table></div></section>' +
    arSettings(st) +
    '<section class="c pad col"><h2>' + t('قواعد الحساب', 'Calculation rules') + '</h2><b style="font-size:14px">' + t('متى تُعتبر المادة راسبة (باللون الأحمر)؟', 'When is a subject failed (shown red)?') + '</b>' + radio('fail', [['band', 'تحت ' + (bands[bands.length - 2] || { from: 40 }).from + '% (أقل تقدير في السلم)', 'Below ' + (bands[bands.length - 2] || { from: 40 }).from + '% (lowest grade)'], ['min', 'تحت الحد الأدنى للمادة (Min. Marks)', 'Below the subject’s Min. Marks']], st.failRule) +
    '<b style="font-size:14px">' + t('الكسور قبل تحديد التقدير', 'Rounding before grading') + '</b>' + radio('round', [['none', 'بدون تقريب (89.6% = A)', 'No rounding (89.6% = A)'], ['one', 'تقريب لرقم عشري واحد', 'One decimal'], ['whole', 'لأقرب رقم صحيح (89.6% = 90% = A*)', 'Whole number (89.6% = 90% = A*)']], st.rounding) +
    '<b style="font-size:14px">' + t('الغائب (Abs) — تظهر Abs مكان الدرجة في الشهادة', 'Absent (Abs) — the report shows Abs in place of the mark') + '</b>' + radio('abs', [['zero', 'تُحسب درجته صفراً في المجموع', 'Counts as zero in the total'], ['exclude', 'لا تُحسب المادة في مجموعه', 'Subject left out of the total']], st.absRule) + '</section>' +
    '<section class="c pad col"><h2>' + t('التعليقات', 'Comments') + '</h2><label class="check"><input type="checkbox" id="chk"' + (st.checkComments ? ' checked' : '') + '><span>' + t('تنبيه إذا تعارض التعليق مع الدرجات أو ذكر اسم طالب آخر', 'Warn when a comment contradicts the marks or names another student') + '</span></label><label class="check"><input type="checkbox" id="dup"' + (st.checkDuplicates ? ' checked' : '') + '><span>' + t('تنبيه إذا تكرر نفس التعليق لأكثر من طالب', 'Warn when the same comment is used twice') + '</span></label>' +
    '<div class="f"><label for="bank">' + t('بنك التعليقات (جملة في كل سطر)', 'Comment bank (one sentence per line)') + '</label><textarea id="bank" dir="ltr" rows="7">' + E(st.commentBank.join('\n')) + '</textarea></div></section>' +
    '<section class="c pad col"><h2>' + t('بيانات المدرسة لبرامج Ooz', 'School data for the Ooz programs') + '</h2><span class="mu" style="font-size:13px;line-height:1.7">' + t('ملف واحد ينقل الفصول والمواد والمعلمين والطلاب (والنتائج) بين Ooz Marks و Timetable Studio و School Manager. الاستيراد يضيف ويحدّث فقط.', 'One file moves classes, subjects, teachers and students (and results) between Ooz Marks, Timetable Studio and School Manager. Importing only adds and updates.') + '</span><div class="row"><button class="btn" id="suiteOut">' + ic('down', 's') + t('تصدير بيانات المدرسة', 'Export school data') + '</button><button class="btn g" id="suiteIn">' + ic('up', 's') + t('استيراد بيانات المدرسة', 'Import school data') + '</button></div></section>' +
    '<section class="c pad col" style="background:var(--side);border-color:var(--side);color:#FBEEE2"><h2 style="color:#F5C451">' + t('الترخيص', 'Licence') + '</h2><span>' + (stt.state === 'licensed' ? t('مفعّل حتى ', 'Active until ') + new Date(stt.until).toLocaleDateString(ar() ? 'ar-EG-u-nu-latn' : 'en-GB') : stt.state === 'trial' ? t('نسخة تجريبية كاملة: باقٍ ' + stt.daysLeft + ' يوماً من 30', 'Full trial: ' + stt.daysLeft + ' of 30 days left') : t('انتهت التجربة: النظام للعرض فقط', 'Trial ended: view only')) + '</span>' +
    '<span style="color:#D9CFC2;font-size:13px;line-height:1.7">' + t('رمز مدرستك: ', 'Your school code: ') + '<b class="en" style="color:#F5C451">' + E(me.school.code) + '</b>. ' + t('للتفعيل تواصل مع Ooz apps على واتساب ‎+249 91 260 6138‎ وأرسل هذا الرمز.', 'To activate, contact Ooz apps on WhatsApp +249 91 260 6138 with this code.') + '</span>' +
    '<div class="col" style="gap:6px;padding:10px 12px;border-radius:12px;background:#211F1C"><span style="color:#D9CFC2;font-size:13px">' + t('رابط الدخول من المتصفح (آيفون، ماك، أي جهاز بلا تطبيق):', 'Sign-in link for a browser (iPhone, Mac, any device without the app):') + '</span>' +
    '<div class="row"><b class="en ltr grow" style="color:#F5C451;font-size:13px;word-break:break-all">' + E(webLink(me.school.code)) + '</b><button class="btn g" id="wlink" style="min-height:36px">' + ic('copy', 's') + t('نسخ', 'Copy') + '</button></div></div>' +
    '<div class="row"><input class="inp en ltr grow" id="lk" placeholder="20271231-XXXXXXXXXX" style="background:#211F1C;color:#FBEEE2;border-color:#3D3A35"><button class="btn" id="act">' + ic('key', 's') + t('تفعيل', 'Activate') + '</button></div></section>' +
    '<section class="c pad col"><h2>' + t('حسابي', 'My account') + '</h2><span>' + E(me.user.name) + ' · <span class="en">' + E(me.user.username) + '</span></span><div class="row"><button class="btn g" id="pw">' + ic('key', 's') + t('تغيير كلمة المرور', 'Change password') + '</button><button class="btn g" id="log">' + ic('list', 's') + t('سجل التعديلات', 'Change log') + '</button><button class="btn d" id="out">' + ic('out', 's') + t('خروج', 'Sign out') + '</button></div><span class="mu" style="font-size:12px">Ooz Marks ' + VERSION + ' · ' + t('تصميم م. أسامة أبو الحسن', 'Designed by Eng. Osama Abu Elhassan') + '</span></section>' +
    '</div><div class="sticky"><button class="btn" id="saveall" style="width:100%">' + ic('check') + t('حفظ الإعدادات', 'Save settings') + '</button></div>';
  return { title: t('الإعدادات', 'Settings'), sub: t('هوية الشهادة وسلم التقديرات وقواعد الحساب', 'Report identity, grading scale and rules'), body, bind(m) {
    let logo = null;
    $$('.radio input', m).forEach(r => r.onchange = () => $$('input[name="' + r.name + '"]', m).forEach(x => x.parentElement.classList.toggle('on', x.checked)));
    $('#logo', m).onclick = async () => { const f = await N.pickImage(); if (!f) return; try { logo = await toPng(f.dataURL, 600); $('#logo', m).innerHTML = '<img src="' + logo + '" alt="">'; toast(t('اضغط «حفظ الإعدادات»', 'Press “Save settings”')); } catch (e) { toast(t('تعذّرت قراءة الصورة', 'Could not read the image'), true); } };
    const nl = $('#nologo', m); if (nl) nl.onclick = () => { logo = ''; $('#logo', m).innerHTML = ic('up', 'l'); };
    $('#saveall', m).onclick = async () => {
      const bands = $$('[data-bg]', m).map((x, i) => ({ g: x.value.trim(), from: +($('[data-bf="' + i + '"]', m).value || 0), label: $('[data-bl="' + i + '"]', m).value.trim() }));
      const s = { schoolName: $('#sn', m).value, curriculum: $('#cu', m).value, footer: $('#ft', m).value, watermark: $('#wm', m).checked, departments: { primary: $('#dp-primary', m).value, lower: $('#dp-lower', m).value, secondary: $('#dp-secondary', m).value },
        bands, failRule: ($('input[name=fail]:checked', m) || {}).value, rounding: ($('input[name=round]:checked', m) || {}).value, absRule: ($('input[name=abs]:checked', m) || {}).value,
        checkComments: $('#chk', m).checked, checkDuplicates: $('#dup', m).checked, commentBank: $('#bank', m).value.split('\n').map(x => x.trim()).filter(Boolean),
        ar: { lines: [$('#al1', m).value, $('#al2', m).value], basmala: $('#abs', m).checked, color: $('#acol', m).value, stages: { primary: $('#ast-primary', m).value, lower: $('#ast-lower', m).value, secondary: $('#ast-secondary', m).value },
          bands: $$('[data-abl]', m).map((x, i) => ({ label: x.value.trim(), from: +($('[data-abf="' + i + '"]', m).value || 0) })).filter(x => x.label), signs: $('#asg', m).value.split('،').concat([]).join(',').split(',').map(x => x.trim()).filter(Boolean) } };
      await run(() => api('saveSettings', logo == null ? { settings: s } : { settings: s, logo }), t('تم الحفظ', 'Saved')); await reloadMe(); render();
    };
    $$('[data-cur]', m).forEach(b => b.onclick = async () => { await run(() => api('setCurrentTerm', { id: +b.dataset.cur }), t('تم', 'Done')); await reloadMe(); await load(); render(); });
    $$('[data-term]', m).forEach(b => b.onclick = () => termDialog(terms.find(x => x.id === +b.dataset.term)));
    $('#addterm', m).onclick = () => termDialog(null);
    $('#suiteOut', m).onclick = () => go('suite', { view: 'export' }); $('#suiteIn', m).onclick = () => go('suite', { view: 'import', fresh: true });
    const wl = $('#wlink', m); if (wl) wl.onclick = async () => { const ok = await N.copy(webLink(D.me.school.code)); toast(ok === false ? webLink(D.me.school.code) : t('تم نسخ الرابط', 'Link copied')); };
    $('#act', m).onclick = async () => { const k = $('#lk', m).value.trim(); if (!k) return; await run(() => api('activate', { key: k }), t('تم التفعيل. شكراً لك', 'Activated. Thank you')); await reloadMe(); render(); };
    $('#pw', m).onclick = () => showPassword(false); $('#out', m).onclick = logout; $('#log', m).onclick = auditDialog;
  } };
};
/* The Arabic section's report: header lines, stage names, grade words, signatures. */
function arSettings(st) {
  const a = st.ar, bands = a.bands.slice().sort((x, y) => y.from - x.from);
  return '<section class="c pad col"><h2>' + t('شهادة القسم العربي', 'Arabic section report') + '</h2><p class="mu" style="margin:0;font-size:13px">' + t('للفصول التي قسمها «العربي». المواد ودرجاتها تختلف من فصل لآخر.', 'For classes in the Arabic section. Subjects and marks differ from class to class.') + '</p>' +
    '<label class="check"><input type="checkbox" id="abs"' + (a.basmala ? ' checked' : '') + '><span>بسم الله الرحمن الرحيم</span></label>' +
    '<div class="f"><label for="al1">' + t('السطر الأول', 'First line') + '</label><input id="al1" dir="rtl" value="' + E(a.lines[0] || '') + '"></div>' +
    '<div class="f"><label for="al2">' + t('اسم المدرسة والقسم', 'School and section') + '</label><input id="al2" dir="rtl" value="' + E(a.lines[1] || '') + '"></div>' +
    '<div class="grid2">' + ['primary', 'lower', 'secondary'].map(k => '<div class="f"><label for="ast-' + k + '">' + t('اسم المرحلة: ', 'Stage: ') + stageName(k) + '</label><input id="ast-' + k + '" dir="rtl" value="' + E(a.stages[k]) + '"></div>').join('') +
    '<div class="f"><label for="acol">' + t('لون الشهادة', 'Report colour') + '</label><input id="acol" type="color" value="' + E(a.color) + '" style="min-height:44px;padding:4px"></div></div>' +
    '<b style="font-size:14px">' + t('التقديرات (تُستعمل أيضاً للمواد التي تُقيَّم بتقدير)', 'Grade words (also used for subjects graded by a word)') + '</b>' +
    '<div class="tw"><table><thead><tr><th>' + t('التقدير', 'Grade') + '</th><th>' + t('من %', 'From %') + '</th></tr></thead><tbody>' + bands.map((b, i) => '<tr><td><input class="inp" dir="rtl" data-abl="' + i + '" value="' + E(b.label) + '" style="min-height:36px"></td><td><input class="inp en" data-abf="' + i + '" type="number" value="' + b.from + '" style="width:90px;min-height:36px"></td></tr>').join('') +
    '<tr><td><input class="inp" dir="rtl" data-abl="' + bands.length + '" placeholder="' + t('تقدير جديد', 'New grade') + '" style="min-height:36px"></td><td><input class="inp en" data-abf="' + bands.length + '" type="number" style="width:90px;min-height:36px"></td></tr></tbody></table></div>' +
    '<div class="f"><label for="asg">' + t('خانات التوقيع (افصل بفاصلة)', 'Signature boxes (separate with commas)') + '</label><input id="asg" dir="rtl" value="' + E(a.signs.join('، ')) + '"></div></section>';
}
function termDialog(x) {
  dialog('<h2>' + (x ? t('تعديل الفصل الدراسي', 'Edit term') : t('فصل دراسي جديد', 'New term')) + '</h2><div class="f"><label for="tn">' + t('الاسم (يظهر في الشهادة)', 'Name (on the report)') + '</label><input id="tn" dir="ltr" value="' + E(x ? x.name : 'SECOND TERM') + '"></div><div class="f"><label for="ty">' + t('العام الدراسي', 'Academic year') + '</label><input id="ty" dir="ltr" value="' + E(x ? x.year : (D.data.term || {}).year || '') + '"></div>' +
    '<div class="f"><label for="tar">' + t('العنوان في شهادة القسم العربي', 'Title on the Arabic section report') + '</label><input id="tar" dir="rtl" placeholder="نتيجة امتحانات الفترة الأولى – يناير 2026" value="' + E(x ? x.titleAr || '' : '') + '"></div>' +
    (x ? '<label class="check"><input type="checkbox" id="tl"' + (x.locked ? ' checked' : '') + '><span>' + t('مقفل: لا يعدّل المعلمون شيئاً فيه', 'Locked: teachers cannot change anything') + '</span></label>' : '<p class="mu" style="margin:0">' + t('كل فصل دراسي نتيجته منفصلة، ويبدأ بدرجات فارغة.', 'Each term has its own results and starts empty.') + '</p>') +
    '<div class="acts"><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>', (o, close) => {
    $('[data-x]', o).onclick = close;
    $('[data-ok]', o).onclick = async () => { const r = await run(() => api('saveTerm', { id: x && x.id, name: $('#tn', o).value, year: $('#ty', o).value, titleAr: $('#tar', o).value, locked: x ? $('#tl', o).checked : false })); close();
      if (!x && await confirmBox(t('اجعله الفصل الحالي؟', 'Make it the current term?'))) await run(() => api('setCurrentTerm', { id: r.id })); await reloadMe(); await load(); render(); };
  });
}
async function auditDialog() {
  const r = await run(() => api('auditLog'));
  const name = { mark: t('تعديل درجة', 'Mark changed'), approve: t('اعتماد', 'Approved'), reopen: t('إعادة فتح مادة', 'Subject reopened'), importStudents: t('استيراد طلاب', 'Students imported'), deleteClass: t('حذف فصل', 'Class deleted'), deleteSubject: t('حذف مادة', 'Subject deleted'), deleteStudent: t('حذف طالب', 'Student deleted') };
  const d = D.data;
  dialog('<h2>' + t('سجل التعديلات', 'Change log') + '</h2>' + (r.items.length ? '<div class="list">' + r.items.map(x => '<div class="li" style="cursor:default;align-items:flex-start"><span class="mid"><b>' + E(name[x.action] || x.action) + (x.action === 'mark' ? ' · <span class="en">' + E((d.stu.get(x.detail.student) || {}).name || '') + ' · ' + E((d.subjects.find(s => s.id === x.detail.subject) || {}).name || '') + ': ' + E(x.detail.from == null ? '—' : x.detail.from) + ' → ' + E(x.detail.to == null ? '—' : x.detail.to) + '</span>' : '') + '</b><small>' + E(x.by || '') + ' · ' + new Date(x.at).toLocaleString(ar() ? 'ar-EG-u-nu-latn' : 'en-GB') + '</small></span></div>').join('') + '</div>' : '<p class="mu">' + t('لا شيء بعد', 'Nothing yet') + '</p>') + '<div class="acts"><button class="btn" data-x>' + t('إغلاق', 'Close') + '</button></div>', (o, close) => { $('[data-x]', o).onclick = close; });
}
function toPng(dataURL, max) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/png')); }; im.onerror = rej; im.src = dataURL; });
}

/* ---------- teachers ---------- */
SCREENS.suite = async p => (SCREENS._su = SCREENS._su || OozSuiteInit({ D, t, E, ic, api, render, $, $$, run, toast, N: window.N, go, dialog, confirmBox, load, tab, VERSION, schoolName: () => ST().schoolName || D.me.school.name }))(p);
SCREENS.analysis = async p => (SCREENS._an = SCREENS._an || OozAnalysisInit({ D, t, E, ic, ST, api, render, $, $$, run, toast, N: window.N, stageOf, termLabel, nameOf, fileSafe }))(p);
SCREENS.mine = async () => {
  const d = D.data, me = D.me.user.id, mine = d.subjects.filter(s => s.teacherId === me), cts = d.classes.filter(c => c.classTeacherId === me && !isAr(c));
  let need = 0, done = 0; mine.forEach(s => { const e = entered(s); need += e.need; done += e.done; });
  const cneed = cts.reduce((a, c) => a + d.studsOf(c.id).length, 0), cdone = cts.reduce((a, c) => a + d.studsOf(c.id).filter(s => (d.cm.get(s.id) || {}).text).length, 0);
  const pct = need + cneed ? Math.round((done + cdone) / (need + cneed) * 100) : 100;
  const card = s => { const e = entered(s), c = d.cls.get(s.classId), sent = d.sb.has(s.id);
    const st = sent ? ['ok', 'تم الإرسال', 'Sent'] : e.done === 0 ? ['', 'لم يبدأ', 'Not started'] : e.done === e.need ? ['in', 'جاهز للإرسال', 'Ready to send'] : ['wa', 'جارٍ الإدخال', 'In progress'];
    return '<button class="c pad col" data-sub="' + s.id + '" style="text-align:start;cursor:pointer;color:var(--ink);gap:10px"><div class="row" style="flex-wrap:nowrap"><div style="width:48px;height:48px;border-radius:14px;background:var(--side);color:#F5C451;display:flex;align-items:center;justify-content:center;flex:none">' + ic('rep', 'l') + '</div><div class="grow"><b class="en" style="font-size:17px">' + E(s.name) + ' · ' + E(c.name) + '</b><br><span class="mu en" style="font-size:12px">' + stageOf(c) + ' · /' + s.max + '</span></div><span class="tag ' + st[0] + '">' + t(st[1], st[2]) + '</span></div>' + bar(e.need ? Math.round(e.done / e.need * 100) : 0) + '</button>'; };
  const body = '<section class="c pad row" style="background:var(--side);border-color:var(--side);color:#FBEEE2;flex-wrap:nowrap"><div class="grow"><span style="font-size:13px;color:#D9CFC2">' + t('مطلوب منك', 'Still to do') + '</span><br><b style="font-size:17px">' + (need - done) + ' ' + t('درجة', 'marks') + (cts.length ? ' · ' + (cneed - cdone) + ' ' + t('تعليقاً', 'comments') : '') + '</b></div><b class="en" style="font-size:30px;color:#F5C451">' + pct + '%</b></section>' +
    (mine.length ? '<h2>' + t('موادي وفصولها', 'My subjects and classes') + '</h2><div class="cards">' + mine.map(card).join('') + '</div>' : '<div class="empty">' + t('لم يُسند لك المدير أي مادة بعد', 'The principal has not assigned you a subject yet') + '</div>') +
    cts.map(c => '<button class="c pad row" data-ct="' + c.id + '" style="cursor:pointer;color:var(--ink);background:var(--hi);border-color:var(--gold);flex-wrap:nowrap;text-align:start">' + ic('chat', 'l') + '<span class="grow"><b>' + t('أنت مربي فصل ', 'You are class teacher of ') + '<span class="en">' + E(c.name) + '</span></b><br><span class="mu" style="font-size:13px">' + t('اكتب تعليقات الطلاب', 'Write the students’ comments') + ' · ' + d.studsOf(c.id).filter(s => (d.cm.get(s.id) || {}).text).length + '/' + d.studsOf(c.id).length + '</span></span>' + ic('next', 'flip') + '</button>').join('');
  return { title: t('مرحباً، ', 'Hello, ') + E(D.me.user.name), sub: E(termLabel(d.term)), body, bind(m) {
    $$('[data-sub]', m).forEach(b => b.onclick = () => go('entry', { subjectId: +b.dataset.sub }));
    $$('[data-ct]', m).forEach(b => b.onclick = () => { D.lastCt = +b.dataset.ct; tab('comments'); });
  } };
};
SCREENS.entry = async p => {
  const d = D.data, s = d.subjects.find(x => x.id === +p.subjectId); if (!s) { tab('mine'); return { title: '', body: '' }; }
  const word = s.kind === 'grade';
  const c = d.cls.get(s.classId), studs = d.studsOf(c.id).filter(x => !(x.exempt || []).includes(s.id)), sent = d.sb.has(s.id), lockedTerm = d.term.locked, ro = sent || lockedTerm || D.me.school.status.state === 'expired';
  const row = (x, i) => { const m = d.mk.get(x.id + ':' + s.id) || {}, ap = d.ap.has(x.id);
    return '<div class="mrow" data-row="' + x.id + '"><span class="mu en" style="width:22px;font-size:12px">' + (i + 1) + '</span><span class="nm">' + E(x.name) + '</span><span class="pc" data-pc="' + x.id + '"></span>' +
      (word ? '<select class="mark gsel" data-mark="' + x.id + '" aria-label="' + E(x.name) + '"' + (ro || ap || m.abs ? ' disabled' : '') + '><option value="">—</option>' + gradeWords().map(g => '<option' + (m.grade === g && !m.abs ? ' selected' : '') + '>' + E(g) + '</option>').join('') + '</select>'
        : '<input class="mark" data-mark="' + x.id + '" inputmode="decimal" aria-label="' + E(x.name) + '" value="' + (m.abs || m.value == null ? '' : m.value) + '"' + (ro || ap || m.abs ? ' disabled' : '') + '>') + '<button class="absb' + (m.abs ? ' on' : '') + '" data-abs="' + x.id + '"' + (ro || ap ? ' disabled' : '') + '>Abs</button></div>'; };
  const body = '<div class="row"><span class="tag dk" style="min-height:32px">' + (word ? t('تقدير لكل طالب', 'A grade word for each student') : '/' + s.max + ' · ' + (isAr(c) ? t('درجة النجاح ', 'pass ') : t('الحد الأدنى ', 'min ')) + s.min) + '</span><span class="mu grow" id="cnt"></span></div>' +
    (ro ? '<div class="lock">' + ic('lock', 's') + (sent ? t('أرسلت هذه الدرجات. التعديل الآن عند المدير فقط.', 'You sent these marks. Only the principal can change them now.') : lockedTerm ? t('هذا الفصل الدراسي مقفل.', 'This term is locked.') : t('انتهت التجربة: للعرض فقط.', 'Trial ended: view only.')) + '</div>' : '<div class="note">' + ic('check', 's') + t('تُحفظ كل درجة تلقائياً. اكتب الدرجة أو اضغط Abs للغائب.', 'Each mark saves by itself. Type the mark, or press Abs for an absent student.') + '</div>') +
    '<section class="c pad" style="padding-top:4px;padding-bottom:4px">' + (studs.map(row).join('') || '<p class="mu">' + t('لا يوجد طلاب', 'No students') + '</p>') + '</section>' +
    (ro ? '' : '<div class="sticky col" style="gap:6px"><span class="mu" style="font-size:12px;text-align:center">' + t('بعد الإرسال لا يمكن التعديل إلا من المدير', 'After sending, only the principal can change marks') + '</span><button class="btn" id="send" style="width:100%;min-height:52px;font-size:16px">' + ic('check') + '<span id="sendt"></span></button></div>');
  return { title: E(s.name) + ' · ' + E(c.name), sub: stageOf(c), body, bind(m) {
    const pending = new Map(); let timer = null, saving = Promise.resolve();
    const local = id => { const inp = $('[data-mark="' + id + '"]', m), ab = $('[data-abs="' + id + '"]', m); return { abs: ab.classList.contains('on'), raw: inp.value.trim() }; };
    const paint = () => {
      let n = 0;
      for (const x of studs) {
        const v = local(x.id), inp = $('[data-mark="' + x.id + '"]', m), pc = $('[data-pc="' + x.id + '"]', m);
        const num = v.raw === '' ? null : Number(v.raw.replace(',', '.')); const bad = v.raw !== '' && (!isFinite(num) || num < 0 || num > s.max);
        inp.classList.toggle('bad', bad); inp.classList.toggle('empty', !v.abs && v.raw === '' && !ro);
        if (v.abs) { pc.textContent = 'Abs'; pc.className = 'pc'; n++; inp.classList.remove('fail'); continue; }
        if (word) { inp.classList.toggle('empty', v.raw === '' && !ro); pc.textContent = ''; pc.className = 'pc'; if (v.raw) n++; continue; }
        if (num == null || bad) { pc.textContent = bad ? t('خارج المدى', 'Out of range') : '—'; pc.className = 'pc' + (bad ? ' fail' : ''); inp.classList.remove('fail'); continue; }
        n++; const r = OozCalc.student(ST(), [s], { id: x.id }, new Map([[x.id + ':' + s.id, { value: num }]]), c.section).rows[0];
        pc.textContent = OozCalc.show(ST(), r.pct) + '% · ' + r.grade; pc.className = 'pc' + (r.fail ? ' fail' : ''); inp.classList.toggle('fail', r.fail);
      }
      $('#cnt', m).textContent = n + ' / ' + studs.length;
      const sb = $('#send', m); if (sb) { sb.disabled = n < studs.length; $('#sendt', m).textContent = n < studs.length ? t('إرسال الدرجات (باقٍ ' + (studs.length - n) + ')', 'Send marks (' + (studs.length - n) + ' left)') : t('إرسال الدرجات للمدير', 'Send marks to the principal'); }
    };
    const flush = () => { if (!pending.size) return saving; const entries = [...pending.values()]; pending.clear();
      saving = saving.then(() => api('saveMarks', { termId: d.term.id, subjectId: s.id, entries }).then(() => { entries.forEach(e => d.mk.set(e.studentId + ':' + s.id, { studentId: e.studentId, subjectId: s.id, value: e.abs || word ? null : (e.value === '' ? null : +e.value), grade: word && !e.abs ? e.grade || null : null, abs: e.abs })); })
        .catch(e => { if (!e.silent) toast(errText(e), true); entries.forEach(x => pending.set(x.studentId, x)); })); return saving; };
    const queue = id => { const v = local(id); if (word) { pending.set(id, { studentId: id, grade: v.raw, abs: v.abs }); clearTimeout(timer); timer = setTimeout(flush, 400); return; } const num = v.raw === '' ? '' : Number(v.raw.replace(',', '.')); if (v.raw !== '' && (!isFinite(num) || num < 0 || num > s.max)) return; pending.set(id, { studentId: id, value: num, abs: v.abs }); clearTimeout(timer); timer = setTimeout(flush, 700); };
    $$('[data-mark]', m).forEach(inp => { inp.oninput = inp.onchange = () => { paint(); queue(+inp.dataset.mark); }; inp.onkeydown = e => { if (e.key === 'Enter') { const all = $$('[data-mark]:not([disabled])', m), i = all.indexOf(inp); if (all[i + 1]) all[i + 1].focus(); else inp.blur(); } }; });
    $$('[data-abs]', m).forEach(b => b.onclick = () => { const id = +b.dataset.abs, on = !b.classList.contains('on'); b.classList.toggle('on', on); const inp = $('[data-mark="' + id + '"]', m); inp.disabled = on; if (on) inp.value = ''; paint(); queue(id); });
    const sb = $('#send', m); if (sb) sb.onclick = async () => { clearTimeout(timer); await run(() => flush()); if (!(await confirmBox(t('إرسال درجات ' + E(s.name) + ' · ' + E(c.name) + ' للمدير؟ بعدها لا يمكنك التعديل.', 'Send ' + E(s.name) + ' · ' + E(c.name) + ' to the principal? You cannot edit afterwards.'), t('إرسال', 'Send')))) return;
      await run(() => api('submitMarks', { termId: d.term.id, subjectId: s.id }), t('تم الإرسال', 'Sent')); await load(d.term.id); render(); };
    D.leaving = () => { clearTimeout(timer); return flush(); };
    paint();
  } };
};
SCREENS.comments = async p => {
  const d = D.data, me = D.me.user.id, cts = d.classes.filter(c => !isAr(c) && (c.classTeacherId === me || D.me.user.role === 'admin'));
  const c = cts.find(x => x.id === +p.classId) || cts.find(x => x.id === D.lastCt) || cts[0];
  if (!c) return { title: t('التعليقات', 'Comments'), body: '<div class="empty">' + t('لست مربي فصل', 'You are not a class teacher') + '</div>' };
  D.lastCt = c.id;
  const studs = d.studsOf(c.id); const idx = Math.max(0, Math.min(studs.length - 1, p.i || 0)); const s = studs[idx];
  if (!s) return { title: t('التعليقات · ', 'Comments · ') + E(c.name), body: '<div class="empty">' + t('لا يوجد طلاب', 'No students') + '</div>' };
  const r = result(s), cm = d.cm.get(s.id) || {}, ap = d.ap.has(s.id), ro = ap || d.term.locked || D.me.school.status.state === 'expired';
  const done = studs.filter(x => (d.cm.get(x.id) || {}).text).length;
  const body = (cts.length > 1 ? '<div class="row">' + classSelect('cls', c.id, x => cts.includes(x)) + '</div>' : '') +
    '<div class="row"><span class="tag" style="min-height:32px">' + done + ' / ' + studs.length + ' ' + t('تعليقاً', 'comments') + '</span><span class="grow"></span><button class="ib" id="pv" aria-label="' + t('السابق', 'Previous') + '"' + (idx ? '' : ' disabled') + '>' + ic('prev', 'flip') + '</button><select class="inp" id="who" aria-label="' + t('الطالب', 'Student') + '">' + studs.map((x, i) => '<option value="' + i + '"' + (i === idx ? ' selected' : '') + '>' + (i + 1) + '. ' + E(x.name) + ((d.cm.get(x.id) || {}).text ? ' ✓' : '') + '</option>').join('') + '</select><button class="ib" id="nx" aria-label="' + t('التالي', 'Next') + '"' + (idx < studs.length - 1 ? '' : ' disabled') + '>' + ic('next', 'flip') + '</button></div>' +
    '<section class="c pad col"><div class="row"><b class="en grow" style="font-size:17px">' + E(s.name) + '</b><span class="en" style="font-weight:700;color:var(--goldd)">' + (r.total.pct == null ? '' : OozCalc.show(ST(), r.total.pct) + '% · ' + r.total.grade) + (r.complete ? '' : ' <span class="tag wa">' + t('درجات ناقصة', 'marks missing') + '</span>') + '</span></div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px">' + r.rows.map(x => '<div class="gchip' + (x.fail ? ' fail' : '') + '"><small>' + E(x.subject.name) + '</small><b>' + (x.abs ? 'Abs' : x.grade || '—') + '</b></div>').join('') + '</div></section>' +
    (cm.returned ? '<div class="note">' + ic('chat', 's') + '<span><b>' + t('ملاحظة المدير: ', 'Principal’s note: ') + '</b>' + E(cm.returned) + '</span></div>' : '') +
    (ap ? '<div class="lock">' + ic('lock', 's') + t('اعتمد المدير هذه النتيجة', 'The principal approved this result') + '</div>' : '') +
    '<div class="f"><label for="cm">Comment</label><textarea id="cm" dir="ltr" rows="6" class="en"' + (ro ? ' disabled' : '') + ' placeholder="' + E(s.name.split(' ')[0]) + ' …">' + E(cm.text || '') + '</textarea></div><div id="warns" class="col" style="gap:8px"></div>' +
    (ro ? '' : '<div class="f"><span class="lb">' + t('جمل جاهزة (اضغط لإضافتها)', 'Ready sentences (tap to add)') + '</span><div class="list">' + ST().commentBank.map((b, i) => '<button class="li en" data-bank="' + i + '" style="min-height:44px;direction:ltr;text-align:left;font-size:13px">+ ' + E(b) + '</button>').join('') + '</div></div>' +
      '<div class="sticky"><button class="btn" id="sv" style="width:100%;min-height:50px">' + ic('check') + (idx < studs.length - 1 ? t('حفظ والانتقال للتالي', 'Save and next') : t('حفظ', 'Save')) + '</button></div>');
  return { title: t('التعليقات · ', 'Comments · ') + '<span class="en">' + E(c.name) + '</span>', sub: t('تكتب هنا ويراجعها المدير قبل الاعتماد', 'Written here, reviewed by the principal before approval'), body, bind(m) {
    const ta = $('#cm', m), wv = $('#warns', m);
    const paint = () => { const ws = OozCheck.check(ta.value, { rows: r.rows, name: s.name, classNames: studs.filter(x => x.id !== s.id).map(x => x.name), top: topGrades(), others: ST().checkDuplicates ? studs.filter(x => x.id !== s.id).map(x => ({ name: x.name, text: (d.cm.get(x.id) || {}).text })) : null }).filter(w => w.type !== 'empty' && (ST().checkComments || w.type === 'duplicate'));
      wv.innerHTML = ws.map(w => '<div class="note bad">' + ic('warn', 's') + '<span>' + E(warnText(w)) + '</span></div>').join(''); ta.style.borderColor = ws.length ? 'var(--red)' : ''; };
    ta.oninput = paint; paint();
    const nav = i => { D.view.params = { classId: c.id, i }; render(); };
    const saveIt = async () => { if (ro) return; const v = ta.value.trim(); if (v === (cm.text || '') ) return; await run(() => api('saveComment', { termId: d.term.id, studentId: s.id, text: v })); d.cm.set(s.id, { studentId: s.id, text: v, returned: '' }); };
    $('#pv', m).onclick = async () => { await saveIt(); nav(idx - 1); }; $('#nx', m).onclick = async () => { await saveIt(); nav(idx + 1); };
    $('#who', m).onchange = async e => { await saveIt(); nav(+e.target.value); };
    const cl = $('#cls', m); if (cl) cl.onchange = async () => { await saveIt(); D.view.params = { classId: +cl.value, i: 0 }; render(); };
    $$('[data-bank]', m).forEach(b => b.onclick = () => { const x = ST().commentBank[+b.dataset.bank].replace(/\b(he|she)\b/gi, w => w); ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + x; paint(); ta.focus(); });
    const sv = $('#sv', m); if (sv) sv.onclick = async () => { await saveIt(); toast(t('تم الحفظ', 'Saved')); if (idx < studs.length - 1) nav(idx + 1); else { await load(d.term.id); render(); } };
    D.leaving = saveIt;
  } };
};
SCREENS.account = async () => {
  const me = D.me;
  const body = '<section class="c pad col"><div class="row"><div style="width:54px;height:54px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;color:var(--goldd)">' + ic('user', 'l') + '</div><div class="grow"><b style="font-size:17px">' + E(me.user.name) + '</b><br><span class="mu en">' + E(me.user.username) + ' · ' + E(me.school.name) + '</span></div></div>' +
    '<button class="btn g" id="pw">' + ic('key', 's') + t('تغيير كلمة المرور', 'Change password') + '</button><button class="btn g" id="th">' + ic(D.cfg.theme === 'dark' ? 'sun' : 'moon', 's') + (D.cfg.theme === 'dark' ? t('الوضع الفاتح', 'Light mode') : t('الوضع الداكن', 'Dark mode')) + '</button><button class="btn g" id="lg">' + ic('globe', 's') + (ar() ? 'English' : 'العربية') + '</button><button class="btn d" id="out">' + ic('out', 's') + t('خروج', 'Sign out') + '</button></section>' +
    '<div class="row" style="justify-content:center;flex-direction:column;gap:4px;color:var(--mute);font-size:12px;text-align:center">' + LOGO(56) + '<span>Ooz Marks ' + VERSION + '</span><span>' + t('تصميم م. أسامة أبو الحسن', 'Designed by Eng. Osama Abu Elhassan') + '</span></div>';
  return { title: t('حسابي', 'My account'), body, bind(m) {
    $('#pw', m).onclick = () => showPassword(false); $('#out', m).onclick = logout;
    $('#th', m).onclick = () => { D.cfg.theme = D.cfg.theme === 'dark' ? 'light' : 'dark'; save(); applyLook(); render(); };
    $('#lg', m).onclick = () => { D.cfg.lang = ar() ? 'en' : 'ar'; save(); applyLook(); render(); };
  } };
};

/* ---------- sign in, register, password, owner tools ---------- */
function authShell(inner) { $('#app').innerHTML = '<div class="auth"><div class="in"><div class="lg">' + LOGO(110) + '<b class="ltr">Ooz <span>Marks</span></b><small>' + t('نتائج الطلاب وشهاداتهم', 'Students’ results and report cards') + '</small></div>' + inner + '<div class="foot"><div class="row" style="justify-content:center"><button data-l>' + (ar() ? 'English' : 'العربية') + '</button><button data-t>' + (D.cfg.theme === 'dark' ? t('الوضع الفاتح', 'Light mode') : t('الوضع الداكن', 'Dark mode')) + '</button><button data-srv>' + t('الخادم', 'Server') + '</button></div><span data-own>' + t('تصميم م. أسامة أبو الحسن · Ooz apps', 'Designed by Eng. Osama Abu Elhassan · Ooz apps') + '</span></div></div></div>';
  $('[data-l]').onclick = () => { D.cfg.lang = ar() ? 'en' : 'ar'; save(); applyLook(); showAuth(D.authTab); };
  $('[data-t]').onclick = () => { D.cfg.theme = D.cfg.theme === 'dark' ? 'light' : 'dark'; save(); applyLook(); showAuth(D.authTab); };
  $('[data-srv]').onclick = () => dialog('<h2>' + t('عنوان الخادم', 'Server address') + '</h2><div class="f"><label for="srv">' + t('يعطيك إياه مزوّد النظام', 'Given by your provider') + '</label><input id="srv" dir="ltr" value="' + E(D.cfg.api) + '"></div><div class="acts"><button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button><button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>', (o, close) => { $('[data-x]', o).onclick = close; $('[data-ok]', o).onclick = () => { let v = $('#srv', o).value.trim().replace(/\/+$/, ''); if (v && !/^https?:\/\//.test(v)) v = 'https://' + v; D.cfg.api = v || API_DEFAULT; save(); close(); toast(t('تم الحفظ', 'Saved')); }; });
  if (WEB) $('[data-srv]').hidden = true;
  let taps = 0, tt; $('[data-own]').onclick = () => { taps++; clearTimeout(tt); tt = setTimeout(() => taps = 0, 2000); if (taps >= 5) { taps = 0; ownerTools(); } };
}
/* The demo: one tap signs in as any of the sample accounts. */
function showDemo() {
  const acc = (window.OozDemo && window.OozDemo.accounts) || [];
  authShell('<div class="card"><h2 style="margin:0;font-size:20px">' + t('نسخة تجريبية ببيانات جاهزة', 'Demo with sample data') + '</h2><p class="mu" style="margin:0;font-size:13px;line-height:1.7">' + t('مدرسة نموذجية فيها قسم إنجليزي وقسم عربي، ومعلمون وطلاب ودرجات. كل ما تغيّره يبقى على هذا الجهاز فقط. كلمة المرور لكل الحسابات: ', 'A sample school with an English and an Arabic section, teachers, students and marks. Your changes stay on this device. Password for every account: ') + '<b class="en">demo1234</b></p>' +
    acc.map(([u, ar, en]) => '<button class="btn ' + (u === 'admin' ? '' : 'g') + ' wide" data-demo="' + u + '" style="justify-content:space-between"><span>' + E(t(ar, en)) + '</span><span class="en mu" style="font-size:13px">' + E(u) + '</span></button>').join('') +
    '<button class="btn g" data-reset style="align-self:center;min-height:38px;font-size:13px">' + t('إعادة البيانات التجريبية من البداية', 'Start the sample data again') + '</button></div>');
  $('[data-srv]') && ($('[data-srv]').hidden = true);
  $$('[data-demo]').forEach(b => b.onclick = async () => { const code = window.OozDemo.code, user = b.dataset.demo;
    const r = await run(() => api('login', { code, username: user, password: 'demo1234' })); D.cfg.token = r.token; D.cfg.code = code; D.cfg.user = user; save(); start(); });
  $('[data-reset]').onclick = async () => { if (await confirmBox(t('تُحذف كل التعديلات وتعود البيانات التجريبية كما كانت.', 'All changes are removed and the sample data starts again.'), t('إعادة', 'Start again'))) { busy(true); window.OozDemo.reset(); } };
}
function showAuth(which) {
  if (window.OOZ_DEMO) { if (!window.OozDemo) { authShell('<div class="card"><p class="mu" style="margin:0;text-align:center">' + t('نجهّز المدرسة التجريبية…', 'Preparing the sample school…') + '</p></div>'); window.OOZ_DEMO.then(() => showAuth(which), () => toast(window.OOZ_DEMO_ERROR || 'demo', true)); return; } return showDemo(); }
  D.authTab = which || D.authTab || (D.cfg.code ? 'login' : 'login');
  const L = D.authTab === 'login';
  authShell('<div class="card"><div class="tabs2"><button class="' + (L ? 'on' : '') + '" data-tabx="login">' + t('دخول', 'Sign in') + '</button><button class="' + (L ? '' : 'on') + '" data-tabx="reg">' + t('مدرسة جديدة', 'New school') + '</button></div>' +
    (L ? '<div class="f"><label for="sc">' + t('رمز المدرسة', 'School code') + '</label><input id="sc" dir="ltr" class="en" autocapitalize="characters" maxlength="12" value="' + E(D.cfg.code) + '" placeholder="ABC234" style="letter-spacing:2px;font-weight:700"></div><div class="f"><label for="su">' + t('اسم الدخول', 'Username') + '</label><input id="su" dir="ltr" autocapitalize="off" autocomplete="username" value="' + E(D.cfg.user) + '"></div><div class="f"><label for="sp">' + t('كلمة المرور', 'Password') + '</label><input id="sp" type="password" autocomplete="current-password"></div><button class="btn" id="go" style="min-height:52px;font-size:16px">' + t('دخول', 'Sign in') + '</button>'
      : '<p class="mu" style="margin:0;font-size:13px;line-height:1.7">' + t('أنشئ حساب مدرستك كمدير. تجربة كاملة 30 يوماً، ثم للعرض فقط حتى الترخيص.', 'Create your school as its principal. Full 30-day trial, then view only until licensed.') + '</p><div class="f"><label for="rn">' + t('اسم المدرسة', 'School name') + '</label><input id="rn" dir="ltr" placeholder="Ooz International School"></div><div class="f"><label for="ra">' + t('اسمك', 'Your name') + '</label><input id="ra"></div><div class="f"><label for="ru">' + t('اسم الدخول', 'Username') + '</label><input id="ru" dir="ltr" autocapitalize="off" placeholder="admin"></div><div class="f"><label for="rp">' + t('كلمة المرور (8 أحرف على الأقل)', 'Password (8+ characters)') + '</label><input id="rp" type="password" autocomplete="new-password"></div><button class="btn" id="reg" style="min-height:52px;font-size:16px">' + t('إنشاء المدرسة وبدء التجربة', 'Create school and start the trial') + '</button>') + '</div>');
  $$('[data-tabx]').forEach(b => b.onclick = () => showAuth(b.dataset.tabx));
  if (L) { const go = async () => { const code = $('#sc').value.trim().toUpperCase(), user = $('#su').value.trim().toLowerCase();
      const r = await run(() => api('login', { code, username: user, password: $('#sp').value })); D.cfg.token = r.token; D.cfg.code = code; D.cfg.user = user; save(); start(); };
    $('#go').onclick = go; $('#sp').onkeydown = e => { if (e.key === 'Enter') go(); }; }
  else $('#reg').onclick = async () => { const r = await run(() => api('register', { schoolName: $('#rn').value, adminName: $('#ra').value, username: $('#ru').value, password: $('#rp').value }));
    D.cfg.token = r.token; D.cfg.code = r.schoolCode; D.cfg.user = $('#ru').value.trim().toLowerCase(); save(); await start();
    dialog('<h2>' + t('أهلاً بك في Ooz Marks', 'Welcome to Ooz Marks') + '</h2><p style="margin:0;line-height:1.8">' + t('رمز مدرستك:', 'Your school code:') + ' <b class="en" style="font-size:22px;color:var(--goldd);letter-spacing:2px">' + E(r.schoolCode) + '</b><br>' + t('يكتبه المعلمون عند الدخول. ابدأ بالإعدادات ثم الفصول والمواد ثم المعلمين ثم الطلاب.', 'Teachers type it to sign in. Start with Settings, then Classes, Teachers and Students.') + '</p><div class="acts"><button class="btn" data-x>' + t('ابدأ', 'Start') + '</button></div>', (o, close) => { $('[data-x]', o).onclick = () => { close(); tab('settings'); }; }); };
}
function showPassword(forced) {
  const html = '<h2>' + (forced ? t('اختر كلمة مرور جديدة', 'Choose a new password') : t('تغيير كلمة المرور', 'Change password')) + '</h2>' + (forced ? '<p class="mu" style="margin:0">' + t('هذا أول دخول لك بكلمة مؤقتة.', 'This is your first sign-in with a temporary password.') + '</p>' : '') +
    '<div class="f"><label for="po">' + t('كلمة المرور الحالية', 'Current password') + '</label><input id="po" type="password" autocomplete="current-password"></div><div class="f"><label for="pn">' + t('الجديدة (8 أحرف على الأقل)', 'New (8+ characters)') + '</label><input id="pn" type="password" autocomplete="new-password"></div><div class="f"><label for="pc">' + t('أعد كتابتها', 'Repeat it') + '</label><input id="pc" type="password" autocomplete="new-password"></div>' +
    '<div class="acts">' + (forced ? '<button class="btn g" data-out>' + t('خروج', 'Sign out') + '</button>' : '<button class="btn g" data-x>' + t('إلغاء', 'Cancel') + '</button>') + '<button class="btn" data-ok>' + t('حفظ', 'Save') + '</button></div>';
  $$('.ov').forEach(o => o.remove());
  dialog(html, (o, close) => {
    const x = $('[data-x]', o); if (x) x.onclick = close; const out = $('[data-out]', o); if (out) out.onclick = () => { close(); logout(); };
    if (forced) o.onclick = null;
    $('[data-ok]', o).onclick = async () => { if ($('#pn', o).value !== $('#pc', o).value) return toast(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'), true);
      await run(() => api('changePassword', { old: $('#po', o).value, password: $('#pn', o).value }), t('تم تغيير كلمة المرور', 'Password changed')); close(); if (forced) start(); };
  });
}
async function ownerTools() {
  const key = await askText(t('أدوات المالك', 'Owner tools'), t('مفتاح المالك (OWNER_KEY)', 'Owner key (OWNER_KEY)')); if (!key) return;
  let r; try { r = await run(() => api('owner.schools', { __owner: key })); } catch (e) { return; }
  dialog('<h2>' + t('المدارس', 'Schools') + ' (' + r.schools.length + ')</h2><div class="list">' + r.schools.map(s => '<div class="li" style="cursor:default"><span class="mid"><b>' + E(s.name) + ' · <span class="en">' + E(s.code) + '</span></b><small>' + E(s.status.state) + ' · ' + s.status.daysLeft + 'd · ' + s.users + ' users · ' + s.students + ' students</small></span><button class="btn g sm" data-lic="' + E(s.code) + '">' + ic('key', 's') + t('ترخيص', 'Licence') + '</button></div>').join('') + '</div><div class="acts"><button class="btn" data-x>' + t('إغلاق', 'Close') + '</button></div>', (o, close) => {
    $('[data-x]', o).onclick = close;
    $$('[data-lic]', o).forEach(b => b.onclick = async () => { const until = await askText(t('ترخيص ', 'Licence for ') + b.dataset.lic, t('ساري حتى (YYYY-MM-DD)', 'Valid until (YYYY-MM-DD)'), (new Date().getFullYear() + 1) + '-08-31'); if (!until) return;
      const k = await run(() => api('owner.licence', { __owner: key, code: b.dataset.lic, until })); await N.copy(k.key); dialog('<h2>' + t('رمز التفعيل', 'Activation key') + '</h2><b class="en ltr" style="font-size:20px;color:var(--goldd)">' + E(k.key) + '</b><p class="mu" style="margin:0">' + t('نُسخ. أرسله للمدرسة لتكتبه في الإعدادات ← الترخيص.', 'Copied. Send it to the school to enter in Settings → Licence.') + '</p><div class="acts"><button class="btn" data-x>' + t('تم', 'Done') + '</button></div>', (o2, c2) => { $('[data-x]', o2).onclick = c2; }); });
  });
}
async function logout() { try { await api('logout'); } catch (e) {} D.cfg.token = ''; save(); D.me = null; D.data = null; D.stack = []; showAuth('login'); }
async function reloadMe() { D.me = await api('me'); }
async function start() {
  applyLook();
  if (!D.cfg.token) return showAuth();
  $('#app').innerHTML = '<div class="auth"><div class="in" style="align-items:center;justify-content:center">' + LOGO(100) + '</div></div>';
  try { await reloadMe(); } catch (e) { if (!e.silent) { authShell('<div class="card"><div class="note bad">' + ic('warn', 's') + E(errText(e)) + '</div><button class="btn" id="again">' + t('إعادة المحاولة', 'Try again') + '</button><button class="btn g" id="lo">' + t('خروج', 'Sign out') + '</button></div>'); $('#again').onclick = start; $('#lo').onclick = logout; } return; }
  if (D.me.user.mustChange) return showPassword(true);
  try { await load(); } catch (e) { if (!e.silent) toast(errText(e), true); return; }
  D.stack = []; D.view = { name: navItems()[0][0], params: {} }; render(true);
}
// Errors already shown to the person (run() shows a toast) are not unexpected.
window.addEventListener('unhandledrejection', e => { if (e.reason && e.reason.code) e.preventDefault(); });
window.addEventListener('beforeunload', () => { if (D.leaving) D.leaving(); });
const _go = go, _tab = tab;
go = function (n, p, push) { if (D.leaving) { const l = D.leaving; D.leaving = null; quiet(Promise.resolve(l())); } _go(n, p, push); };
tab = function (n) { if (D.leaving) { const l = D.leaving; D.leaving = null; quiet(Promise.resolve(l())); } _tab(n); };
D.start = start;
let started = false; const boot = () => { if (started) return; started = true; start(); };
try { Promise.all([document.fonts.load('400 16px A', 'عربي'), document.fonts.load('600 16px S', 'Aa1')]).then(boot, boot); } catch (e) { boot(); } setTimeout(boot, 1500);
})();
