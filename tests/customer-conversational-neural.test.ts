import assert from 'node:assert/strict';
import {
  conversationalAgent,
  neuralThreatClassifier,
} from '../ai/src/orchestrator';

export async function testCustomerConversationalNeural(): Promise<void> {
  console.log('[TEST] Running Deep Customer Conversational Intelligence & Hardened Neural Test Suite...');
  conversationalAgent.clearHistory();

  // =========================================================================
  // 1. TEST CUSTOMER SENTIMENT & INTENT RECOGNITION
  // =========================================================================
  console.log('  -> 1. Testing Customer Sentiment & Intent Recognition...');
  
  // Panic outage
  const panicMsg = 'EMERGENCY! Our checkout is completely down, customers are furious, please help!';
  assert.strictEqual(conversationalAgent.inferCustomerSentiment(panicMsg), 'PANIC');
  assert.strictEqual(conversationalAgent.inferCustomerIntent(panicMsg), 'CUSTOMER_OUTAGE_PANIC');

  // Frustrated escalation
  const frustMsg = 'This latency is taking too long to fix and our CEO is demanding an update now.';
  assert.strictEqual(conversationalAgent.inferCustomerSentiment(frustMsg), 'FRUSTRATED');
  assert.strictEqual(conversationalAgent.inferCustomerIntent(frustMsg), 'CUSTOMER_ESCALATION_FRUSTRATION');

  // Technical inquiry
  const techMsg = 'Can you show us how to tune Linux socket buffers for 100k connections?';
  assert.strictEqual(conversationalAgent.inferCustomerSentiment(techMsg), 'NEUTRAL');
  assert.strictEqual(conversationalAgent.inferCustomerIntent(techMsg), 'CUSTOMER_TECHNICAL_INQUIRY');

  // Billing & access
  const billMsg = 'We need a new SSH access key and information regarding our cloud invoice.';
  assert.strictEqual(conversationalAgent.inferCustomerIntent(billMsg), 'CUSTOMER_BILLING_ACCESS_REQUEST');

  // Resolution confirmed
  const resMsg = 'Everything is working again now, thank you so much for the quick recovery!';
  assert.strictEqual(conversationalAgent.inferCustomerSentiment(resMsg), 'SATISFIED');
  assert.strictEqual(conversationalAgent.inferCustomerIntent(resMsg), 'CUSTOMER_RESOLUTION_CONFIRMED');

  console.log('  ✓ 5/5 Customer sentiments and intents accurately recognized.');

  // =========================================================================
  // 2. TEST ROLE-BASED CONVERSATIONAL SHAPING & PANIC DE-ESCALATION
  // =========================================================================
  console.log('  -> 2. Testing Role-Based Customer Response Shaping & Panic De-escalation...');

  // A. Non-Technical Customer During Outage (Empathetic, zero-jargon, clear ETA)
  const nonTechResp = await conversationalAgent.chatWithCustomer(panicMsg, {
    customerName: 'Sarah',
    customerRole: 'NON_TECHNICAL',
  });
  assert.strictEqual(nonTechResp.detectedSentiment, 'PANIC');
  assert.strictEqual(nonTechResp.deEscalationApplied, true);
  assert.ok(nonTechResp.empatheticGreeting.includes('Sarah'));
  assert.ok(nonTechResp.empatheticGreeting.includes('urgent situation'));
  assert.ok(nonTechResp.tailoredExplanation.includes('without any data risk'));
  assert.strictEqual(nonTechResp.estimatedResolutionMinutes, 15);
  console.log('  ✓ Non-Technical Customer mode verified: Zero jargon, empathetic reassurance, 15m ETA.');

  // B. Engineering Customer During Outage (Exact commands & technical diagnostics)
  const engResp = await conversationalAgent.chatWithCustomer(
    'Socket connection refused on 502 gateway error across upstream cluster',
    { customerName: 'Alex', customerRole: 'ENGINEER' }
  );
  assert.ok(engResp.tailoredExplanation.includes('cascading upstream connection refusal'));
  assert.ok(engResp.immediateActionPlan.some((cmd) => cmd.includes('systemctl restart')));
  assert.ok(engResp.technicalArtifacts && engResp.technicalArtifacts.length > 0);
  console.log('  ✓ Engineering Customer mode verified: Accurate diagnostics and remediation commands.');

  // C. Executive Customer During Escalation
  const execResp = await conversationalAgent.chatWithCustomer(frustMsg, {
    customerName: 'David',
    customerRole: 'EXECUTIVE',
  });
  assert.strictEqual(execResp.deEscalationApplied, true);
  assert.ok(execResp.tailoredExplanation.includes('Tier-1 Autonomous Priority'));
  assert.strictEqual(execResp.estimatedResolutionMinutes, 10);
  console.log('  ✓ Executive Customer mode verified: Tier-1 escalation, prioritized allocation.');

  // =========================================================================
  // 3. HARDENED NEURAL NETWORK CUSTOMER INTENT CLASSIFICATION & ADAM TRAINING
  // =========================================================================
  console.log('  -> 3. Testing Hardened Neural Network on Customer Dialogue Vectors...');
  
  const customerVec = neuralThreatClassifier.vectorize({
    conversationalQuery: 'urgent outage production checkout down with deadlocks',
    customerContext: {
      urgencyScore: 0.95,
      sentimentScore: -0.9,
      isTechnicalAudience: false,
    },
    openPorts: [80, 443],
  });

  assert.strictEqual(customerVec.length, 64);
  assert.ok(Math.abs(customerVec[7] - 0.95) < 0.001, 'Urgency score encoded in neural tensor index 7');
  assert.ok(Math.abs(customerVec[8] - 0.05) < 0.001, 'Negative sentiment encoded in neural tensor index 8');
  assert.strictEqual(customerVec[9], 0.0, 'Non-technical audience encoded in neural tensor index 9');

  // Verify Adam Online Backpropagation on Customer Classes
  const targetCustClass = 'CUSTOMER_OUTAGE_PANIC';
  const initLoss = neuralThreatClassifier.trainSample(customerVec, targetCustClass, 0.05);
  let finalLoss = initLoss;
  for (let step = 0; step < 20; step++) {
    finalLoss = neuralThreatClassifier.trainSample(customerVec, targetCustClass, 0.08);
  }
  assert.ok(finalLoss < initLoss, 'Loss must decrease with Adam optimizer');

  const pred = neuralThreatClassifier.predict(customerVec);
  console.log(`  ✓ Neural learning on customer intent '${targetCustClass}': Loss ${initLoss.toFixed(4)} -> ${finalLoss.toFixed(4)} (Prob: ${(pred.classProbabilities[targetCustClass] * 100).toFixed(1)}%).`);

  console.log('✓ Deep Customer Conversational Intelligence & Hardened Neural Test Suite ALL PASSED!\n');
}

if (require.main === module) {
  testCustomerConversationalNeural().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
