import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import { GitHubConnector } from '../backend/src/connectors/github.connector';
import { PullRequestService } from '../backend/src/services/pr.service';

export async function testGitHubIntegration() {
  console.log('[TEST] Running GitHub App Access, Repository Selection & Git Lifecycle Test...');

  const appId = 'app_ryvix_production';
  const appSecret = 'ryvix_gh_app_private_hmac_secret_2026';
  const installationId = 58392014;
  const projectId = 'proj_ecommerce_main';

  // =========================================================================
  // 1. GITHUB APP AUTHENTICATION & INSTALLATION TOKEN
  // =========================================================================
  console.log('  -> 1. Testing GitHub App JWT and Installation Access Token...');

  // Generate GitHub App JWT
  const appJwt = GitHubConnector.generateAppJwt(appId, appSecret);
  assert.ok(appJwt.split('.').length === 3, 'App JWT must consist of header.body.signature');

  // Request installation token
  const installToken = await GitHubConnector.createInstallationToken(installationId, {
    contents: 'write',
    pull_requests: 'write',
    issues: 'write',
  });
  assert.ok(installToken.token.startsWith('ghs_'), 'Installation token must have GitHub prefix ghs_');
  assert.ok(new Date(installToken.expiresAt).getTime() > Date.now(), 'Token expiry must be in the future (60m window)');
  assert.equal(installToken.permissions.contents, 'write');
  assert.equal(installToken.permissions.pull_requests, 'write');

  console.log('  ✓ GitHub App installation token issued with 60-minute scoped permissions.');

  // =========================================================================
  // 2. REPOSITORY DISCOVERY & SELECTION / LINKING
  // =========================================================================
  console.log('  -> 2. Testing Repository Discovery & Project Linking...');

  // Discover repositories accessible under the installation
  const accessibleRepos = await GitHubConnector.listAccessibleRepositories(installationId, installToken.token);
  assert.ok(accessibleRepos.length >= 2, 'Must list all granted repositories under installation');
  const selectedTarget = accessibleRepos.find((r) => r.name === 'storefront');
  assert.ok(selectedTarget, 'Must find storefront repository');
  assert.equal(selectedTarget.defaultBranch, 'main');
  assert.equal(selectedTarget.isPrivate, true);

  // Link selected repository into Ryvix Project
  const linkedRepo = GitHubConnector.linkRepository(
    projectId,
    `inst_${installationId}`,
    selectedTarget,
    ['nextjs', 'typescript']
  );
  assert.ok(linkedRepo.id.startsWith('repo_'), 'Linked repo ID must have repo_ prefix');
  assert.equal(linkedRepo.project_id, projectId, 'Linked repo must match project ID');
  assert.equal(linkedRepo.full_name, 'acme-corp/storefront');
  assert.equal(linkedRepo.default_branch, 'main');
  assert.deepEqual(linkedRepo.detected_stack, ['nextjs', 'typescript']);

  console.log(`  ✓ Repository '${linkedRepo.full_name}' selected and linked to project '${projectId}'.`);

  // =========================================================================
  // 3. ATOMIC BRANCHING & SIGNED COMMITS
  // =========================================================================
  console.log('  -> 3. Testing Atomic Branch Creation & Cryptographic Commit...');

  const featureBranch = 'ryvix/task-banner-checkout-fix';

  // Create isolated branch
  const branchResult = await GitHubConnector.createBranch(
    linkedRepo.full_name,
    linkedRepo.default_branch,
    featureBranch,
    installToken.token
  );
  assert.equal(branchResult.created, true);
  assert.equal(branchResult.ref, `refs/heads/${featureBranch}`);
  assert.ok(branchResult.sha.length >= 40, 'Branch must reference a commit SHA');

  // Commit changes with bot author identity
  const commitResult = await GitHubConnector.commitChanges(
    linkedRepo.full_name,
    featureBranch,
    [
      {
        path: 'components/HeroBanner.tsx',
        content: 'export const HeroBanner = () => <section>Fast Checkout</section>;',
      },
    ],
    'fix(ui): update hero banner for responsive screens',
    installToken.token
  );
  assert.ok(commitResult.commitSha.length >= 40, 'Must generate valid commit SHA');
  assert.equal(commitResult.branchName, featureBranch);
  assert.equal(commitResult.author, 'ryvix-bot[bot] <bot@ryvix.io>', 'Commit must be signed with bot identity');
  assert.equal(commitResult.filesCommitted, 1);

  console.log(`  ✓ Atomic branch created and signed commit (${commitResult.commitSha.slice(0, 7)}) applied.`);

  // =========================================================================
  // 4. GITHUB WEBHOOK HMAC-SHA256 SIGNATURE VERIFICATION
  // =========================================================================
  console.log('  -> 4. Testing GitHub Webhook HMAC-SHA256 Tamper Resistance...');

  const webhookSecret = 'ryvix_gh_webhook_secret_9981';
  const testPayload = JSON.stringify({
    action: 'opened',
    pull_request: { number: 101, title: 'fix(ui): update hero banner' },
    repository: { full_name: linkedRepo.full_name },
  });

  const validSignature = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(testPayload).digest('hex');

  // Verify valid webhook signature
  const isSignatureValid = GitHubConnector.verifyWebhookSignature(testPayload, validSignature, webhookSecret);
  assert.equal(isSignatureValid, true, 'Valid webhook signature must pass verification');

  // Reject tampered webhook signature
  const tamperedSignature = validSignature.slice(0, -4) + '0000';
  const isTamperedValid = GitHubConnector.verifyWebhookSignature(testPayload, tamperedSignature, webhookSecret);
  assert.equal(isTamperedValid, false, 'Tampered webhook signature must be rejected');

  console.log('  ✓ Webhook HMAC-SHA256 verification passed (tamper protection verified).');

  // =========================================================================
  // 5. PULL REQUEST GENERATION TEST
  // =========================================================================
  console.log('  -> 5. Testing Pull Request Generation with Linked Repository...');

  const pr = await PullRequestService.createPullRequest({
    repositoryId: linkedRepo.id,
    repoUrl: linkedRepo.clone_url,
    baseBranch: linkedRepo.default_branch,
    branchName: featureBranch,
    title: 'fix(ui): responsive hero banner update',
    summary: 'Autonomous modification verified in Docker sandbox container',
    changes: [{ path: 'components/HeroBanner.tsx', action: 'modify' }],
  });

  assert.ok(pr.html_url.includes('pull/'), 'PR URL must point to pull request endpoint');
  assert.equal(pr.branch_name, featureBranch);
  assert.equal(pr.repository_id, linkedRepo.id);
  assert.equal(pr.status, 'open');

  console.log(`  ✓ Pull Request generated: ${pr.html_url}`);
  console.log('✓ GitHub App Access, Repository Selection & Git Lifecycle Test PASSED!\n');
}
