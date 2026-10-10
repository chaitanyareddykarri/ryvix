import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

// Render only dummy configuration: never print or read deployment credentials.
const directory = mkdtempSync(path.join(tmpdir(), 'ryvix-compose-check-'));
try {
  for (const role of ['operations', 'gmail', 'whatsapp', 'experience', 'workspace'])
    writeFileSync(path.join(directory, `${role}.env`), 'RYVIX_TEST_CONFIG=true\n');
  const env = {...process.env, RYVIX_WORKER_IMAGE: 'ryvix-micro-workers:verification',
    RYVIX_WORKER_ENV_DIR: directory.replaceAll('\\', '/'), RYVIX_DOCKER_GID: '999'};
  for (const host of ['ai', 'workspace']) {
    const render = (...profiles) => JSON.parse(execFileSync('docker', ['compose', '--env-file',
      path.join(directory, 'operations.env'), '-f', `infrastructure/micro/compose.${host}.yml`,
      ...profiles, 'config', '--format', 'json'], {env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}));
    const defaults = render();
    assert.deepEqual(Object.keys(defaults.services), [host === 'ai' ? 'operations' : 'workspace']);
    const all = render('--profile', '*');
    for (const [role, service] of Object.entries(all.services)) {
      assert.deepEqual(service.tmpfs, ['/tmp:size=16m,mode=1777'], `${role}: one bounded writable /tmp`);
      assert.equal(service.read_only, true);
      assert.equal(service.user, '1000:1000');
      assert.equal(service.platform, 'linux/amd64');
      assert.equal(Number(service.mem_limit), (host === 'ai' ? 192 : 256) * 1024 ** 2);
      assert.equal(Number(service.memswap_limit), (host === 'ai' ? 256 : 384) * 1024 ** 2);
      const sockets = (service.volumes || []).filter(v => v.target === '/var/run/docker.sock');
      assert.equal(sockets.length, host === 'workspace' ? 1 : 0);
      if (host === 'workspace') {
        assert.equal(service.environment.RYVIX_WORKSPACE_MODE, 'static');
        assert.equal(service.environment.RYVIX_WORKSPACE_MAX_SESSIONS, '1');
      }
    }
  }
  console.log('PASS: both Micro Compose configurations; default roles, tmpfs, resource caps and Docker socket boundary.');
} finally {
  // Only remove this script's uniquely created temporary directory.
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
  assert.ok(path.basename(directory).startsWith('ryvix-compose-check-'));
  rmSync(directory, {recursive: true, force: true});
}
