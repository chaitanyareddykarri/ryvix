import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyWorkerDocker } from '../services/src/workspace/worker-preflight';
import type { DockerRunner } from '../services/src/workspace/docker-workspace.manager';

const env = { RYVIX_WORKSPACE_IMAGES: 'worker-node,worker-egress',
  RYVIX_WORKSPACE_NODE_IMAGE: 'worker-node', RYVIX_WORKSPACE_EGRESS_IMAGE: 'worker-egress' };

test('worker preflight rejects missing approval without invoking Docker', async () => {
  await assert.rejects(verifyWorkerDocker({ ...env, RYVIX_WORKSPACE_IMAGES: '' }, async () => {
    assert.fail('Docker must not run before configuration validation');
  }), /configured in RYVIX_WORKSPACE_IMAGES/);
});

test('worker preflight checks engine and installed images using only read operations', async () => {
  const calls: string[][] = [];
  await verifyWorkerDocker(env, async args => {
    calls.push(args);
    return { exitCode: 0, stdout: 'linux\n', stderr: '' };
  });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map(args => args.slice(0, 2)), [['info', '--format'], ['image', 'inspect'], ['image', 'inspect']]);
});

test('worker preflight rejects unavailable engine, Windows engine, timeout and missing image', async () => {
  for (const failure of ['engine', 'windows', 'timeout', 'image']) {
    const run: DockerRunner = async args => ({
      exitCode: failure === 'engine' || (failure === 'image' && args[0] === 'image') ? 1 : 0,
      stdout: failure === 'windows' ? 'windows' : 'linux', stderr: '', timedOut: failure === 'timeout',
    });
    await assert.rejects(verifyWorkerDocker(env, run));
  }
});
