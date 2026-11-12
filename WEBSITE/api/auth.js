/**
 * /api/auth
 * GET    : cek sesi aktif.
 * POST   : login dengan token PAT (diverifikasi sekali via GET /user, lalu dibuang).
 *          body: { action: 'login', token } | { action: 'logout' }
 */

const { loadConfig } = require('./_lib/config');
const { GitHubClient } = require('./_lib/github');
const auth = require('./_lib/auth');
const { json, apiError, withApi, rateLimit, clientIp, readJsonBody } = require('./_lib/http');

module.exports = withApi(async (req, res) => {
  const cfg = loadConfig();

  if (req.method === 'GET') {
    const session = auth.sessionFromRequest(req, cfg);
    json(res, 200, { ok: true, authenticated: Boolean(session), user: session ? session.user : null });
    return;
  }

  if (req.method !== 'POST') {
    apiError(res, 405, 'method_not_allowed', 'Gunakan GET atau POST.');
    return;
  }

  const body = await readJsonBody(req);

  if (body.action === 'logout') {
    for (const h of auth.clearCookieHeaders()) res.setHeader('Set-Cookie', h);
    json(res, 200, { ok: true });
    return;
  }

  if (body.action !== 'login') {
    apiError(res, 400, 'invalid_input', 'action harus login atau logout.');
    return;
  }

  if (!cfg.ready) {
    apiError(res, 503, 'backend_not_ready', 'Backend belum dikonfigurasi. Set env backend terlebih dahulu.');
    return;
  }

  const limit = rateLimit(`login:${clientIp(req)}`, cfg.rateLimitPerMinute);
  if (!limit.allowed) {
    apiError(res, 429, 'rate_limited', 'Terlalu banyak percobaan login. Coba lagi sebentar.');
    return;
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    apiError(res, 400, 'invalid_input', 'Token PAT wajib diisi.');
    return;
  }

  const client = new GitHubClient(cfg);
  let login = null;
  try {
    const resUser = await client.rawRequest('GET', '/user', { token });
    if (resUser.status !== 200 || !resUser.json || !resUser.json.login) {
      apiError(res, 401, 'unauthorized', 'Token tidak valid atau GitHub menolak permintaan.');
      return;
    }
    login = resUser.json.login;
  } catch (err) {
    apiError(res, 502, 'github_unreachable', `Gagal menghubungi GitHub: ${err.message}`);
    return;
  }

  if (!cfg.adminUsers.includes(login.toLowerCase())) {
    apiError(res, 403, 'forbidden', `Akun "${login}" tidak ada dalam daftar admin.`);
    return;
  }

  const session = auth.createSession({ user: login }, cfg.sessionSecret);
  const csrf = auth.newCsrfToken();
  for (const h of auth.sessionCookieHeaders(session, csrf)) res.setHeader('Set-Cookie', h);
  json(res, 200, { ok: true, user: login, csrfToken: csrf });
});
