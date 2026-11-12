import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRelativePath,
  validateSegmentName,
  validateUploadExtension,
  validateProjectName,
  ValidationError,
} from '../lib/validate.mjs';

const ROOTS = ['VISUAL', 'AUDIO', 'FONTS', 'EXAMPLE_VIDEO', 'NAZE-3D/assets-3d', 'PROJECTS'];

function expectError(fn, code) {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof ValidationError);
    assert.equal(e.code, code);
    return;
  }
  assert.fail(`harusnya melempar ${code}`);
}

test('keamanan: traversal berlapis dan encoding ganda', () => {
  expectError(() => validateRelativePath('VISUAL/%252e%252e/x', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('VISUAL/..%2f..%2frender.yml', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('VISUAL/....//render.yml', ROOTS), 'path_traversal');
  expectError(() => validateRelativePath('VISUAL/a/../../b', ROOTS), 'path_traversal');
});

test('keamanan: null byte dan karakter kontrol', () => {
  expectError(() => validateSegmentName('bad\u0000name.png'), 'invalid_name');
  expectError(() => validateRelativePath('VISUAL/\u0001.png', ROOTS), 'invalid_path');
});

test('keamanan: akses di luar root yang diizinkan', () => {
  expectError(() => validateRelativePath('.github/workflows/render.yml', ROOTS), 'root_not_allowed');
  expectError(() => validateRelativePath('WEBSITE/js/app.js', ROOTS), 'root_not_allowed');
  expectError(() => validateRelativePath('naze.policy.json', ROOTS), 'root_not_allowed');
});

test('keamanan: unggahan berbahaya', () => {
  expectError(() => validateUploadExtension('shell.php'), 'extension_not_allowed');
  expectError(() => validateUploadExtension('page.html'), 'extension_not_allowed');
  expectError(() => validateUploadExtension('config.yaml'), 'extension_not_allowed');
  expectError(() => validateUploadExtension('app.exe'), 'extension_not_allowed');
});

test('keamanan: nama proyek tidak boleh menyerupai direktori sistem', () => {
  expectError(() => validateProjectName('NAZE-VAULT'), 'invalid_project_name');
  expectError(() => validateProjectName('naze-asset'), 'invalid_project_name');
  expectError(() => validateProjectName('MOTION-ENGINE/../x'), 'invalid_name');
});
