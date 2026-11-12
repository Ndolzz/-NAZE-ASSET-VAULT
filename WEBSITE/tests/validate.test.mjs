import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSegmentName,
  validateRelativePath,
  validateProjectName,
  validateUploadExtension,
  assertNoCollision,
  ValidationError,
  ALLOWED_EXTENSIONS,
} from '../lib/validate.mjs';

const ROOTS = ['VISUAL', 'AUDIO', 'FONTS', 'EXAMPLE_VIDEO', 'NAZE-3D/assets-3d', 'PROJECTS'];

function expectError(fn, code) {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof ValidationError, `harus ValidationError, dapat ${e?.name}`);
    assert.equal(e.code, code);
    return;
  }
  assert.fail(`harusnya melempar ${code}`);
}

test('nama file valid diterima', () => {
  assert.equal(validateSegmentName('  SFX impact 01.wav '), 'SFX impact 01.wav');
  assert.equal(validateSegmentName('project.json'), 'project.json');
});

test('nama invalid ditolak', () => {
  expectError(() => validateSegmentName(''), 'invalid_name');
  expectError(() => validateSegmentName('a/b'), 'invalid_name');
  expectError(() => validateSegmentName('a\\b'), 'invalid_name');
  expectError(() => validateSegmentName('..'), 'path_traversal');
  expectError(() => validateSegmentName('.hidden'), 'invalid_name');
  expectError(() => validateSegmentName('name.'), 'invalid_name');
  expectError(() => validateSegmentName('CON'), 'invalid_name');
  expectError(() => validateSegmentName('x'.repeat(121)), 'name_too_long');
  expectError(() => validateSegmentName('bad\x01name'), 'invalid_name');
});

test('path relatif valid dinormalisasi', () => {
  assert.equal(validateRelativePath('VISUAL/LOGO/NAZE_LOGO.png', ROOTS), 'VISUAL/LOGO/NAZE_LOGO.png');
  assert.equal(validateRelativePath('NAZE-3D/assets-3d/props/chair.glb', ROOTS), 'NAZE-3D/assets-3d/props/chair.glb');
});

test('path traversal diblokir', () => {
  expectError(() => validateRelativePath('../naze.policy.json', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('VISUAL/../../.github/workflows/render.yml', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('/etc/passwd', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('C:/Windows/system32', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('VISUAL/%2e%2e/secret', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('MOTION-ENGINE/src/cli.ts', ROOTS), 'root_not_allowed');
  expectError(() => validateRelativePath('VISUAL/' + 'a/'.repeat(13) + 'x.png', ROOTS), 'path_too_deep');
});

test('ekstensi unggahan', () => {
  assert.equal(validateUploadExtension('gambar.PNG'), 'png');
  assert.ok(ALLOWED_EXTENSIONS.has('glb'));
  expectError(() => validateUploadExtension('script.sh'), 'extension_not_allowed');
  expectError(() => validateUploadExtension('noext'), 'extension_not_allowed');
  expectError(() => validateUploadExtension('.env'), 'extension_not_allowed');
});

test('nama proyek', () => {
  assert.equal(validateProjectName('DARK-WEB'), 'DARK-WEB');
  assert.equal(validateProjectName('proyek baru'), 'proyek baru');
  expectError(() => validateProjectName('NAZE-ASSET'), 'invalid_project_name');
  expectError(() => validateProjectName(''), 'invalid_name');
});

test('deteksi tabrakan tujuan rename/move', () => {
  const known = new Set(['VISUAL/LOGO/a.png', 'VISUAL/LOGO/b.png']);
  assertNoCollision('VISUAL/LOGO/c.png', known);
  expectError(() => assertNoCollision('VISUAL/LOGO/b.png', known), 'target_exists');
});
