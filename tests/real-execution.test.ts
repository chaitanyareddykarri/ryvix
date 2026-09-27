import assert from 'node:assert/strict';
import { DockerWorkspaceManager, type DockerRunner } from '../services/src/workspace/docker-workspace.manager';
import { PullRequestService } from '../backend/src/services/pr.service';

export async function testRealExecution() {
  const calls: string[][] = [];
  const runner: DockerRunner = async args => {
    calls.push(args);
    return { exitCode: args.includes('exit 7') ? 7 : 0, stdout: 'actual-output', stderr: '' };
  };
  const manager = new DockerWorkspaceManager(runner);
  const session = await manager.createSession({ taskId: 'task', projectId: 'project' });
  try {
    const result = await manager.executeCommand(session.id, 'exit 7');
    assert.equal(result.success, false);
    assert.equal(result.exitCode, 7);
    assert.ok(calls.some(args => args[0] === 'run' && args.includes('1000:1000') && args.includes('--read-only')));
    await assert.rejects(manager.applyDiff(session.id, '../outside', 'bad'), /path/);
    await assert.rejects(manager.createSession({ taskId: 'task', projectId: 'project', cpu: 8 }), /limits/);
  } finally { await manager.terminateSession(session.id); }
  await assert.rejects(manager.executeCommand(session.id, 'true'), /not active/);
  await assert.rejects(PullRequestService.createPullRequest({ repoUrl: 'https://github.com/acme/app' }));
}
