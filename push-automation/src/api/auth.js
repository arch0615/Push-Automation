const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const SESSIONS = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function pruneExpired() {
  const now = Date.now();
  for (const [t, exp] of SESSIONS) if (exp < now) SESSIONS.delete(t);
}

function isValidToken(token) {
  if (!token) return false;
  pruneExpired();
  const exp = SESSIONS.get(token);
  return !!exp && exp > Date.now();
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = process.env.DASHBOARD_USER || 'admin';
  const pass = process.env.DASHBOARD_PASS || 'admin123';
  if (username !== user || password !== pass) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  const token = makeToken();
  SESSIONS.set(token, Date.now() + SESSION_TTL_MS);
  res.cookie('session', token, {
    httpOnly: true,
    maxAge: SESSION_TTL_MS,
    sameSite: 'lax',
  });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.session;
  if (token) SESSIONS.delete(token);
  res.clearCookie('session');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.session;
  if (!isValidToken(token)) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, username: process.env.DASHBOARD_USER || 'admin' });
});

function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!isValidToken(token)) return res.status(401).json({ error: 'Não autenticado' });
  next();
}

module.exports = router;
module.exports.requireAuth = requireAuth;
