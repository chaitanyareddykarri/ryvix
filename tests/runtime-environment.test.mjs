import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRuntimeEnvironment, hasCloudModelCredential } from '../scripts/runtime-environment.mjs';

test('deployment environment wins while later files supply local defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ryvix-env-test-'));
  const first = path.join(dir, 'first.env');
  const second = path.join(dir, 'second.env');
  try {
    fs.writeFileSync(first, 'DEPLOY_TARGET=local\nLOCAL_SETTING=first\n');
    fs.writeFileSync(second, 'DEPLOY_TARGET=other\nLOCAL_SETTING=second\n');
    const env = { DEPLOY_TARGET: 'server' };
    loadRuntimeEnvironment(env, [first, second, path.join(dir, 'absent.env')]);
    assert.deepEqual(env, { DEPLOY_TARGET: 'server', LOCAL_SETTING: 'second' });
  } finally {
    fs.unlinkSync(first);
    fs.unlinkSync(second);
    fs.rmdirSync(dir);
  }
});

test('cloud coding readiness requires a supported nonempty credential', () => {
  assert.equal(hasCloudModelCredential({}), false);
  assert.equal(hasCloudModelCredential({ GEMINI_API_KEY: '   ' }), false);
  assert.equal(hasCloudModelCredential({ GEMINI_API_KEY: 'test-placeholder' }), true);
  assert.equal(hasCloudModelCredential({ HF_TOKEN: 'test-placeholder' }), true);
  assert.equal(hasCloudModelCredential({ XAI_API_KEY: 'test-placeholder' }), false);
});
