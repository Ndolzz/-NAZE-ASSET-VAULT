/**
 * NAZE Asset Vault - modul validasi murni (tanpa dependensi Node).
 * Dipakai bersama oleh backend API, skrip indexing, dan pengujian.
 * Semua fungsi melempar ValidationError dengan kode stabil.
 */

export const MARKER_FILES = new Set(['.gitkeep']);
export const MAX_NAME_LENGTH = 120;
export const MAX_REL_PATH_LENGTH = 400;
export const MAX_PATH_DEPTH = 12;

export class ValidationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ValidationError';
    this.code = code || 'invalid_input';
  }
}

const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/**
 * Validasi nama file atau folder tunggal (satu segmen path).
 * Mengembalikan nama yang sudah di-trim, atau melempar ValidationError.
 */
export function validateSegmentName(rawName, { allowHidden = false } = {}) {
  if (typeof rawName !== 'string') {
    throw new ValidationError('Nama wajib berupa teks.', 'invalid_name');
  }
  const name = rawName.trim();
  if (name.length === 0) {
    throw new ValidationError('Nama tidak boleh kosong.', 'invalid_name');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`Nama maksimal ${MAX_NAME_LENGTH} karakter.`, 'name_too_long');
  }
  if (name === '.' || name === '..') {
    throw new ValidationError('Nama tidak boleh "." atau "..".', 'path_traversal');
  }
  if (CONTROL_CHARS.test(name) || name.includes('/') || name.includes('\\')) {
    throw new ValidationError('Nama mengandung karakter yang tidak diizinkan.', 'invalid_name');
  }
  if (!allowHidden && name.startsWith('.')) {
    throw new ValidationError('Nama tidak boleh diawali titik.', 'invalid_name');
  }
  if (/[. ]$/.test(name)) {
    throw new ValidationError('Nama tidak boleh diakhiri titik atau spasi.', 'invalid_name');
  }
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) {
    throw new ValidationError('Nama merupakan nama perangkat yang dicadangkan.', 'invalid_name');
  }
  return name;
}

/**
 * Validasi path relatif terhadap daftar root yang diizinkan.
 * Mengembalikan path ternormalisasi ("ROOT/a/b.ext") atau melempar error.
 */
export function validateRelativePath(rawPath, allowedRoots) {
  if (typeof rawPath !== 'string') {
    throw new ValidationError('Path wajib berupa teks.', 'invalid_path');
  }
  let decoded = rawPath.trim();
  try {
    // Dekode berulang agar traversal berlapis (%252e%252e, ..%2f) tetap terdeteksi.
    for (let i = 0; i < 3; i += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    throw new ValidationError('Path mengandung encoding tidak valid.', 'invalid_path');
  }
  if (decoded.length === 0) {
    throw new ValidationError('Path tidak boleh kosong.', 'invalid_path');
  }
  if (decoded.length > MAX_REL_PATH_LENGTH) {
    throw new ValidationError(`Path maksimal ${MAX_REL_PATH_LENGTH} karakter.`, 'path_too_long');
  }
  if (decoded.startsWith('/') || /^[a-zA-Z]:/.test(decoded)) {
    throw new ValidationError('Path absolut tidak diizinkan.', 'path_traversal');
  }
  const segments = decoded.split('/');
  if (segments.length > MAX_PATH_DEPTH) {
    throw new ValidationError(`Kedalaman folder maksimal ${MAX_PATH_DEPTH}.`, 'path_too_deep');
  }
  for (const seg of segments) {
    if (seg === '') {
      throw new ValidationError('Path mengandung segmen kosong.', 'invalid_path');
    }
    if (seg.includes('..')) {
      throw new ValidationError('Path traversal ("..") tidak diizinkan.', 'path_traversal');
    }
    if (CONTROL_CHARS.test(seg)) {
      throw new ValidationError('Path mengandung karakter terlarang.', 'invalid_path');
    }
  }
  // Root boleh bersarang (mis. "NAZE-3D/assets-3d"); cocokkan dengan prefix.
  const matchedRoot = allowedRoots.find(
    (r) => decoded === r || decoded.startsWith(r + '/')
  );
  if (!matchedRoot) {
    const root = segments[0];
    throw new ValidationError(
      `Root "${root}" tidak diizinkan. Root yang diizinkan: ${allowedRoots.join(', ')}.`,
      'root_not_allowed'
    );
  }
  const normalized = segments.join('/');
  if (normalized !== decoded) {
    throw new ValidationError('Path mengandung karakter yang perlu dinormalisasi.', 'invalid_path');
  }
  return normalized;
}

/**
 * Validasi path tujuan folder baru di dalam proyek.
 * Segmen pertama harus PROJECTS, segmen kedua nama proyek.
 */
export function validateProjectSubPath(rawPath, allowedRoots = ['PROJECTS']) {
  const normalized = validateRelativePath(rawPath, allowedRoots);
  const segments = normalized.split('/');
  if (segments.length < 3) {
    throw new ValidationError('Path proyek minimal PROJECTS/<nama>/<item>.', 'invalid_project_path');
  }
  return normalized;
}

export function isMarkerFile(name) {
  return MARKER_FILES.has(name);
}

export function getExtension(name) {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) return '';
  return name.slice(idx + 1).toLowerCase();
}

/**
 * Daftar ekstensi unggahan yang diizinkan (aset media, font, 3D, dokumen pendukung).
 */
export const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp',
  'mp3', 'wav', 'ogg', 'm4a', 'flac',
  'mp4', 'mov', 'webm',
  'ttf', 'otf', 'woff', 'woff2',
  'glb', 'gltf', 'obj', 'fbx', 'mtl', 'blend',
  'json', 'md', 'txt', 'csv',
]);

export function validateUploadExtension(fileName) {
  const ext = getExtension(fileName);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new ValidationError(
      `Ekstensi ".${ext || '(tanpa ekstensi)'}" tidak diizinkan.`,
      'extension_not_allowed'
    );
  }
  return ext;
}

/**
 * Validasi nama proyek: KAPITAL atau bebas, tanpa spasi berlebih.
 * Nama dengan spasi tetap sah agar proyek legacy tetap representable.
 */
export function validateProjectName(rawName) {
  const name = validateSegmentName(rawName);
  if (name.length > 80) {
    throw new ValidationError('Nama proyek maksimal 80 karakter.', 'name_too_long');
  }
  if (/^naze-?(vault|asset)/i.test(name)) {
    throw new ValidationError('Nama proyek tidak boleh meniru nama sistem.', 'invalid_project_name');
  }
  return name;
}

/**
 * Cek duplikat: mengembalikan true bila path sudah ada di daftar path yang diketahui.
 */
export function pathExists(path, knownPaths) {
  return knownPaths instanceof Set ? knownPaths.has(path) : knownPaths.includes(path);
}

/**
 * Pastikan operasi rename/move tidak menimpa path lain yang sudah ada.
 */
export function assertNoCollision(targetPath, knownPaths) {
  if (pathExists(targetPath, knownPaths)) {
    throw new ValidationError(
      `Path tujuan sudah ada: ${targetPath}. Gunakan nama lain.`,
      'target_exists'
    );
  }
}
