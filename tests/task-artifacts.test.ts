import assert from 'node:assert/strict';
import { measuredFileDiff } from '../services/src/workspace/task-artifacts';

export async function testTaskArtifacts() {
  const diff = 'diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,2 +1,3 @@\n-old\n+new\n+++ literal plus text\n context\n';
  const file = measuredFileDiff('src/index.ts', diff, 'new\n++ literal plus text\ncontext\n', 'modify');
  assert.equal(file.additions, 2);
  assert.equal(file.deletions, 1);
  assert.equal(file.diff, diff);
  for (const path of ['../secret', '/etc/passwd', '.git/config', 'a/../../b', 'a\\b', 'a\nname']) {
    assert.throws(() => measuredFileDiff(path, diff, '', 'modify'));
  }
  assert.throws(() => measuredFileDiff('a', 'no diff', '', 'modify'));
  assert.throws(() => measuredFileDiff('a', diff, undefined, 'modify'));
  assert.equal(measuredFileDiff('a', diff, undefined, 'delete').content, undefined);
}
