import { testWebChatStreaming } from './web-chat-streaming.test';
import { testRagEngineAndCicd } from './rag-engine-and-cicd.test';
import { testRiskAlertNotification } from './risk-alert-notification.test';
import { testWebHttpsFolderInternalApiThreats } from './web-https-folder-internal-api-threats.test';
import { testDeepBrainDeliberativeAgi } from './deep-brain-deliberative-agi.test';
import { testTopLevelAgiOrchestrator } from './top-level-agi-orchestrator.test';
import { testWebOutageNeuralRecovery } from './web-outage-neural-recovery.test';
import { testProjectStackCoThinking } from './project-stack-co-thinking.test';
import { testCustomerConversationalNeural } from './customer-conversational-neural.test';
import { testDeepConversationalAgent } from './deep-conversational-agent.test';
import { testDeepSelfTraining } from './deep-self-training.test';
import { testGeneralIntelligence } from './general-intelligence.test';
import { testDeepSreIntelligence } from './deep-sre-intelligence.test';
import { testLogAnalysisEngine } from './log-analysis.test';
import { testTotalProjectIntegration } from './total-project-integration.test';
import { testNeuralNetworkThreatClassifier } from './neural-network.test';
import { testServerModulesAndAccess } from './server-modules-and-access.test';
import { testConnectedClusterSecurity } from './connected-cluster-security.test';
import { testCodingAssistant } from './coding-assistant.test';
import { testHybridLearningEngine } from './hybrid-learning-engine.test';
import { testAIModelGateway } from './ai-model-gateway.test';
import { testGitHubIntegration } from './github-integration.test';
import { testServerConnectorPipeline } from './server-connector-pipeline.test';
import { testCodingWorkspacePipeline } from './coding-workspace.test';
import { testAuthLifecycle } from './auth-lifecycle.test';
import { testServerOutage } from './server-outage.test';
import { testSelfHealingFlow } from './self-healing.test';
import { testCircuitBreakerFlow } from './circuit-breaker.test';
import { testWorkspaceCleanupFlow } from './workspace-cleanup.test';
import { testApiKeySecurity } from './api-keys.test';
import { testCrossTenantRls } from './cross-tenant-rls.test';

async function runAllTests() {
  console.log('============================================================');
  console.log('RYVIX RUNTIME ARCHITECTURE & DATABASE TEST SUITE');
  console.log('============================================================\\n');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  const testCases: { name: string; fn: () => Promise<void> }[] = [
    { name: 'Authentication Lifecycle & Multi-Tenant Security (20 Points)', fn: testAuthLifecycle },
    { name: 'Server Outage & Differential Diagnosis', fn: testServerOutage },
    { name: 'Self-Healing Engine & Resolution', fn: testSelfHealingFlow },
    { name: '3-Attempt Circuit Breaker & Escalation', fn: testCircuitBreakerFlow },
    { name: 'Workspace Expiry & Docker Teardown', fn: testWorkspaceCleanupFlow },
    { name: 'Path 1: AI Coding Workspace & PR Pipeline (Phases 1-4)', fn: testCodingWorkspacePipeline },
    { name: 'GitHub App Access & Repository Selection Lifecycle', fn: testGitHubIntegration },
    { name: 'Multi-Provider LLM Gateway & Rate-Limit Failover', fn: testAIModelGateway },
    { name: 'Interactive AI Coding Assistant & Self-Debugger', fn: testCodingAssistant },
    { name: 'Hybrid Autonomous Decision Engine & Self-Learning Memory', fn: testHybridLearningEngine },
    { name: 'Path 2: Server Connectors & Autonomous Host Daemons (Phases 1-4)', fn: testServerConnectorPipeline },
    { name: 'Connected AI Log Parsing, Threat Detection & Cluster IP Blocker', fn: testConnectedClusterSecurity },
    { name: 'Server Archetypes, Modules & User Server Access Pathways', fn: testServerModulesAndAccess },
    { name: 'Embedded Deep Neural Network Threat Classifier (<0.05ms)', fn: testNeuralNetworkThreatClassifier },


    { name: 'API Key Cryptographic Security & Scopes', fn: testApiKeySecurity },
    { name: 'Cross-Tenant RLS & Audit Immutability', fn: testCrossTenantRls },
    { name: 'Deep Server Log Analysis & Root Cause Diagnosis Engine', fn: testLogAnalysisEngine },
    { name: 'Level-5 SRE Autonomous Intelligence Suite (5 Deep Dimensions)', fn: testDeepSreIntelligence },
    { name: 'Autonomous General Intelligence (AGI) & Deductive Reasoning Engine', fn: testGeneralIntelligence },
    { name: 'Deep Conversational Dialogue & Intent Understanding Agent', fn: testDeepConversationalAgent },
    { name: 'Deep Self-Training, Synthetic Distillation & Meta-Learning Engine', fn: testDeepSelfTraining },
    { name: 'Deep Customer Conversational Intelligence & Hardened Neural Architecture', fn: testCustomerConversationalNeural },
    { name: 'Project Stack Architecture Awareness & External LLM Co-Thinking Engine', fn: testProjectStackCoThinking },
    { name: 'Web Page Outage Root-Cause Diagnostics & Multi-Option Server Recovery Engine', fn: testWebOutageNeuralRecovery },
        { name: 'Top-Level AGI Cognitive Orchestrator & Epistemic World Model (OODA Apex)', fn: testTopLevelAgiOrchestrator as any },
    { name: 'Dual-Process Human Brain Cognition & Multi-LLM Deliberation (System 1 + 2)', fn: testDeepBrainDeliberativeAgi as any },
    { name: 'Web, HTTPS, Folder Brute-Force & Internal API Auth Protection Suite', fn: testWebHttpsFolderInternalApiThreats as any },
    { name: 'Real-Time Risk Alert & Multi-Channel Developer Notification System', fn: testRiskAlertNotification as any },
    { name: 'Retrieval-Augmented Generation (RAG) & CI/CD Pipeline Automation', fn: testRagEngineAndCicd as any },
    { name: 'Real-Time Web Chat Console & SSE Streaming Protocol', fn: testWebChatStreaming as any },
{ name: 'GRAND FINALE: Master End-to-End Total Project Integration', fn: testTotalProjectIntegration },

  ];

  for (const tc of testCases) {
    try {
      await tc.fn();
      passed++;
    } catch (err: any) {
      failed++;
      console.error(`❌ FAILED: ${tc.name}`);
      console.error(err);
    }
  }

  const duration = Date.now() - startTime;
  console.log('============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | DURATION: ${duration}ms`);
  console.log('============================================================\\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
