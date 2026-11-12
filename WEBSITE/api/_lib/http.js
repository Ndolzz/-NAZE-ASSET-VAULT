/**
 * Utilitas HTTP untuk Vercel Functions: respons JSON, batas body,
 * rate limit jendela tetap per instance, dan pembungkus error.
 */

const MAX_BODY_BYTES = 6 * 1024 * 1024; // ~4.5MB batas body Vercel, beri ruang JSON

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function apiError(res, status, code, message) {
  json(res, status, { ok: false, code, message });
}

const rateBuckets = new Map();

function rateLimit(key, limitPerMinute) {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000;
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.windowStart !== windowStart) {
    rateBuckets.set(key, { windowStart, count: 1 });
    return { allowed: true, remaining: limitPerMinute - 1 };
  }
  bucket.count += 1;
  if (bucket.count > limitPerMinute) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: limitPerMinute - bucket.count };
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new ApiError(413, 'body_too_large', `Body melebihi ${maxBytes} byte.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ApiError(400, 'invalid_json', 'Body bukan JSON yang valid.'));
      }
    });
    req.on('error', () => reject(new ApiError(400, 'body_read_failed', 'Gagal membaca body.')));
  });
}

const STATUS_BY_CODE = {
  invalid_input: 400,
  invalid_name: 400,
  invalid_path: 400,
  invalid_json: 400,
  invalid_project_name: 400,
  invalid_project_path: 400,
  path_traversal: 400,
  root_not_allowed: 400,
  path_too_deep: 400,
  path_too_long: 400,
  name_too_long: 400,
  extension_not_allowed: 400,
  file_too_large: 413,
  body_too_large: 413,
  too_many_files: 400,
  target_exists: 409,
  commit_conflict: 409,
  duplicates: 409,
  unauthorized: 401,
  forbidden: 403,
  csrf_invalid: 403,
  not_found: 404,
  rate_limited: 429,
  backend_not_ready: 503,
  github_auth_failed: 502,
  github_unreachable: 502,
  tree_truncated: 502,
};

function withApi(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err && err.name === 'ApiError') {
        apiError(res, err.status, err.code, err.message);
        return;
      }
      if (err && err.name === 'ValidationError') {
        apiError(res, STATUS_BY_CODE[err.code] || 400, err.code, err.message);
        return;
      }
      if (err && err.name === 'GitHubError') {
        apiError(res, err.status || 502, err.code, err.message);
        return;
      }
      console.error('[api] error tak terduga:', err && err.message);
      apiError(res, 500, 'internal_error', 'Terjadi kesalahan internal. Coba lagi nanti.');
    }
  };
}

module.exports = {
  MAX_BODY_BYTES,
  ApiError,
  json,
  apiError,
  rateLimit,
  clientIp,
  readJsonBody,
  withApi,
};
