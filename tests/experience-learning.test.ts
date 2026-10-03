import assert from 'node:assert/strict';
import {ModelReadinessManager,type ExecutionDataPoint} from '../ai/src/evaluation/model-readiness';
import {cleanMemory, outcomeWindows} from '../backend/src/services/experience-store';
export async function testExperienceLearning(){
  const metrics=new ModelReadinessManager().getEvaluationMetrics();
  assert.equal(metrics.totalInteractions,0);
  assert.equal(metrics.averageQualityScore,null,'No samples cannot imply perfect quality');
  assert.equal(metrics.averageLatencyMs,null,'Missing measurements cannot imply latency');
  const manager=new ModelReadinessManager();
  const example={rawUserPrompt:'Explain the incident',userApprovalOutcome:{status:'pending'},validationResult:{isValid:true},buildTestOutcome:{buildPassed:false},qualityScore:0.4} as ExecutionDataPoint;
  manager.recordInteraction(example);assert.equal(manager.getEvaluationMetrics().averageLatencyMs,null);
  manager.recordInteraction({...example,latencyMs:120});manager.recordInteraction({...example,latencyMs:80});
  assert.equal(manager.getEvaluationMetrics().averageLatencyMs,100,'Only measured latencies enter averages');
  assert.equal(manager.getEvaluationMetrics().userApprovalRate,0);
  assert.throws(()=>cleanMemory('x'.repeat(1001)),/3.*1000/);
  assert.throws(()=>cleanMemory('  '),/3.*1000/);
  assert.ok(!cleanMemory('Use token sk-123456789012345678901234567890').includes('sk-123456789012345678901234567890'));
  const windows=outcomeWindows([]);assert.equal(windows.current.failureRate,null);
  const measured=outcomeWindows([{observed_at:new Date().toISOString(),evidence:{status:'failed'}},{observed_at:new Date().toISOString(),evidence:{status:'unknown'}}]);
  assert.equal(measured.current.failureRate,1);assert.equal(measured.current.unknown,1);
}
