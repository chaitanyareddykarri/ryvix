import {testAuditRegressions} from './audit-regressions.test';
import {testOfflineAndGmail} from './offline-and-gmail.test';
import {testExperienceLearning} from './experience-learning.test';
import {testRepositoryKnowledge} from './repository-knowledge.test';
import {testWhatsAppPhone} from './whatsapp-phone.test';
import {testWhatsAppAssistant} from './whatsapp-assistant.test';
import {testRecoveryOutbound} from './recovery-outbound.test';
import {testEmailNotifications} from './email-notifications.test';
import { seedHealthFixtures } from './health-fixtures';
import { testSettingsMutations } from './settings-mutations.test';
import { testFrontierDeepLearning } from './frontier-deep-learning.test';
import { testAiSelfUnderstandingAndCodingSpace } from './ai-self-understanding-and-coding-space.test';
import { testDeepCognitiveArchitecture } from './deep-cognitive-architecture.test';
import { testCognitiveMemory } from './cognitive-memory.test';
import { testAIUnderstandingRefinementPlanning } from './ai-understanding-refinement-planning.test';
import { testWebChatStreaming } from './web-chat-streaming.test';
import { testNetworkServerControl } from './network-server-control.test';
import { testCustomerInfrastructureHealth } from './customer-infrastructure-health.test';
import { testCustomerServerHealthAgent } from './customer-server-health-agent.test';
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
import { testRepositoryAnalyzer } from './repository-analyzer.test';
import { testTaskRouteAuthorization } from './task-route-authorization.test';
import { testServerConnectorPipeline } from './server-connector-pipeline.test';
import { testCodingWorkspacePipeline } from './coding-workspace.test';
import { testAuthLifecycle } from './auth-lifecycle.test';
import { testServerOutage } from './server-outage.test';
import { testSelfHealingFlow } from './self-healing.test';
import { testCircuitBreakerFlow } from './circuit-breaker.test';
import { testApiKeySecurity } from './api-keys.test';
import { testTenantPredicateUnit } from './tenant-predicate.test';
import { testRealExecution } from './real-execution.test';
import { testAuthSecurityBoundary } from './auth-security-boundary.test';
import { testAuthRouteSecurity } from './auth-route-security.test';
import { testDashboardData } from './dashboard-data.test';
import { testTaskArtifacts } from './task-artifacts.test';
import { testPreviewGrants } from './preview-grants.test';
import { testConnectionPersistence } from './connection-persistence.test';
import { testServerTelemetry } from './server-telemetry.test';

