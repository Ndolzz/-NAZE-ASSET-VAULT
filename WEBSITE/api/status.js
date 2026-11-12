/**
 * GET /api/status - status konfigurasi backend (tanpa rahasia).
 */

const { loadConfig } = require('./_lib/config');
const { json, withApi } = require('./_lib/http');

module.exports = withApi(async (req, res) => {
  if (req.method !== 'GET') {
    json(res, 405, { ok: false, code: 'method_not_allowed', message: 'Gunakan GET.' });
    return;
  }
  const cfg = loadConfig();
  json(res, 200, {
    ok: true,
    backend: {
      ready: cfg.ready,
      authMode: cfg.authMode,
      repo: `${cfg.owner}/${cfg.repo}`,
      branch: cfg.branch,
      maxUploadMb: cfg.maxUploadMb,
      adminConfigured: cfg.adminUsers.length > 0,
      sessionConfigured: cfg.sessionSecret.length >= 16,
    },
  });
});
