import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { signPreviewGrant, verifyPreviewGrant } from '../services/src/workspace/preview-gateway';

export async function testPreviewGrants() {
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
