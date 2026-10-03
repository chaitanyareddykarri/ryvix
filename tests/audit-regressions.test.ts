import assert from 'node:assert/strict';
import {speculativeSimulator} from '../ai/src/speculative-simulator';
import {trajectoryDpoTuner} from '../ai/src/deep-learning/trajectory-dpo-tuner';
import {verifyUnauthenticatedServerBoundary} from './total-project-integration.test';

export async function testAuditRegressions(): Promise<void> {
  // Strings only. Never execute these commands.
  for (const input of ['cat /dev/null; rm -rf /','rm -rf /; iptables -F','rm -rf /; kill -9 1']) {
    const result=speculativeSimulator.simulate(input);
    assert.equal(result.isSafe,false);
    assert.equal(result.recommendation,'STRICTLY_BLOCKED');
    assert.equal(result.mutationRiskScore,1);
  }
  for (const input of ['systemctl status app; echo change','systemctl status app\necho change',
    'systemctl status $(echo app)','systemctl status app > output','curl -X DELETE https://example.com',
    'unknown-operation','']) {
    assert.equal(speculativeSimulator.simulate(input).isSafe,false);
    assert.notEqual(speculativeSimulator.simulate(input).recommendation,'DISPATCH_APPROVED');
  }
  assert.equal(speculativeSimulator.simulate('systemctl status app.service').isSafe,true);
  assert.deepEqual(trajectoryDpoTuner.evaluateBatch([]),{evaluatedCount:0,averageDpoLoss:null,
    alignmentRatio:null,averageRewardMargin:null});
  const batch=trajectoryDpoTuner.evaluateBatch([{pairId:'test',contextPrompt:'test',
    winningTrajectory:{actionName:'a',codeOrCommand:'a',logProbabilityPolicy:-1,logProbabilityReference:-2},
    losingTrajectory:{actionName:'b',codeOrCommand:'b',logProbabilityPolicy:-3,logProbabilityReference:-2}}]);
  assert.equal(batch.evaluatedCount,1);assert.equal(batch.alignmentRatio,1);
  await verifyUnauthenticatedServerBoundary(async()=>({statusCode:401}));
  await assert.rejects(verifyUnauthenticatedServerBoundary(async()=>({statusCode:200})),/reject unauthenticated/);
  await assert.rejects(verifyUnauthenticatedServerBoundary(async()=>{throw new Error('connection failed');}),/connection failed/);
}
