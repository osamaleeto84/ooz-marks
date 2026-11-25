// Small helpers shared by the functions.
const crypto = require('crypto');
function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Owner-Key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (typeof body === 'string' || Buffer.isBuffer(body)) res.end(body);
  else { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); }
}
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
function hashPassword(pw) { const salt = crypto.randomBytes(16).toString('hex'); return 's1$' + salt + '$' + crypto.scryptSync(String(pw), salt, 32).toString('hex'); }
function checkPassword(pw, stored) {
  const [v, salt, h] = String(stored || '').split('$'); if (v !== 's1' || !salt || !h) return false;
  const got = crypto.scryptSync(String(pw), salt, 32); const want = Buffer.from(h, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
function same(a, b) { a = Buffer.from(String(a || '')); b = Buffer.from(String(b || '')); return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b); }
const token = () => crypto.randomBytes(32).toString('base64url');
// Easy to read aloud: no 0/O, 1/I/L.
function code(n) { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; const b = crypto.randomBytes(n); for (let i = 0; i < n; i++) s += A[b[i] % A.length]; return s; }
class Fail extends Error { constructor(status, code, message) { super(message || code); this.status = status; this.code = code; } }
module.exports = { send, sha, hashPassword, checkPassword, same, token, code, Fail };
