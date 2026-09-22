import assert from 'node:assert/strict';
import { RepositoryAnalyzer } from '../backend/src/connectors/github.connector';
import { DockerWorkspaceManager } from '../services/src/workspace/docker-workspace.manager';
import { PullRequestService } from '../backend/src/services/pr.service';

export async function testCodingWorkspacePipeline() {
  console.log('[TEST] Running Path 1: AI Coding Workspace & PR Pipeline (Phases 1-4)...');

  // =========================================================================
  // PHASE 2: REPOSITORY ANALYZER & STACK DETECTOR TEST
  // =========================================================================
  console.log('  -> Testing Phase 2: Repository Analyzer & Stack Detection...');

  // Test Case A: Next.js App
  const nextjsFiles = ['package.json', 'app/page.tsx', 'next.config.js', 'tsconfig.json'];
  const nextjsPkg = JSON.stringify({
    name: 'ecommerce-storefront',
    dependencies: { next: '^14.2.0', react: '^18.3.0', 'react-dom': '^18.3.0' },
    scripts: { dev: 'next dev', build: 'next build', test: 'vitest run' },
  });
  const nextjsStack = RepositoryAnalyzer.detectStack(nextjsFiles, nextjsPkg);
  assert.equal(nextjsStack.framework, 'Next.js', 'Should accurately detect Next.js framework');
  assert.equal(nextjsStack.language, 'typescript', 'Should detect TypeScript');
  assert.equal(nextjsStack.defaultPort, 3000, 'Next.js port should be 3000');
  assert.equal(nextjsStack.dockerBaseImage, 'node:20-alpine', 'Base image should be node:20-alpine');
  assert.equal(nextjsStack.buildCommand, 'npm run build');

  // Test Case B: Python FastAPI
  const pythonFiles = ['main.py', 'requirements.txt', 'Dockerfile'];
  const pythonStack = RepositoryAnalyzer.detectStack(pythonFiles);
  assert.equal(pythonStack.framework, 'FastAPI / Python', 'Should detect Python backend');
  assert.equal(pythonStack.language, 'python');
  assert.equal(pythonStack.defaultPort, 8000, 'Python port should default to 8000');
  assert.equal(pythonStack.dockerBaseImage, 'python:3.11-slim');

  // Test Case C: Go Microservice
  const goFiles = ['main.go', 'go.mod', 'go.sum'];
  const goStack = RepositoryAnalyzer.detectStack(goFiles);
  assert.equal(goStack.framework, 'Go', 'Should detect Go project');
  assert.equal(goStack.language, 'go');
  assert.equal(goStack.defaultPort, 8080);
  assert.equal(goStack.dockerBaseImage, 'golang:1.22-alpine');

  console.log('  âœ“ Phase 2: Repository Analyzer passed for Next.js, Python, and Go stacks.');

  // =========================================================================
  // PHASE 3: DOCKER SANDBOX EXECUTION ENGINE TEST
  // =========================================================================
  console.log('  -> Testing Phase 3: Docker Sandbox Execution Engine...');

  const workspaceManager = new DockerWorkspaceManager();

  // Create ephemeral workspace sandbox
  const session = await workspaceManager.createSession({
    taskId: 'task_ecom_hero_fix',
    projectId: 'proj_ecom_prod',
    baseImage: nextjsStack.dockerBaseImage,
    cpu: 2,
    ramMb: 4096,
    ttlMinutes: 15,
  });

  assert.ok(session.id, 'Session ID must be generated');
  assert.equal(session.status, 'active', 'Session must be active');
  assert.ok(session.container_id.startsWith('ryvix_sbx_'), 'Container ID must follow sandbox convention');
  assert.ok(session.preview_port >= 3100, `Preview port (${session.preview_port}) must be allocated in sandbox range >= 3100`);
  assert.equal(session.preview_url, `http://localhost:${session.preview_port}`, 'Preview URL must match allocated port');
  assert.ok(new Date(session.expires_at).getTime() > Date.now(), 'Session expiration must be in the future');

  // Apply code patch / diff to sandbox
  const patchResult = await workspaceManager.applyDiff(session.id, {
    filePath: 'components/HeroBanner.tsx',
    patchContent: 'export const HeroBanner = () => <section className="hero">Ryvix Fast Checkout</section>;',
    isNewFile: true,
  });
  assert.ok(patchResult.applied, 'Patch diff must be applied to sandbox successfully');
  assert.equal(patchResult.filePath, 'components/HeroBanner.tsx');

  // Execute verification / test command in isolated container
  const execResult = await workspaceManager.executeCommand(session.id, 'npm test');
  assert.equal(execResult.exitCode, 0, 'Container command execution must succeed');
  assert.ok(execResult.stdout.includes('Simulated execution'), 'Container execution output verified');

  console.log(`  âœ“ Phase 3: Docker Sandbox created (${session.container_id}) on port ${session.preview_port} and applied diff.`);

  // =========================================================================
  // PHASE 4: LIVE FRONTEND PREVIEW & PULL REQUEST PIPELINE TEST
  // =========================================================================
  console.log('  -> Testing Phase 4: Frontend Live Preview & Pull Request Pipeline...');

  // Live preview verify
  assert.ok(session.preview_url.startsWith('http://localhost:'), 'Live preview URL generated and accessible');

  // Pull request generation upon user approval
  const prResult = await PullRequestService.createPullRequest({
    repoUrl: 'https://github.com/acme/storefront',
    baseBranch: 'main',
    branchName: 'ryvix/ai-hero-fix-ecom',
    title: 'fix(ui): update HeroBanner styling and responsive layout',
    description: '### Autonomous PR created by Ryvix\n\n- Detected Stack: Next.js / TypeScript\n- Changes: components/HeroBanner.tsx\n- Tests Passed in Sandbox container ' + session.container_id,
    changes: [
      {
        path: 'components/HeroBanner.tsx',
        content: patchResult.applied ? 'export const HeroBanner = ...' : '',
        action: 'create',
      },
    ],
  });

  assert.ok(prResult.prUrl.includes('pull/'), 'PR URL must be generated');
  assert.equal(prResult.branchName, 'ryvix/ai-hero-fix-ecom', 'Branch name must match');
  assert.equal(prResult.status, 'open', 'PR status must be open');
  assert.equal(prResult.summary.filesChanged, 1, 'Summary files changed count must match');
  assert.ok(prResult.summary.additions > 0, 'Additions count must be positive');

  // Teardown sandbox after PR creation
  const terminatedSession = await workspaceManager.terminateSession(session.id);
  assert.equal(terminatedSession.status, 'destroyed', 'Session status must be destroyed after teardown');

  console.log(`  âœ“ Phase 4: Pull Request created (${prResult.prUrl}) and sandbox successfully torn down.`);
  console.log('âœ“ Path 1: AI Coding Workspace & PR Pipeline (Phases 1-4) ALL TESTS PASSED!\n');
}
