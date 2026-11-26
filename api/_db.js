// Database access. Production: Neon over HTTP (DATABASE_URL). Tests: an in-memory Postgres (global.__OOZ_DB__).
let impl = null, ready = null;
function db() {
  if (impl) return impl;
  if (global.__OOZ_DB__) return (impl = global.__OOZ_DB__);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  return (impl = { q: (text, params = []) => sql.query(text, params) });
}
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS schools (id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, settings JSONB NOT NULL DEFAULT '{}',
     logo TEXT NOT NULL DEFAULT '', trial_ends TIMESTAMPTZ NOT NULL, license_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE, username TEXT NOT NULL, name TEXT NOT NULL,
     role TEXT NOT NULL, pass_hash TEXT NOT NULL, must_change BOOLEAN NOT NULL DEFAULT false, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (school_id, username))`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires TIMESTAMPTZ NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_fails (key TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS terms (id SERIAL PRIMARY KEY, school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE, name TEXT NOT NULL, year TEXT NOT NULL,
     is_current BOOLEAN NOT NULL DEFAULT false, locked BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS classes (id SERIAL PRIMARY KEY, school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE, name TEXT NOT NULL, stage TEXT NOT NULL,
     class_teacher_id INT REFERENCES users(id) ON DELETE SET NULL, sort INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE, class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
     name TEXT NOT NULL, max NUMERIC NOT NULL DEFAULT 50, min NUMERIC NOT NULL DEFAULT 25, counted BOOLEAN NOT NULL DEFAULT true, teacher_id INT REFERENCES users(id) ON DELETE SET NULL, sort INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS students (id SERIAL PRIMARY KEY, school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE, class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
     name TEXT NOT NULL, number TEXT NOT NULL DEFAULT '', exempt JSONB NOT NULL DEFAULT '[]', sort INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS marks (term_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE, student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
     subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, value NUMERIC, abs BOOLEAN NOT NULL DEFAULT false, updated_by INT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (term_id, student_id, subject_id))`,
  `CREATE TABLE IF NOT EXISTS submissions (term_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE, subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
     by_user INT, at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (term_id, subject_id))`,
  `CREATE TABLE IF NOT EXISTS comments (term_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE, student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
     text TEXT NOT NULL DEFAULT '', returned_note TEXT NOT NULL DEFAULT '', updated_by INT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (term_id, student_id))`,
  `CREATE TABLE IF NOT EXISTS approvals (term_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE, student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
     by_user INT, at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (term_id, student_id))`,
  `CREATE TABLE IF NOT EXISTS audit (id BIGSERIAL PRIMARY KEY, school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE, user_id INT, at TIMESTAMPTZ NOT NULL DEFAULT now(),
     action TEXT NOT NULL, detail JSONB NOT NULL DEFAULT '{}')`,
  // version 2.1: the Arabic section (its own report card), subjects graded by a word, Arabic term titles
  `ALTER TABLE classes ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'en'`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'mark'`,
  `ALTER TABLE marks ADD COLUMN IF NOT EXISTS grade TEXT`,
  `ALTER TABLE terms ADD COLUMN IF NOT EXISTS title_ar TEXT NOT NULL DEFAULT ''`,
  `CREATE INDEX IF NOT EXISTS students_class ON students (class_id)`,
  `CREATE INDEX IF NOT EXISTS subjects_class ON subjects (class_id)`,
  `CREATE INDEX IF NOT EXISTS audit_school ON audit (school_id, at)`,
];
async function q(text, params) { await ensure(); return db().q(text, params || []); }
function ensure() {
  if (!ready) ready = (async () => { for (const s of SCHEMA) await db().q(s, []); })().catch(e => { ready = null; throw e; });
  return ready;
}
module.exports = { q, ensure, _reset: () => { impl = null; ready = null; } };
