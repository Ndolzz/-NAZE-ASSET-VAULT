/**
 * Konfigurasi backend dari environment variables. Tidak ada nilai rahasia
 * yang pernah dikirim ke klien; status hanya berupa boolean/mode.
 */

function clampInt(value, min, max, dflt) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function loadConfig(env = process.env) {
  const cfg = {
    appId: env.GITHUB_APP_ID || '',
    privateKey: (env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    installationId: env.GITHUB_INSTALLATION_ID || '',
    token: env.GITHUB_TOKEN || '',
    owner: env.GITHUB_OWNER || 'Ndolzz',
    repo: env.GITHUB_REPO || '-NAZE-ASSET-VAULT',
    branch: env.GITHUB_BRANCH || 'main',
    adminUsers: (env.ADMIN_GITHUB_USERS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    sessionSecret: env.SESSION_SECRET || '',
    maxUploadMb: clampInt(env.MAX_UPLOAD_MB, 1, 25, 4),
    rateLimitPerMinute: clampInt(env.RATE_LIMIT_PER_MINUTE, 5, 600, 60),
  };

  if (cfg.appId && cfg.privateKey && cfg.installationId) {
    cfg.authMode = 'app';
  } else if (cfg.token) {
    cfg.authMode = 'token';
  } else {
    cfg.authMode = 'none';
  }

  cfg.ready = cfg.authMode !== 'none' && cfg.sessionSecret.length >= 16 && cfg.adminUsers.length > 0;
  return cfg;
}

/** Root repository yang boleh diakses/diubah lewat API. */
const ALLOWED_ROOTS = ['VISUAL', 'AUDIO', 'FONTS', 'EXAMPLE_VIDEO', 'NAZE-3D/assets-3d', 'PROJECTS'];

module.exports = { loadConfig, ALLOWED_ROOTS };
