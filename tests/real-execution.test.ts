import assert from 'node:assert/strict';
import { DockerWorkspaceManager, type DockerRunner } from '../services/src/workspace/docker-workspace.manager';
import { PullRequestService } from '../backend/src/services/pr.service';
import { InternalAgent } from '../services/src/connector/internal-agent';

export async function testRealExecution() {
  const native = new InternalAgent();
  await assert.rejects(native.emitNativeTelemetry(), /server identity/);
  await assert.rejects(native.executeCapability('firewall.block_ip', { ip: '192.0.2.1' }), /authenticated dispatcher/);
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
  const original = new DockerWorkspaceManager(runner);
  const recoverable = await original.createSession({taskId:'task',projectId:'project'});
  let wrongOwner = false;
  const recovered = new DockerWorkspaceManager(async args => {
    if (args[0] === 'inspect') return {exitCode:0,stderr:'',stdout:JSON.stringify([{
      Config:{User:'1000:1000',Labels:{'ryvix.workspace':'true','ryvix.session':recoverable.id,
        'ryvix.task':'task','ryvix.project':wrongOwner?'other-project':'project'}},State:{Running:true},
      HostConfig:{PortBindings:{'3000/tcp':[{HostIp:'127.0.0.1',HostPort:String(recoverable.preview_port)}]}},
    }])};
    return {exitCode:0,stdout:'',stderr:''};
  });
  wrongOwner=true;
  await assert.rejects(recovered.restoreSession(recoverable),/not available/);
  wrongOwner=false;
  assert.equal((await recovered.restoreSession(recoverable)).id,recoverable.id);
  await recovered.terminateSession(recoverable.id);
  await original.terminateSession(recoverable.id);
  const cleanupCalls: string[][] = [];
  let foreignBroker = true;
  const cleanup = new DockerWorkspaceManager(async args => {
    cleanupCalls.push(args);
    if (args[0] === 'inspect' && args[1].endsWith('_egress')) return {exitCode:0,stderr:'',stdout:JSON.stringify([{
      Config:{Labels:{'ryvix.workspace':'true','ryvix.session':foreignBroker?'another-session':recoverable.id,'ryvix.role':'egress-broker'}},
    }])};
    if (args[0] === 'inspect') return {exitCode:1,stdout:'',stderr:'No such container'};
    if (args[0] === 'network') return {exitCode:1,stdout:'',stderr:'No such network'};
    return {exitCode:0,stdout:'',stderr:''};
  });
  await assert.rejects(cleanup.cleanupPersistedSession(recoverable),/identity mismatch/);
  assert.ok(!cleanupCalls.some(args=>args[0]==='rm'));
  foreignBroker=false;
  await cleanup.cleanupPersistedSession(recoverable);
  assert.ok(cleanupCalls.some(args=>args[0]==='rm'&&args[2]===`${recoverable.container_id}_egress`));
  await assert.rejects(PullRequestService.createPullRequest({ repoUrl: 'https://github.com/acme/app' }));
}
