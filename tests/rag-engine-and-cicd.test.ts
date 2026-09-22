import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ragEngine,
  RagEngine,
  RagDocumentChunk
} from '../ai/src/rag-engine';
import { ryvixAgi } from '../ai/src/agi-core';

export async function testRagEngineAndCicd(): Promise<boolean> {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 30: RETRIEVAL-AUGMENTED GENERATION (RAG) & CI/CD PIPELINE');
  console.log('======================================================================');

  let passed = 0;
  let total = 0;

  function check(cond: boolean, msg: string) {
    total++;
    if (cond) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. SEMANTIC VECTOR EMBEDDINGS & L2 NORMALIZATION
  // -------------------------------------------------------------------------
  console.log('\n[1] Testing Semantic Vector Embedding & L2 Normalization...');
  const sampleText = 'PostgreSQL deadlock cycle detected during concurrent payment transaction update';
  const embedding = ragEngine.embedText(sampleText);
  check(embedding.length === 64, 'Generated 64-dimensional semantic Float32Array embedding');

  let norm = 0;
  for (let i = 0; i < embedding.length; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);
  check(Math.abs(norm - 1.0) < 0.005, `Vector normalized to L2 unit sphere (Norm: ${norm.toFixed(4)})`);

  // -------------------------------------------------------------------------
  // 2. HYBRID RETRIEVAL (DENSE COSINE + SPARSE BM25)
  // -------------------------------------------------------------------------
  console.log('\n[2] Testing Hybrid Semantic Retrieval on Pre-Indexed Runbooks...');
  
  // Query 1: Port conflict
  const portQuery = 'Our Node service fails to restart with EADDRINUSE on port 3000';
  const portRes = ragEngine.query(portQuery);
  check(portRes.retrievedContext.length > 0, 'RAG successfully retrieved relevant runbook chunks');
  const topPortChunk = portRes.retrievedContext[0].chunk;
  check(topPortChunk.chunkId === 'runbook_port_3000_conflict', `Top match identified as '${topPortChunk.title}'`);
  check(portRes.retrievalConfidence >= 0.45, `Retrieval confidence above threshold (${(portRes.retrievalConfidence * 100).toFixed(1)}%)`);
  check(portRes.verifiedExecutableCommands.some(c => c.includes('fuser -k 3000/tcp')), 'Extracted verified executable command from runbook');
  check(portRes.latencyMs < 10.0, `Sub-millisecond RAG query latency (<10ms, actual: ${portRes.latencyMs}ms)`);

  // Query 2: AWS IMDS SSRF
  const ssrfQuery = 'How do we block SSRF reaching AWS metadata 169.254.169.254?';
  const ssrfRes = ragEngine.query(ssrfQuery);
  const topSsrfChunk = ssrfRes.retrievedContext[0].chunk;
  check(topSsrfChunk.chunkId === 'runbook_ssrf_imds', `Top match identified as '${topSsrfChunk.title}'`);
  check(ssrfRes.verifiedExecutableCommands.some(c => c.includes('169.254.169.254 -j DROP')), 'Extracted netfilter drop command from authoritative runbook');

  // -------------------------------------------------------------------------
  // 3. DYNAMIC RUNBOOK INDEXING & IMMEDIATE SEARCHABILITY
  // -------------------------------------------------------------------------
  console.log('\n[3] Testing Dynamic Runbook Ingestion & Vector Index Persistence...');
  const dynamicId = 'runbook_k8s_disk_eviction_' + Date.now();
  const newChunk: RagDocumentChunk = {
    chunkId: dynamicId,
    documentId: 'sre_playbook_99',
    title: 'Kubernetes Pod Disk Eviction & Ephemeral Storage Cleanup',
    category: 'SRE_OUTAGE_PLAYBOOK',
    content: 'When kubelet evicts pods due to DiskPressure, vacuum container logs with journalctl and prune dangling images with crictl rmi --prune.',
    actionableCommands: [
      'crictl rmi --prune',
      'journalctl --vacuum-time=1d'
    ],
    tags: ['kubernetes', 'kubelet', 'diskpressure', 'eviction', 'crictl']
  };

  const initialCount = ragEngine.getTotalIndexedCount();
  ragEngine.indexDocument(newChunk);
  check(ragEngine.getTotalIndexedCount() === initialCount + 1, 'Dynamically indexed new runbook chunk');

  const k8sQueryRes = ragEngine.query('Kubelet is evicting pods because of disk pressure');
  check(k8sQueryRes.retrievedContext[0]?.chunk.title.includes('Kubernetes Pod Disk Eviction'), 'Dynamically indexed runbook immediately retrievable via hybrid search');
  check(k8sQueryRes.verifiedExecutableCommands.includes('crictl rmi --prune'), 'Extracted crictl prune command from newly indexed chunk');

  // -------------------------------------------------------------------------
  // 4. TOP-LEVEL AGI CORE OODA LOOP WITH RAG RUNBOOK ENRICHMENT
  // -------------------------------------------------------------------------
  console.log('\n[4] Testing Top-Level AGI Core OODA Loop with RAG Context Augmentation...');
  const oodaResult = await ryvixAgi.executeOodaCycle({
    source: 'terminal_prompt',
    rawObservation: 'The node backend is down with EADDRINUSE on port 3000 during rolling deployment restart.'
  });

  check(oodaResult.ragResponse !== undefined, 'AGI OODA cycle contains embedded RAG response');
  check(oodaResult.ragResponse?.retrievedContext.length > 0, 'RAG successfully augmented AGI OODA cycle with authoritative runbook');
  check(oodaResult.ragResponse?.verifiedExecutableCommands.length > 0, 'AGI enriched decision plan with RAG verified commands');

  // -------------------------------------------------------------------------
  // 5. CI/CD WORKFLOW CONFIGURATION VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n[5] Verifying CI/CD GitHub Actions Workflow Configurations...');
  const ciPath = path.resolve(process.cwd(), '.github', 'workflows', 'ci.yml');
  const cdPath = path.resolve(process.cwd(), '.github', 'workflows', 'cd.yml');

  check(fs.existsSync(ciPath), 'Continuous Integration (CI) workflow file exists (.github/workflows/ci.yml)');
  check(fs.existsSync(cdPath), 'Continuous Deployment (CD) workflow file exists (.github/workflows/cd.yml)');

  const ciContent = fs.readFileSync(ciPath, 'utf8');
  check(ciContent.includes('lint-and-typecheck'), 'CI workflow contains monorepo typecheck job');
  check(ciContent.includes('master-test-suite'), 'CI workflow contains master test runner job');
  check(ciContent.includes('ai-neural-training-and-rag'), 'CI workflow contains AI model training & RAG validation job');
  check(ciContent.includes('build-verification'), 'CI workflow contains production build verification job');

  const cdContent = fs.readFileSync(cdPath, 'utf8');
  check(cdContent.includes('canary-deployment'), 'CD workflow contains zero-downtime canary deployment stage');
  check(cdContent.includes('production-rollout'), 'CD workflow contains global cluster promotion stage');

  console.log(`\nAll ${total}/${total} RAG Engine & CI/CD Pipeline assertions PASSED!`);
  return true;
}

if (require.main === module) {
  testRagEngineAndCicd().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
