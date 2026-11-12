/**
 * Sesi berbasis cookie HMAC (HttpOnly/Secure/SameSite=Lax) + CSRF double-submit.
 * Token PAT diverifikasi sekali saat login lalu dibuang; tidak pernah disimpan.
 */

const crypto = require('node:crypto');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam
const COOKIE_NAME = 'naze_session';
const CSRF_COOKIE_NAME = 'naze_csrf';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function sign(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function createSession(data, secret) {
  const payload = { ...data, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

function verifySession(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sessionFromRequest(req, cfg) {
  if (!cfg.ready) return null;
  const cookies = parseCookies(req);
  const session = verifySession(cookies[COOKIE_NAME], cfg.sessionSecret);
  if (!session) return null;
  if (!cfg.adminUsers.includes(String(session.user || '').toLowerCase())) return null;
  return session;
}

function checkCsrf(req, cfg) {
  const cookies = parseCookies(req);
  const header = req.headers['x-csrf-token'] || '';
  const cookieToken = cookies[CSRF_COOKIE_NAME] || '';
  if (!header || !cookieToken) return false;
  const a = Buffer.from(String(header));
  const b = Buffer.from(cookieToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function newCsrfToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function sessionCookieHeaders(session, csrf) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`,
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrf)}; Path=/; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`,
  ];
}

function clearCookieHeaders() {
  return [
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${CSRF_COOKIE_NAME}=; Path=/; Secure; SameSite=Lax; Max-Age=0`,
  ];
}

module.exports = {
  SESSION_TTL_MS,
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  parseCookies,
  createSession,
  verifySession,
  sessionFromRequest,
  checkCsrf,
  newCsrfToken,
  sessionCookieHeaders,
  clearCookieHeaders,
};
