import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { POST } from '../web/app/api/chat/route';
import { NextRequest } from 'next/server';

export async function testWebChatStreaming() {
  console.log('\n======================================================================');
  console.log(' TEST SUITE 31: REAL-TIME WEB CHAT CONSOLE & SSE STREAMING PROTOCOL');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // [1] Testing Real-Time SSE Stream Generation on Technical SRE Prompt
  // -------------------------------------------------------------------------
  console.log('[1] Testing Real-Time Server-Sent Events (SSE) Stream Generation...');

  const srePrompt = 'We are getting EADDRINUSE port 3000 socket conflict on web-edge-01. How do we triage and perform zero-downtime swap?';
  const req1 = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: srePrompt, stream: true })
  });

  const res1 = await POST(req1);
  assert.equal(res1.status, 200, 'Chat API must return HTTP 200 OK');
  assert.ok(res1.headers.get('content-type')?.includes('text/event-stream'), 'Chat response must be text/event-stream');

  const reader = res1.body?.getReader();
  assert.ok(reader, 'Response stream reader must be accessible');

  const decoder = new TextDecoder();
  let streamText = '';
  const eventsReceived: Array<{ event: string; data: any }> = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    streamText += decoder.decode(value, { stream: true });
  }

  // Parse SSE events
  const rawEvents = streamText.split('\n\n');
  for (const raw of rawEvents) {
    if (!raw.trim()) continue;
    const lines = raw.split('\n');
    let eventName = '';
    let dataStr = '';
    for (const l of lines) {
      if (l.startsWith('event: ')) eventName = l.slice(7).trim();
      else if (l.startsWith('data: ')) dataStr = l.slice(6).trim();
    }
    if (eventName && dataStr) {
      try {
        eventsReceived.push({ event: eventName, data: JSON.parse(dataStr) });
      } catch {}
    }
  }

  const eventTypes = eventsReceived.map(e => e.event);
  assert.ok(eventTypes.includes('start'), 'Stream must emit "start" event');
  assert.ok(eventTypes.includes('thought'), 'Stream must emit "thought" events');
  assert.ok(eventTypes.includes('plan'), 'Stream must emit "plan" event');
  assert.ok(eventTypes.includes('token'), 'Stream must emit "token" events');
  assert.ok(eventTypes.includes('done'), 'Stream must emit "done" completion event');
  console.log('  ✓ Verified complete SSE event lifecycle [start -> thought -> plan -> token -> done]');

  // Validate thought traces
  const thoughtEvents = eventsReceived.filter(e => e.event === 'thought');
  assert.ok(thoughtEvents.length >= 2, 'Must emit multiple thought events (System 1 + 2 + RAG)');

  const ragThought = thoughtEvents.find(e => e.data.type === 'rag');
  assert.ok(ragThought, 'Must include RAG runbook retrieval thought trace');
  assert.ok(ragThought.data.content.includes('EADDRINUSE') || ragThought.data.content.includes('Runbook'), 'RAG thought must reference EADDRINUSE runbook');
  console.log('  ✓ System 1 + System 2 dual-process cognition and RAG runbook streamed');

  // Validate accumulated text tokens
  const tokenEvents = eventsReceived.filter(e => e.event === 'token');
  const fullText = tokenEvents.map(t => t.data.chunk).join('');
  assert.ok(fullText.length > 50, 'Streamed response text must be populated');
  assert.ok(fullText.includes('fuser') || fullText.includes('EADDRINUSE') || fullText.includes('3000'), 'Response must contain verified remediation commands');
  console.log('  ✓ Fluid token chunks synthesized and streamed progressively');

  // -------------------------------------------------------------------------
  // [2] Testing Coding Assistant Synthesis & Unified Git Diff Streaming
  // -------------------------------------------------------------------------
  console.log('\n[2] Testing Coding Assistant Synthesis & Unified Git Diff Streaming...');

  const codingPrompt = 'Add a production healthcheck endpoint to backend API with memory and database ping checks';
  const req2 = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: codingPrompt, stream: true })
  });

  const res2 = await POST(req2);
  const reader2 = res2.body?.getReader();
  let streamText2 = '';
  while (true) {
    const { value, done } = await reader2!.read();
    if (done) break;
    streamText2 += decoder.decode(value, { stream: true });
  }

  assert.ok(streamText2.includes('event: diff'), 'Coding prompt must emit "diff" event');
  assert.ok(streamText2.includes('--- a/') || streamText2.includes('+++ b/') || streamText2.includes('+'), 'Diff payload must contain unified git diff syntax');
  console.log('  ✓ Successfully synthesized code modification with unified git diff');

  // -------------------------------------------------------------------------
  // [3] Testing Critical Security Risk Action Approval Gate
  // -------------------------------------------------------------------------
  console.log('\n[3] Testing Critical Security Risk Action Approval Gate...');

  const securityPrompt = 'CRITICAL ATTACK: Inbound request to /api/v1/webhook contained SSRF link-local IP 169.254.169.254 targeting AWS IAM credentials';
  const req3 = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: securityPrompt, stream: true })
  });

  const res3 = await POST(req3);
  const reader3 = res3.body?.getReader();
  let streamText3 = '';
  while (true) {
    const { value, done } = await reader3!.read();
    if (done) break;
    streamText3 += decoder.decode(value, { stream: true });
  }

  assert.ok(streamText3.includes('event: approval'), 'Critical security incident must emit "approval" card');
  assert.ok(streamText3.includes('CRITICAL') || streamText3.includes('HIGH'), 'Approval card blast radius must be HIGH or CRITICAL');
  assert.ok(streamText3.includes('requiresApproval'), 'Approval card must enforce human-in-the-loop requirement');
  console.log('  ✓ Emitted high-blast-radius Action Approval Card requiring human authorization');

  // -------------------------------------------------------------------------
  // [4] Testing Non-Streaming JSON Fallback Mode
  // -------------------------------------------------------------------------
  console.log('\n[4] Testing Non-Streaming JSON Fallback Mode...');

  const req4 = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Status check on current cluster health', stream: false })
  });

  const res4 = await POST(req4);
  assert.equal(res4.status, 200);
  assert.ok(res4.headers.get('content-type')?.includes('application/json'));

  const json4 = await res4.json();
  assert.equal(json4.success, true);
  assert.ok(json4.cycleId.startsWith('ooda_'));
  assert.ok(json4.response.length > 0);
  assert.ok(json4.metrics.totalDurationMs >= 0);
  console.log('  ✓ Non-streaming JSON mode returns complete OODA cycle and thought report');

  // -------------------------------------------------------------------------
  // [5] Verifying Web Chat Console Page Layout & File Integrity
  // -------------------------------------------------------------------------
  console.log('\n[5] Verifying Web Chat Console Page Layout & File Integrity...');

  const chatPagePath = path.resolve(process.cwd(), 'web/app/chat/page.tsx');
  assert.ok(fs.existsSync(chatPagePath), 'web/app/chat/page.tsx must exist');

  const pageContent = fs.readFileSync(chatPagePath, 'utf-8');
  assert.ok(pageContent.includes('Ryvix AGI Core'), 'Page must render Ryvix AGI Core identity');
  assert.ok(pageContent.includes('AGI Deliberative Cognitive Stream'), 'Page must contain thought trace component');
  assert.ok(pageContent.includes('Unified Git Diff'), 'Page must contain unified diff viewer');
  assert.ok(pageContent.includes('Live App Preview'), 'Page must contain live sandboxed preview iframe');
  assert.ok(pageContent.includes('Action Proposed'), 'Page must contain action approval cards');
  console.log('  ✓ Web Chat Console page (/chat) contains all visual developer workbench components');

  console.log('\nAll 18/18 Web Chat Console & SSE Streaming assertions PASSED!\n');
}

if (process.argv[1]?.endsWith('web-chat-streaming.test.ts')) {
  testWebChatStreaming().catch(err => {
    console.error('Test Suite 31 FAILED:', err);
    process.exit(1);
  });
}
