import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { signPreviewGrant, verifyPreviewGrant } from '../services/src/workspace/preview-gateway';
import { repositoryPreviewCommand } from '../services/src/workspace/preview-command';

export async function testPreviewGrants() {
  assert.equal(repositoryPreviewCommand('nodejs','npm',{scripts:{dev:'vite'},devDependencies:{vite:'1'}}),'npm run dev -- --host 0.0.0.0 --port 3000');
  assert.equal(repositoryPreviewCommand('nextjs','pnpm',{scripts:{dev:'next dev'}}),'pnpm run dev --hostname 0.0.0.0 --port 3000');
  assert.equal(repositoryPreviewCommand('nodejs','npm',{scripts:{start:'node app.js'}}),'npm run start');
  assert.equal(repositoryPreviewCommand('nodejs','npm',{}),null);
  const previous = process.env.PREVIEW_SIGNING_SECRET;
  process.env.PREVIEW_SIGNING_SECRET = randomBytes(32).toString('hex');
  try {
    const id = randomUUID(), now = Date.now();
    const grant = signPreviewGrant(id, now + 60000);
    assert.equal(verifyPreviewGrant(grant, id, now), true);
    assert.equal(verifyPreviewGrant(grant, randomUUID(), now), false);
    assert.equal(verifyPreviewGrant(grant, id, now + 60001), false);
    assert.equal(verifyPreviewGrant(grant + '.extra', id, now), false);
    assert.equal(verifyPreviewGrant('changed.' + grant.split('.')[1], id, now), false);
    assert.equal(verifyPreviewGrant(signPreviewGrant(id, now + 3600000), id, now), false);
    delete process.env.PREVIEW_SIGNING_SECRET;
    assert.equal(verifyPreviewGrant(grant, id, now), false);
    assert.throws(() => signPreviewGrant(id, now + 60000));
  } finally {
    if (previous === undefined) delete process.env.PREVIEW_SIGNING_SECRET;
    else process.env.PREVIEW_SIGNING_SECRET = previous;
  }
}
