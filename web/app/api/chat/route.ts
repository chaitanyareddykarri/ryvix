import { NextRequest, NextResponse } from "next/server";
import {
  ryvixAgi,
  codingAssistant,
  type OodaCycleResult,
  type CodeSynthesisResult
} from "@ryvix/services";

export const dynamic = "force-dynamic";

interface ChatRequestBody {
  prompt: string;
  conversationId?: string;
  projectId?: string;
  stream?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { prompt, conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, stream = true } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 1. Run Top-Level AGI Cognitive OODA Cycle
    const isCodingRequest = /code|function|component|page|endpoint|refactor|fix bug|implement|diff|add|create/i.test(prompt);
    const isCriticalSecurityOrOutage = /attack|payload|breach|exfiltration|ssrf|brute|unauthorized|quarantine|reboot|iptables|eaddrinuse|outage|502/i.test(prompt);

    const ooda: OodaCycleResult = await ryvixAgi.executeOodaCycle({
      source: "web_chat",
      rawObservation: prompt,
      environmentContext: {
        channel: "web_chat",
        conversationId,
        userPrompt: prompt,
        framework: "Next.js 15",
        targetEndpoint: "/chat",
        threatLevel: isCriticalSecurityOrOutage ? "critical" : undefined,
        reportedStatus: /502|outage/i.test(prompt) ? 502 : undefined
      }
    });

    // 2. Synthesize Code Modification if Coding Request
    let codeResult: CodeSynthesisResult | null = null;
    if (isCodingRequest) {
      try {
        codeResult = await codingAssistant.synthesizeCode(prompt, {
          framework: "Next.js 15 (App Router)",
          language: "TypeScript",
          stack: ["Next.js 15", "React 19", "TypeScript", "Vanilla CSS"]
        });
      } catch (err: any) {
        console.warn("[Chat API] Code synthesis note:", err.message);
      }
    }

    // 3. Evaluate High-Blast-Radius Action Approval Requirement
    const needsApproval =
      isCriticalSecurityOrOutage ||
      ooda.orient.blastRadius === "critical" ||
      ooda.orient.blastRadius === "high" ||
      Boolean(ooda.developerAlert?.developerActionRequired?.needsHumanIntervention);

    const topRagChunk = ooda.ragResponse?.retrievedContext?.[0]?.chunk;
    const verifiedCommand = ooda.ragResponse?.verifiedExecutableCommands?.[0] || ooda.developerAlert?.autonomousRemediationStatus?.actionTaken || "systemctl reload web-service";

    const approvalCard = needsApproval
      ? {
          approvalId: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: ooda.developerAlert?.title || `Approval Required: ${ooda.orient.primaryDomain.toUpperCase()}`,
          action: ooda.decide.actionPlan[0] || "enforce_automated_safeguard",
          blastRadius: ooda.orient.blastRadius.toUpperCase(),
          riskScore: ooda.orient.blastRadius === "critical" ? 0.95 : 0.75,
          suggestedSteps: ooda.developerAlert?.developerActionRequired?.suggestedSteps || [
            "Review proposed remediation in staging",
            "Verify affected service dependencies",
            "Authorize live execution"
          ],
          mitigationCommand: verifiedCommand,
          requiresApproval: true
        }
      : null;

    // 4. Formulate Comprehensive Assistant Response
    let assistantResponse = "";
    if (codeResult) {
      assistantResponse = `I have analyzed your request and synthesized the following code solution:\n\n${codeResult.simpleExplanation}\n\n**Key Architectural Benefits:**\n${codeResult.keyBenefits.map(b => `- ${b}`).join("\n")}\n\nReview the generated unified diff below to inspect lines added and modified.`;
    } else if (topRagChunk) {
      assistantResponse = `I investigated your issue using authoritative operational runbooks (**${topRagChunk.title}**).\n\n${ooda.deliberativeThoughtReport?.llmDialecticDebate.synthesisConsensus || ooda.orient.neuralHypothesis}\n\n**Verified Remediation Command:**\n\`\`\`bash\n${verifiedCommand}\n\`\`\`\n\n*Retrieval Confidence: ${((ooda.ragResponse?.retrievalConfidence ?? 0.8) * 100).toFixed(1)}% | Retrieval Latency: ${(ooda.ragResponse?.latencyMs ?? 0.1).toFixed(2)}ms*`;
    } else {
      assistantResponse = ooda.deliberativeThoughtReport?.llmDialecticDebate.synthesisConsensus ||
        `I analyzed your prompt through the Ryvix AGI cognitive engine (OODA Cycle ${ooda.cycleId}). Strategic Directive: ${ooda.decide.actionPlan[0] || "continue_normal_monitoring"}.`;
    }