async function runAllTests() {
  console.log('============================================================');
  console.log('RYVIX RUNTIME ARCHITECTURE & DATABASE TEST SUITE');
  console.log('============================================================\\n');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  seedHealthFixtures();
  const testCases: { name: string; fn: () => Promise<void> }[] = [
    {name:'Audit Safety and Evidence Regressions',fn:testAuditRegressions},
    {name:'Offline AI Isolation and Gmail Scheduling',fn:testOfflineAndGmail},
    {name:'WhatsApp Assistant Intent and Reply Boundaries',fn:testWhatsAppAssistant},
    {name:'WhatsApp Phone and SMTP Transport Boundaries',fn:testWhatsAppPhone},
    {name:'Repository Knowledge Source Boundaries and Commit Refresh',fn:testRepositoryKnowledge},
    {name:'Truthful Learning Metrics and Experience Boundaries',fn:testExperienceLearning},
    { name: 'Current Repository Chat Scope, Commit Pinning and Secret Exclusion', fn:(await import('./repository-chat-context.test')).testRepositoryChatContext },
    { name: 'Device Command Signature, Target and Path Binding', fn:(await import('./server-command-protocol.test')).testServerCommandProtocol },
    { name: 'Worker Host Cleanup and Preview Routing', fn:(await import('./worker-host.test')).testWorkerHost },
    { name: 'Verified Channels, Reviewed Learning and Semantic Reranking', fn:(await import('./channels-learning.test')).testChannelsLearning },
    { name: 'Chat Retrieval Tenant Scope and Context Budget', fn: (await import('./chat-retrieval.test')).testChatRetrieval },
    { name: 'AI Streaming, Conversation Ownership and Weight Validation', fn: (await import('./ai-upgrade.test')).testAiUpgrade },
    { name: 'Settings Transaction and Audit', fn: testSettingsMutations },
    { name: 'Settings Authentication and Safe Errors', fn: (await import('./settings-boundary.test')).testSettingsBoundary },
    { name: 'PR Approval Durability, Reauthorization and Retry', fn: (await import('./pr-shipping-approval.test')).testPrShippingApproval },
    { name: 'Durable Repository Job Queue and Lease Boundaries', fn: (await import('./repository-job-store.test')).testRepositoryJobStore },
    { name: 'Database Errors Preserve Internal Cause Without Leaking Details', fn: (await import('./direct-db-errors.test')).testDirectDbErrors },
    { name: 'Workspace Route Uses Worker Boundary and Hides Internal Errors', fn: (await import('./workspace-route.test')).testWorkspaceRouteBoundary },
    { name: 'Repository Selection and Vault Transaction', fn: (await import('./repository-connection.test')).testRepositoryConnection },
    { name: 'Verified Deployment Status Ingestion', fn: (await import('./deployment-ingestion.test')).testDeploymentIngestion },
    { name: 'Public Probe Destination and Evidence Boundaries', fn: (await import('./public-probe.test')).testPublicProbe },
    { name: 'Tenant-Scoped Observability Records', fn: (await import('./observability-logs.test')).testObservabilityLogs },
    { name: 'Backend Operation Audit Permission Rechecks', fn: (await import('./operation-audit.test')).testOperationAudit },
    { name: 'Gmail Unverified Sender and Digest Escaping', fn: (await import('./gmail-boundary.test')).testGmailBoundary },
    { name: 'Durable OTP Consumption, Resend and Secret Isolation', fn: (await import('./auth-challenge-store.test')).testAuthChallengeStore },
    { name: 'Task Cancellation, Authorization and Cleanup Retry', fn: (await import('./task-lifecycle.test')).testTaskLifecycle },
    { name: 'Signed Device Protocol and Measured Telemetry', fn: (await import('./device-protocol.test')).testDeviceProtocol },
    { name: 'Pinned Agent Installer and Integrity Boundaries', fn: (await import('./agent-installer.test')).testAgentInstaller },
    { name: 'Telemetry SSE Authentication and Backpressure', fn: (await import('./telemetry-stream.test')).testTelemetryStream },
    { name: 'Diagnostic Context Tenant Scope and Missing Data', fn: (await import('./diagnostic-context.test')).testDiagnosticContext },
    { name: 'Device Ingestion Transactions, Replay and Revocation', fn: (await import('./device-ingestion.test')).testDeviceIngestion },
    { name: 'Server Telemetry Freshness and Tenant Authorization', fn: testServerTelemetry },
    { name: 'Dashboard Tenant Scoping, Empty Results and Honest Failures', fn: testDashboardData },
    { name: 'Measured Task Artifact Diffs', fn: testTaskArtifacts },
    { name: 'Preview Workspace Grants, Tampering and Expiration', fn: testPreviewGrants },
    { name: 'Connection Persistence, Vault Failures and Tenant Authorization', fn: testConnectionPersistence },
    { name: 'OTP Secret, Purpose, Expiry and Resend Boundaries', fn: testAuthSecurityBoundary },
    { name: 'Authentication Handlers Reject Failed Sessions and Cross-Identity Resends', fn: testAuthRouteSecurity },
    { name: 'Authentication Lifecycle & Multi-Tenant Security (20 Points)', fn: testAuthLifecycle },
    { name: 'In-Memory Outage Evaluator Unit Cases', fn: testServerOutage },
    { name: 'Self-Healing Engine & Resolution', fn: testSelfHealingFlow },
    { name: '3-Attempt Circuit Breaker & Escalation', fn: testCircuitBreakerFlow },
    { name: 'Path 1: AI Coding Workspace & PR Pipeline (Phases 1-4)', fn: testCodingWorkspacePipeline },
    { name: 'GitHub App Access & Repository Selection Lifecycle', fn: testGitHubIntegration },
    { name: 'Real-Time Repository Analyzer & Deployment Detector', fn: testRepositoryAnalyzer },
    { name: 'Task and Settings Route Authorization', fn: testTaskRouteAuthorization },
    { name: 'Multi-Provider LLM Gateway & Rate-Limit Failover', fn: testAIModelGateway },
    { name: 'Interactive AI Coding Assistant & Self-Debugger', fn: testCodingAssistant },
    { name: 'Hybrid Autonomous Decision Engine & Self-Learning Memory', fn: testHybridLearningEngine },
    { name: 'Path 2: Server Connectors & Autonomous Host Daemons (Phases 1-4)', fn: testServerConnectorPipeline },
    { name: 'Connected AI Log Parsing, Threat Detection & Cluster IP Blocker', fn: testConnectedClusterSecurity },
    { name: 'Server Archetypes, Modules & User Server Access Pathways', fn: testServerModulesAndAccess },
    { name: 'Embedded Deep Neural Network Threat Classifier (<0.05ms)', fn: testNeuralNetworkThreatClassifier },


    { name: 'API Key Cryptographic Security & Scopes', fn: testApiKeySecurity },
    { name: 'Tenant Predicate Unit Cases (not database RLS)', fn: testTenantPredicateUnit },
    { name: 'Real Docker, GitHub, Cloud and Authorization Boundaries', fn: testRealExecution },
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
    { name: 'Deep Network Engine, Heterogeneous Server Control & Port Matrix', fn: testNetworkServerControl as any },
    { name: 'Customer Infrastructure Health, Website Telemetry & Onboarding AGI', fn: testCustomerInfrastructureHealth as any },
    { name: 'Customer Server & Website Health Query Agent (22 Scenarios)', fn: testCustomerServerHealthAgent as any },
    { name: 'AI Understanding, Requirement Refinement, LLM Planning & Evaluation (15 Scenarios)', fn: testAIUnderstandingRefinementPlanning },
    { name: 'Mem0 3-Tier Cognitive Memory Architecture (Short, Long, Semantic)', fn: testCognitiveMemory },
        { name: 'Deep Cognitive Autonomous Architecture (8 Advanced AI Subsystems)', fn: testDeepCognitiveArchitecture },
        { name: 'AI Deep Self-Understanding, Coding Spaces & AGI Core Architecture', fn: testAiSelfUnderstandingAndCodingSpace },
    { name: 'Frontier Deep Learning Architectures & Zero-Collision Synergy', fn: testFrontierDeepLearning },
    { name: 'Fixture Integration and Optional HTTP Authentication Boundary', fn: testTotalProjectIntegration },

  ];

  testCases.push({name:'Cloud target and WhatsApp outbound boundaries',fn:testRecoveryOutbound});
  testCases.push({name:'Email notification content and sender boundaries',fn:testEmailNotifications});
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
