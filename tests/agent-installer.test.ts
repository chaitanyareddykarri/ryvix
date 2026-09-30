import assert from 'node:assert/strict';
import { agentInstallScript, agentReleaseConfiguration } from '../backend/src/services/agent-installer';
export async function testAgentInstaller() {
  const env = { RYVIX_PUBLIC_URL: 'https://control.example.test', RYVIX_AGENT_RELEASE_MANIFEST: JSON.stringify({ version: '2.4.1', linux: {
    amd64: { url: 'https://releases.example.test/2.4.1/linux-amd64', sha256: 'a'.repeat(64) },
    arm64: { url: 'https://releases.example.test/2.4.1/linux-arm64', sha256: 'b'.repeat(64) },
  } }) };
  const script = agentInstallScript(env);
  assert.ok(script.indexOf('sha256sum --check') < script.indexOf('"$scratch/agent" --version'));
  assert.match(script, /User=ryvix-agent/);
  assert.match(script, /--enroll --control-plane/);
  assert.doesNotMatch(script, /agent\/latest|User=root/);
  assert.throws(() => agentReleaseConfiguration({}));
  assert.throws(() => agentReleaseConfiguration({ ...env, RYVIX_PUBLIC_URL: 'http://control.example.test' }));
  assert.throws(() => agentReleaseConfiguration({ ...env, RYVIX_AGENT_RELEASE_MANIFEST: env.RYVIX_AGENT_RELEASE_MANIFEST.replace('a'.repeat(64), 'invalid') }));
  assert.throws(() => agentReleaseConfiguration({ ...env, RYVIX_AGENT_RELEASE_MANIFEST: env.RYVIX_AGENT_RELEASE_MANIFEST.replace('/2.4.1/', '/latest/') }));
}
