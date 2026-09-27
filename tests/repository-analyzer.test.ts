import assert from 'node:assert/strict';
import { RepositoryAnalyzer } from '../web/utils/repository-analyzer';

export async function testRepositoryAnalyzer() {
  console.log('[TEST] Running Real-Time Repository Analyzer & Deployment Detector Test...');

  // =========================================================================
  // 1. NEXT.JS APP ROUTER + GITHUB ACTIONS DETECTION
  // =========================================================================
  console.log('  -> 1. Testing Next.js App Router with GitHub Actions...');
  const nextFiles = [
    'package.json',
    'app/layout.tsx',
    'app/page.tsx',
    'components/Header.tsx',
    '.github/workflows/deploy.yml',
    'tsconfig.json',
  ];
  const nextPkg = JSON.stringify({
    name: 'ecommerce-store',
    dependencies: { next: '^15.1.0', react: '^19.0.0' },
  });

  const nextRes = RepositoryAnalyzer.analyze(nextFiles, { 'package.json': nextPkg });
  assert.equal(nextRes.stack, 'nextjs');
  assert.equal(nextRes.framework, 'Next.js');
  assert.equal(nextRes.language, 'TypeScript');
  assert.equal(nextRes.deployment.detected, true);
  assert.equal(nextRes.deployment.provider, 'GitHub Actions');
  assert.equal(nextRes.security.hasPotentialSecrets, false);
  console.log('  ✓ Next.js App Router and GitHub Actions CI/CD correctly detected.');

  // =========================================================================
  // 2. VITE REACT + VERCEL CONFIG DETECTION
  // =========================================================================
  console.log('  -> 2. Testing Vite React SPA with Vercel deployment...');
  const viteFiles = [
    'package.json',
    'vite.config.ts',
    'src/main.tsx',
    'src/App.tsx',
    'vercel.json',
  ];
  const vitePkg = JSON.stringify({
    name: 'my-portfolio',
    dependencies: { react: '^18.2.0', vite: '^5.0.0' },
  });

  const viteRes = RepositoryAnalyzer.analyze(viteFiles, { 'package.json': vitePkg });
  assert.equal(viteRes.stack, 'react');
  assert.equal(viteRes.deployment.detected, true);
  assert.equal(viteRes.deployment.provider, 'Vercel');
  assert.equal(viteRes.defaultPort, 5173);
  console.log('  ✓ Vite React SPA and Vercel configuration correctly detected.');

  // =========================================================================
  // 3. FASTAPI PYTHON + DOCKER DEPLOYMENT
  // =========================================================================
  console.log('  -> 3. Testing FastAPI Python with Docker deployment...');
  const pyFiles = [
    'requirements.txt',
    'main.py',
    'routers/items.py',
    'Dockerfile',
    'docker-compose.yml',
  ];

  const pyRes = RepositoryAnalyzer.analyze(pyFiles, { 'requirements.txt': 'fastapi==0.110.0\nuvicorn==0.28.0' });
  assert.equal(pyRes.stack, 'python_fastapi');
  assert.equal(pyRes.language, 'Python');
  assert.equal(pyRes.deployment.detected, true);
  assert.equal(pyRes.deployment.provider, 'Docker');
  assert.equal(pyRes.defaultPort, 8000);
  console.log('  ✓ FastAPI and Docker container configuration correctly detected.');

  // =========================================================================
  // 4. GO GIN SERVICE DETECTION
  // =========================================================================
  console.log('  -> 4. Testing Go Gin Web Service...');
  const goFiles = ['go.mod', 'go.sum', 'main.go', 'handlers/health.go'];
  const goRes = RepositoryAnalyzer.analyze(goFiles);
  assert.equal(goRes.stack, 'golang');
  assert.equal(goRes.language, 'Go');
  assert.equal(goRes.packageManager, 'go');
  assert.equal(goRes.deployment.detected, false);
  console.log('  ✓ Go Microservice correctly detected with "No deployment" status.');

  // =========================================================================
  // 5. SECRET SCANNING & UNCOMMITTED CREDENTIAL GUARDRAIL
  // =========================================================================
  console.log('  -> 5. Testing Secret Scanner & Guardrails...');
  const unsafeFiles = [
    'package.json',
    'app/page.tsx',
    '.env',
    '.env.production',
    'id_rsa',
  ];

  const unsafeRes = RepositoryAnalyzer.analyze(unsafeFiles);
  assert.equal(unsafeRes.security.hasPotentialSecrets, true);
  assert.ok(unsafeRes.security.flaggedFiles.includes('.env'));
  assert.ok(unsafeRes.security.flaggedFiles.includes('.env.production'));
  assert.ok(unsafeRes.security.flaggedFiles.includes('id_rsa'));
  assert.ok(unsafeRes.security.warningMessage?.includes('Potential secret file'));
  console.log('  ✓ Unsafe committed secret files flagged without leaking contents.');

  console.log('✓ Real-Time Repository Analyzer & Deployment Detector Test PASSED!\n');
}
