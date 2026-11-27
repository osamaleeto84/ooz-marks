// /api/latest?package=com.ooz.compass (or ?slug=ooz-islam): the current version of an app, for its update notice.
// Public and read-only; any app may ask (CORS open), answers are cached for five minutes.
const { q } = require('./_db');
const { send, validSlug } = require('./_http');
module.exports = async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (req.method === 'OPTIONS') return send(res, 204, '', cors);
  const pkg = String((req.query && req.query.package) || '').slice(0, 120), slug = String((req.query && req.query.slug) || '');
  if (!/^[A-Za-z][\w.]{2,119}$/.test(pkg) && !validSlug(slug)) return send(res, 400, { error: 'package or slug' }, cors);
  try {
    const rows = await q(`SELECT a.slug, a.name, v.version_name, v.version_code, v.notes, v.size, v.created_at
      FROM apps a JOIN versions v ON v.app_id = a.id AND v.is_current
      WHERE a.published AND ${pkg ? 'a.package = $1' : 'a.slug = $1'} ORDER BY a.id LIMIT 1`, [pkg || slug]);
    if (!rows.length) return send(res, 404, { error: 'not found' }, Object.assign({ 'Cache-Control': 'public, s-maxage=60' }, cors));
    const r = rows[0];
    send(res, 200, { name: r.name, slug: r.slug, version: r.version_name, code: +r.version_code || 0, notes: r.notes || '', size: r.size == null ? null : +r.size,
      at: r.created_at, page: '/' + r.slug, download: '/d/' + r.slug }, Object.assign({ 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }, cors));
  } catch (e) { send(res, 500, { error: 'server' }, cors); }
};