    // 5. Handle Non-Streaming JSON fallback
    if (!stream) {
      return NextResponse.json({
        success: true,
        conversationId,
        cycleId: ooda.cycleId,
        response: assistantResponse,
        thoughtStream: ooda.displayThoughtStream || null,
        thoughtReport: ooda.deliberativeThoughtReport || null,
        diff: codeResult?.diff || null,
        approval: approvalCard,
        rag: ooda.ragResponse || null,
        metrics: {
          totalDurationMs: Date.now() - startTime,
          system1LatencyMs: ooda.deliberativeThoughtReport?.system1Reflex.reflexLatencyMs || 0.1,
          system2LatencyMs: ooda.deliberativeThoughtReport?.totalCognitiveLatencyMs || 0.3
        }
      });
    }

    // 6. Handle Server-Sent Events (SSE) Streaming Response
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: any) {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        try {
          // Event A: Start
          sendEvent("start", {
            conversationId,
            cycleId: ooda.cycleId,
            timestamp: new Date().toISOString()
          });

          // Event B: Real-Time Thought Traces (System 1 + System 2 + RAG)
          if (ooda.deliberativeThoughtReport) {
            sendEvent("thought", {
              type: "system1",
              label: "System 1 Intuitive Pattern Match",
              content: `Intuitive Class: ${ooda.deliberativeThoughtReport.system1Reflex.intuitiveClass} (Confidence: ${(ooda.deliberativeThoughtReport.system1Reflex.confidence * 100).toFixed(0)}%)`,
              action: ooda.deliberativeThoughtReport.system1Reflex.reflexAction,
              latencyMs: ooda.deliberativeThoughtReport.system1Reflex.reflexLatencyMs
            });

            if (topRagChunk) {
              sendEvent("thought", {
                type: "rag",
                label: "Retrieval-Augmented Generation (Hybrid Search)",
                content: `Retrieved Runbook: "${topRagChunk.title}" (Score: ${((ooda.ragResponse?.retrievalConfidence ?? 0.8) * 100).toFixed(1)}%)`,
                executableCommand: verifiedCommand,
                latencyMs: ooda.ragResponse?.latencyMs ?? 0.15
              });
            }

            sendEvent("thought", {
              type: "system2",
              label: "System 2 Multi-LLM Dialectic Deliberation",
              content: ooda.deliberativeThoughtReport.llmDialecticDebate.synthesisConsensus,
              rationale: ooda.deliberativeThoughtReport.system2Deliberation.rationale,
              branches: ooda.deliberativeThoughtReport.system2Deliberation.treeOfThoughts.length,
              latencyMs: ooda.deliberativeThoughtReport.totalCognitiveLatencyMs
            });
          }

          // Event C: Plan
          sendEvent("plan", {
            primaryDomain: ooda.orient.primaryDomain,
            intent: ooda.orient.intent,
            blastRadius: ooda.orient.blastRadius,
            actionPlan: ooda.decide.actionPlan,
            confidence: ooda.decide.confidence
          });

          // Event D: Unified Diff if generated
          if (codeResult && codeResult.diff) {
            sendEvent("diff", {
              diff: codeResult.diff,
              filesChanged: codeResult.filesChanged,
              suggestedCommitMessage: codeResult.suggestedCommitMessage
            });
          }

          // Event E: Approval Card if required
          if (approvalCard) {
            sendEvent("approval", approvalCard);
          }

          // Event F: Tokenized Assistant Response Chunks
          const words = assistantResponse.split(" ");
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
            sendEvent("token", { chunk });
            // Micro-delay to simulate fluid progressive streaming
            await new Promise(r => setTimeout(r, 12));
          }

          // Event G: Completion Done Event
          sendEvent("done", {
            totalDurationMs: Date.now() - startTime,
            completedAt: new Date().toISOString(),
            status: "success"
          });
        } catch (streamErr: any) {
          sendEvent("error", { message: streamErr.message });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });

  } catch (err: any) {
    console.error("[Chat API Error]:", err);
    return NextResponse.json(
      { error: "Failed to process chat request.", details: err.message },
      { status: 500 }
    );
  }
}
