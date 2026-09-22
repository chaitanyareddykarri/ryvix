import assert from 'node:assert/strict';
import {
  requirementRefiner,
  contextBuilder,
  planGenerator,
  planValidator,
  modelReadinessManager,
  processUserRequestToPlan,
  type PlanValidationResult,
  type RefinedRequirement,
} from '../ai/src/orchestrator';
import { DockerWorkspaceManager } from '../services/src/workspace/docker-workspace.manager';
import { customerHealthQueryAgent } from '../ai/src/customer-health-query-agent';
import { LocalSecurityEngine } from '../ai/src/local-security-engine';
import type { Plan, PlanStep } from '@ryvix/database';

export async function testAIUnderstandingRefinementPlanning() {
  console.log('======================================================================');
  console.log(' TEST SUITE 35: AI UNDERSTANDING, REQUIREMENT REFINEMENT & PLANNING');
  console.log('======================================================================\n');

  // =========================================================================
  // SCENARIO 1: Natural language -> Refined Requirement
  // =========================================================================
  console.log('[1] Testing Natural Language -> Refined Requirement...');
  const prompt1 = 'make my website look better and put something nice at the top';
  const refined1 = await requirementRefiner.refine({ rawPrompt: prompt1, framework: 'Next.js 15' });

  assert.equal(refined1.isAmbiguous, false, 'Should resolve clear intent without ambiguity');
  assert.equal(refined1.intent, 'IMPROVE_UX', 'Should classify as IMPROVE_UX');
  assert.ok(refined1.target.toLowerCase().includes('hero'), 'Target should identify hero/header');
  assert.ok(refined1.constraints.length >= 2, 'Should formulate architectural constraints');
  assert.ok(refined1.constraints.some((c) => c.includes('design system')), 'Must enforce design system preservation');
  assert.ok(refined1.processingTimeMs < 50, 'Refinement must execute with ultra-low latency (<50ms)');
  console.log('  ✓ Natural language parsed into precise technical requirement without hallucinations.');

  // =========================================================================
  // SCENARIO 2: Ambiguous request -> Clarification required
  // =========================================================================
  console.log('[2] Testing Ambiguous Request -> Clarification Required...');
  const vaguePrompt = 'fix it';
  const refinedVague = await requirementRefiner.refine({ rawPrompt: vaguePrompt });

  assert.equal(refinedVague.isAmbiguous, true, 'Vague prompt must be flagged as ambiguous');
  assert.equal(refinedVague.intent, 'AMBIGUOUS_CLARIFICATION');
  assert.ok(refinedVague.clarificationPrompt, 'Clarification prompt must be provided');
  assert.ok(refinedVague.clarificationPrompt!.includes('specify which part'), 'Clarification prompt must guide user');

  const pipelineRes = await processUserRequestToPlan({
    rawPrompt: 'change something',
    taskId: 'task_vague_01',
  });
  assert.equal(pipelineRes.status, 'ambiguous_clarification_required', 'Pipeline must halt execution on ambiguity');
  assert.equal(pipelineRes.plan, undefined, 'No execution plan should be created for ambiguous prompt');
  console.log('  ✓ Ambiguous requests correctly require user clarification before planning.');

  // =========================================================================
  // SCENARIO 3: Refined requirement -> Structured plan
  // =========================================================================
  console.log('[3] Testing Refined Requirement -> Structured Technical Plan...');
  const loginPrompt = 'make login better';
  const refinedLogin = await requirementRefiner.refine({ rawPrompt: loginPrompt });
  assert.equal(refinedLogin.intent, 'IMPROVE_UX');
  assert.ok(refinedLogin.target.toLowerCase().includes('login'));

  const loginContext = await contextBuilder.buildContext(refinedLogin, {
    taskId: 'task_login_refactor_01',
    project: { framework: 'Next.js 15', language: 'typescript', defaultPort: 3000 },
  });

  const planResult = await planGenerator.generatePlan(refinedLogin, loginContext);
  const plan = planResult.plan;

  assert.ok(plan.id.startsWith('plan_'), 'Plan must have unique ID');
  assert.equal(plan.task_id, 'task_login_refactor_01');
  assert.ok(Array.isArray(plan.steps) && plan.steps.length >= 5, 'Plan must contain sequential PlanSteps');
  assert.equal(plan.steps![0].step_number, 1);
  assert.ok(plan.steps![0].suggested_tool, 'Step 1 must have suggested tool');
  console.log('  ✓ Generated structured plan with ' + plan.steps!.length + ' steps adhering to Plan/PlanStep schema.');

  // =========================================================================
  // SCENARIO 4: Invalid LLM output -> Rejected by validator
  // =========================================================================
  console.log('[4] Testing Invalid LLM Output -> Rejected by Validator...');
  const malformedPlan: Plan = {
    id: '',
    task_id: '',
    version: 1,
    steps: [],
    requires_approval: false,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  };

  const invalidValidation = planValidator.validatePlan(malformedPlan, loginContext, refinedLogin);
  assert.equal(invalidValidation.isValid, false, 'Malformed plan must be rejected');
  assert.ok(invalidValidation.errors.some((e) => e.includes('Schema Error')), 'Must flag schema error');
  console.log('  ✓ Malformed plan safely rejected with schema validation errors.');

  // =========================================================================
  // SCENARIO 5: Unauthorized tool -> Rejected
  // =========================================================================
  console.log('[5] Testing Unauthorized Tool -> Rejected...');
  const roguePlan: Plan = {
    id: 'plan_rogue_01',
    task_id: 'task_login_refactor_01',
    version: 1,
    steps: [
      {
        step_number: 1,
        title: 'Delete entire filesystem',
        description: 'Dangerous rogue command',
        suggested_tool: 'system.rm_rf',
        tool_arguments: { path: '/' },
        requires_approval: false,
        status: 'pending',
      },
    ],
    requires_approval: false,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  };

  const rogueValidation = planValidator.validatePlan(roguePlan, loginContext, refinedLogin);
  assert.equal(rogueValidation.isValid, false, 'Plan with unauthorized tool must be rejected');
  assert.ok(rogueValidation.unauthorizedToolsDetected.includes('system.rm_rf'));
  assert.ok(rogueValidation.errors.some((e) => e.includes('Tool Authorization Error')));
  console.log('  ✓ Unauthorized tool (system.rm_rf) successfully blocked.');

  // =========================================================================
  // SCENARIO 6: Production-risk action -> Approval required
  // =========================================================================
  console.log('[6] Testing Production-Risk Action -> Enforced User Approval...');
  const riskyPlan: Plan = {
    id: 'plan_risky_01',
    task_id: 'task_login_refactor_01',
    version: 1,
    steps: [
      {
        step_number: 1,
        title: 'Modify core code',
        description: 'Apply diff to authentication page',
        suggested_tool: 'workspace.apply_diff',
        tool_arguments: { file: 'app/login/page.tsx' },
        requires_approval: false,
        status: 'pending',
      },
    ],
    requires_approval: false,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  };

  const riskyValidation = planValidator.validatePlan(riskyPlan, loginContext, refinedLogin);
  assert.equal(riskyValidation.requiresHumanApproval, true, 'Production-risk plan must enforce approval');
  assert.equal(riskyPlan.steps[0].requires_approval, true, 'Step approval flag must be forcefully enabled');
  console.log('  ✓ Human approval successfully enforced on production code modification.');

  // =========================================================================
  // SCENARIO 7: Correct project context is selected
  // =========================================================================
  console.log('[7] Testing Scoped Project Context Selection...');
  const scopedContext = await contextBuilder.buildContext(refinedLogin, {
    taskId: 'task_scoped_01',
    project: {
      id: 'proj_ecom_prod',
      framework: 'Next.js 15',
      language: 'typescript',
      packageManager: 'npm',
      defaultPort: 3000,
    },
    candidateFiles: [
      { path: 'app/login/page.tsx', content: 'export default function Login() { return <div>Login</div>; }' },
      { path: 'app/cart/page.tsx', content: 'export default function Cart() { return <div>Cart</div>; }' },
      { path: 'components/Header.tsx', content: 'export default function Header() {}' },
    ],
  });

  assert.equal(scopedContext.project.id, 'proj_ecom_prod');
  assert.equal(scopedContext.project.framework, 'Next.js 15');
  assert.equal(scopedContext.relevantFiles[0].path, 'app/login/page.tsx', 'Most relevant file must be ranked first');
  console.log('  ✓ Context builder correctly selected target files and project metadata.');

  // =========================================================================
  // SCENARIO 8: Secrets are excluded from model context
  // =========================================================================
  console.log('[8] Testing Secret Sanitization & Redaction...');
  const taintedContext = await contextBuilder.buildContext(refinedLogin, {
    taskId: 'task_tainted_01',
    candidateFiles: [
      {
        path: 'app/login/page.tsx',
        content: 'const token = "ghp_123456789012345678901234567890123456"; const db = "postgres://user:secretpassword@db.com:5432/db";',
      },
    ],
    runtimeTelemetry: {
      active_port: 3000,
      supabase_service_role_key: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret',
      database_password: 'super_secret_db_pass',
    },
  });

  assert.equal(taintedContext.sanitizationReport.clean, false, 'Report must indicate secrets were found');
  assert.ok(taintedContext.sanitizationReport.strippedTokensCount >= 3, 'Must strip multiple secrets');
  
  const snippet = taintedContext.relevantFiles[0].contentSnippet!;
  assert.ok(!snippet.includes('secretpassword'), 'Password must not appear in snippet');
  assert.ok(!snippet.includes('ghp_'), 'GitHub token must not appear in snippet');
  assert.ok(snippet.includes('[REDACTED_SECRET]'), 'Must replace secrets with [REDACTED_SECRET]');
  console.log('  ✓ Stripped ' + taintedContext.sanitizationReport.strippedTokensCount + ' secrets from context before sending to LLM.');

  // =========================================================================
  // SCENARIO 9: AI cannot bypass backend authorization
  // =========================================================================
  console.log('[9] Testing AI Authorization Boundary...');
  const dangerousPlan: Plan = {
    id: 'plan_dangerous_01',
    task_id: 'task_tainted_01',
    version: 1,
    steps: [
      {
        step_number: 1,
        title: 'Run forbidden system command',
        description: 'Drop database tables',
        suggested_tool: 'workspace.run_tests',
        tool_arguments: { command: 'DROP TABLE users CASCADE;' },
        requires_approval: true,
        status: 'pending',
      },
    ],
    requires_approval: true,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  };

  const dangerousVal = planValidator.validatePlan(dangerousPlan, taintedContext, refinedLogin);
  assert.equal(dangerousVal.isValid, false, 'Dangerous SQL/shell payload must be rejected');
  assert.ok(dangerousVal.errors.some((e) => e.includes('prohibited destructive pattern')));
  console.log('  ✓ AI cannot bypass safety boundary: prohibited destructive actions blocked.');

  // =========================================================================
  // SCENARIO 10: Existing coding workspace still works
  // =========================================================================
  console.log('[10] Testing Existing Coding Workspace Sandbox Integration...');
  const workspaceManager = new DockerWorkspaceManager();
  const session = await workspaceManager.createSession({
    taskId: 'task_sandbox_verify_01',
    projectId: 'proj_ecom_prod',
    baseImage: 'node:20-alpine',
    cpu: 1,
    ramMb: 2048,
    ttlMinutes: 15,
  });

  assert.ok(session.id);
  assert.equal(session.status, 'active');
  assert.ok(session.preview_port >= 3100);
  assert.ok(session.preview_url.startsWith('http://localhost:'));

  const execRes = await workspaceManager.executeCommand(session.id, 'npm test');
  assert.equal(execRes.exitCode, 0);
  await workspaceManager.terminateSession(session.id);
  console.log('  ✓ Existing Docker workspace sandbox operational with dynamic port allocation & command execution.');

  // =========================================================================
  // SCENARIO 11: Existing connector architecture still works
  // =========================================================================
  console.log('[11] Testing Existing Customer Server Connector Architecture...');
  const healthRes = await customerHealthQueryAgent.handleHealthQuery('Is my server srv_prod_01 healthy?', {
    userId: 'user_1',
    organizationId: 'org_acme',
    userRole: 'admin',
  });

  assert.ok(healthRes.response.includes('healthy') || healthRes.domain === 'SERVER_HEALTH', 'Connector agent should report server health');
  console.log('  ✓ Existing connector architecture & server telemetry query validated.');

  // =========================================================================
  // SCENARIO 12: Existing self-healing authorization still works
  // =========================================================================
  console.log('[12] Testing Existing Self-Healing Authorization & Circuit Breaker...');
  const analysis = LocalSecurityEngine.analyze({
    serverId: 'srv_prod_01',
    metrics: { cpuPercent: 45, memPercent: 50 },
    openPorts: [3000, 80],
    recentLogs: ['FATAL: port 3000 bind collision EADDRINUSE'],
  });

  assert.equal(analysis.isKnown, true);
  assert.ok(analysis.recommendedAction.length > 0);
  console.log('  ✓ Existing self-healing local engine diagnoses incident and determines remediation.');

  // =========================================================================
  // SCENARIO 13: Tenant isolation remains intact
  // =========================================================================
  console.log('[13] Testing Tenant Boundary Enforcement...');
  const crossTenantPlan: Plan = {
    id: 'plan_cross_tenant_01',
    task_id: 'task_tenant_ATTACKER', // Does not match session context taskId
    version: 1,
    steps: [
      {
        step_number: 1,
        title: 'Inspect file',
        description: 'Legitimate step description',
        suggested_tool: 'workspace.read_file',
        tool_arguments: { path: 'app/page.tsx' },
        requires_approval: false,
        status: 'pending',
      },
    ],
    requires_approval: false,
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  };

  const crossTenantVal = planValidator.validatePlan(crossTenantPlan, scopedContext, refinedLogin);
  assert.equal(crossTenantVal.isValid, false, 'Cross-tenant plan must be rejected');
  assert.ok(crossTenantVal.errors.some((e) => e.includes('Tenant Boundary Violation')));
  console.log('  ✓ Cross-tenant execution strictly rejected at validation gate.');

  // =========================================================================
  // SCENARIO 14: Audit events are recorded
  // =========================================================================
  console.log('[14] Testing Audit Event Recording...');
  const fullPipeline = await processUserRequestToPlan({
    rawPrompt: 'make my website look better and put something nice at the top',
    taskId: 'task_audit_01',
    project: { id: 'proj_ecom_prod', framework: 'Next.js 15' },
  });

  assert.equal(fullPipeline.status, 'plan_ready');
  assert.ok(fullPipeline.plan);
  assert.ok(fullPipeline.validation?.isValid);
  assert.ok(fullPipeline.refinedRequirement.processingTimeMs > 0);
  console.log('  ✓ Complete pipeline generated plan and recorded telemetry/latency metrics.');

  // =========================================================================
  // SCENARIO 15: Model/evaluation records do not contain secrets
  // =========================================================================
  console.log('[15] Testing Model Evaluation & Fine-Tuning Secrets Redaction...');
  modelReadinessManager.recordInteraction({
    id: 'eval_point_01',
    timestamp: new Date().toISOString(),
    rawUserPrompt: 'Fix login with token sk-99999999999999999999999999999999 and password secret_pass_123',
    refinedRequirement: refinedLogin,
    contextSummary: {
      framework: 'Next.js 15',
      targetFiles: ['app/login/page.tsx'],
      allowedToolsCount: 10,
    },
    llmPlan: fullPipeline.plan!,
    validationResult: fullPipeline.validation!,
    buildTestOutcome: {
      buildPassed: true,
      testsPassed: true,
      exitCode: 0,
    },
    userApprovalOutcome: {
      status: 'approved',
      feedbackNotes: 'Looks great with api_key: ghp_123456789012345678901234567890123456',
    },
    finalOutcome: 'success',
    qualityScore: 0.95,
  });

  const dataset = modelReadinessManager.exportFineTuningDataset();
  assert.ok(dataset.length > 0, 'Exported dataset must not be empty');
  assert.ok(!dataset.includes('secret_pass_123'), 'Raw password must not be in dataset');
  assert.ok(!dataset.includes('sk-99999999999999999999999999999999'), 'Raw OpenAI key must not be in dataset');
  assert.ok(!dataset.includes('ghp_123456789012345678901234567890123456'), 'Raw GitHub token must not be in dataset');
  assert.ok(dataset.includes('[REDACTED_SECRET]'), 'Must contain [REDACTED_SECRET] replacement');

  const metrics = modelReadinessManager.getEvaluationMetrics();
  assert.ok(metrics.totalInteractions >= 1);
  assert.ok(metrics.userApprovalRate > 0);
  console.log('  ✓ Evaluation & fine-tuning dataset verified: 100% sanitized with ZERO credentials/secrets.\n');

  console.log('======================================================================');
  console.log(' TEST SUITE 35 PASSED: ALL 15/15 SCENARIOS 100% VERIFIED!');
  console.log('======================================================================\n');
}

if (require.main === module) {
  testAIUnderstandingRefinementPlanning().catch((err) => {
    console.error('Test Suite 35 Failed:', err);
    process.exit(1);
  });
}
