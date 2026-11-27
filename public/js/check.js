/* Ooz Marks — warns when a comment does not match the marks: praise for a subject the student failed, criticism of a
   subject with a top grade, another student's name (copied comment), or the same comment given to several students. */
(function (root) {
'use strict';
const POS = /\b(excellent|outstanding|very good|good|great|strong|impressive|brilliant|superb|fantastic|remarkable|exceptional|excels?|proud|well done|confident|talented|admirable)\b/i;
const NEG = /\b(struggl\w*|difficult\w*|weak\w*|poor\w*|lack\w*|behind|fail\w*|needs? (?:to|more|support|help|improvement|practice|effort)|must improve|requires? (?:more|support|individuali[sz]ed))\b/i;
const ALIASES = { math: ['math', 'maths', 'mathematics'], ict: ['ict', 'computer', 'computing'], quran: ['quran', "qur'an", 'koran', 'holy quran'], english: ['english'], arabic: ['arabic'], science: ['science'],
  french: ['french'], islamic: ['islamic', 'religion'], art: ['art'], pe: ['pe', 'physical education', 'sport', 'sports'] };
function names(subject) {
  const n = subject.toLowerCase().trim(), out = new Set([n]);
  for (const [k, v] of Object.entries(ALIASES)) if (n === k || v.includes(n) || n.startsWith(k + ' ')) v.forEach(x => out.add(x));
  return [...out];
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
/* rows: [{subject:{name}, grade, fail}], top: grades counted as top (A*, A). Returns [{type, subject?, grade?, name?, words}] */
function check(text, ctx) {
  const out = [], t = String(text || '');
  if (!t.trim()) return [{ type: 'empty' }];
  const clauses = t.split(/[.;!?]+|,\s*(?:but|however|although|though|while|whereas|yet)\b|\b(?:but|however|although|whereas|despite)\b/i);
  const top = new Set(ctx.top || ['A*', 'A']);
  for (const r of ctx.rows || []) {
    if (!r.grade) continue;
    const re = new RegExp('\\b(' + names(r.subject.name).map(esc).join('|') + ')\\b', 'i');
    for (const c of clauses) {
      if (!re.test(c)) continue;
      if (r.fail && POS.test(c) && !NEG.test(c)) out.push({ type: 'praise_fail', subject: r.subject.name, grade: r.grade, words: (c.match(POS) || [])[0] });
      else if (top.has(r.grade) && NEG.test(c) && !POS.test(c)) out.push({ type: 'criticise_top', subject: r.subject.name, grade: r.grade, words: (c.match(NEG) || [])[0] });
    }
  }
  const mine = norm(ctx.name).split(' ')[0];
  for (const other of ctx.classNames || []) {
    const first = norm(other).split(' ')[0];
    if (first && first.length >= 3 && first !== mine && new RegExp('\\b' + esc(first) + '\\b', 'i').test(norm(t))) out.push({ type: 'other_name', name: other.split(' ')[0] });
  }
  if (ctx.others && ctx.checkDuplicates !== false) { const n = norm(t); const dup = ctx.others.find(o => o.text && norm(o.text) === n); if (dup) out.push({ type: 'duplicate', name: dup.name }); }
  const seen = new Set(); return out.filter(w => { const k = w.type + (w.subject || w.name || ''); if (seen.has(k)) return false; seen.add(k); return true; });
}
const api = { check, names };
if (typeof module === 'object' && module.exports) module.exports = api; else root.OozCheck = api;
})(this);
