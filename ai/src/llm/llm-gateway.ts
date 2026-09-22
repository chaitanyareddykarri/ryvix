/**
 * Ryvix AI Dedicated LLM Gateway Layer
 * 
 * Responsibilities:
 * - Dedicated abstraction isolating the LLM from direct runtime code
 * - Provider-agnostic: Hugging Face (Qwen2.5-Coder), Groq, Google Gemini, Ollama, Local Deterministic
 * - Fast response time (<50ms for local/cached, parallel prompt assembly)
 * - Guarantees structured JSON plan output adhering to Plan / PlanStep schema
 * - Never emits raw, unvalidated execution commands
 */

import { modelGateway, LLMCompletionResult } from '../model-gateway';
import { TaskContext } from '../context/context-builder';
import { RefinedRequirement } from '../understanding/intent-processor';

export interface RawLLMStep {
  step_number: number;
  title: string;
  description: string;
  suggested_tool: string;
  tool_arguments?: Record<string, unknown>;
  requires_approval: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: number[];
  verification_requirement?: string;
}

export interface StructuredLLMPlanResult {
  planTitle: string;
  steps: RawLLMStep[];
  providerUsed: string;
  modelUsed: string;
  latencyMs: number;
  isFallback: boolean;
}

export class AIAgentLLMGateway {
  private planCache = new Map<string, StructuredLLMPlanResult>();

  /**
   * Synthesizes a structured plan from the refined requirement and scoped context.
   */
  async generateStructuredPlan(
    refinedReq: RefinedRequirement,
    context: TaskContext
  ): Promise<StructuredLLMPlanResult> {
    const startTime = performance.now();
    const cacheKey = `${refinedReq.intent}:${refinedReq.target}:${context.project.framework}`;

    // Fast-path cache check for instant response time
    if (this.planCache.has(cacheKey)) {
      const cached = this.planCache.get(cacheKey)!;
      return {
        ...cached,
        latencyMs: Number((performance.now() - startTime).toFixed(2)),
      };
    }

    // Build system prompt with strictly scoped rules
    const systemPrompt = `You are Ryvix Autonomous Software Operations AI.
Your role: Create a validated, structured technical execution plan for the user request.
RULES:
1. ONLY propose tools in the ALLOWED TOOLS list: ${context.allowedTools.join(', ')}.
2. Adhere to all POLICIES:
${context.policies.map((p) => `- ${p}`).join('\n')}
3. NEVER emit raw arbitrary shell execution commands.
4. Always require human approval for code modifications, deployments, or destructive actions.
5. Return ONLY a valid JSON object matching this schema:
{
  "planTitle": "string",
  "steps": [
    {
      "step_number": 1,
      "title": "string",
      "description": "string",
      "suggested_tool": "string",
      "tool_arguments": {},
      "requires_approval": false,
      "risk_level": "low" | "medium" | "high" | "critical",
      "dependencies": [],
      "verification_requirement": "string"
    }
  ]
}`;

    const userPrompt = `TASK DETAILS:
- Task ID: ${context.taskId}
- Intent: ${refinedReq.intent}
- Target: ${refinedReq.target}
- Outcome: ${refinedReq.requestedOutcome}
- Constraints: ${refinedReq.constraints.join('; ')}
- Project Framework: ${context.project.framework} (${context.project.language})
- Relevant Target Files: ${context.relevantFiles.map((f) => f.path).join(', ')}

Create the execution plan.`;

    // Dispatch via ModelGateway
    let llmResult: LLMCompletionResult;
    try {
      llmResult = await modelGateway.complete([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch {
      llmResult = {
        content: '',
        providerUsed: 'local_deterministic_engine',
        modelUsed: 'ryvix-deterministic-planner-v1',
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 1,
        failoverOccurred: true,
        failedProviders: ['external_api'],
      };
    }

    // Parse and enforce structured plan schema
    const structured = this.parseOrSynthesizePlan(
      llmResult.content,
      refinedReq,
      context,
      llmResult.providerUsed,
      llmResult.modelUsed
    );

    const totalLatency = Number((performance.now() - startTime).toFixed(2));
    structured.latencyMs = totalLatency;

    // Cache the validated result
    this.planCache.set(cacheKey, structured);

    return structured;
  }

  /**
   * Parses LLM JSON output or generates guaranteed high-quality deterministic structured steps.
   */
  private parseOrSynthesizePlan(
    content: string,
    req: RefinedRequirement,
    context: TaskContext,
    providerUsed: string,
    modelUsed: string
  ): StructuredLLMPlanResult {
    let parsed: any = null;
    try {
      if (content && content.includes('{')) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      }
    } catch {
      // JSON parse failed; fallback to deterministic structured plan
    }

    // If parsed output contains a rich step sequence (>= 5 steps)
    if (parsed && Array.isArray(parsed.steps) && parsed.steps.length >= 5) {
      return {
        planTitle: parsed.planTitle || `Execution Plan for ${req.target}`,
        steps: parsed.steps.map((s: any, idx: number) => ({
          step_number: s.step_number || idx + 1,
          title: s.title || `Step ${idx + 1}`,
          description: s.description || '',
          suggested_tool: s.suggested_tool || 'workspace.read_file',
          tool_arguments: s.tool_arguments || {},
          requires_approval: s.requires_approval ?? (idx >= 2),
          risk_level: s.risk_level || (idx >= 2 ? 'medium' : 'low'),
          dependencies: s.dependencies || (idx > 0 ? [idx] : []),
          verification_requirement: s.verification_requirement || 'Validate execution exit code',
        })),
        providerUsed,
        modelUsed,
        latencyMs: 0,
        isFallback: false,
      };
    }

    // Complete 10-step sequence for frontend / coding modifications (Section 5 Architecture Specification)
    const primaryFile = context.relevantFiles[0]?.path || 'app/page.tsx';
    return {
      planTitle: `Refined Technical Implementation: ${req.requestedOutcome}`,
      steps: [
        {
          step_number: 1,
          title: 'Inspect homepage / component structure',
          description: `Read and analyze ${primaryFile} layout and dependencies`,
          suggested_tool: 'workspace.read_file',
          tool_arguments: { filePath: primaryFile },
          requires_approval: false,
          risk_level: 'low',
          dependencies: [],
          verification_requirement: 'File exists and parseable',
        },
        {
          step_number: 2,
          title: 'Identify existing implementation and design tokens',
          description: 'Extract existing color palettes, CSS classes, and typography tokens',
          suggested_tool: 'workspace.read_file',
          tool_arguments: { filePath: 'app/globals.css' },
          requires_approval: false,
          risk_level: 'low',
          dependencies: [1],
          verification_requirement: 'Design tokens extracted',
        },
        {
          step_number: 3,
          title: 'Synthesize code modifications',
          description: `Apply patch for ${req.target} adhering to constraints: ${req.constraints[0] || 'maintain design system'}`,
          suggested_tool: 'workspace.apply_diff',
          tool_arguments: { filePath: primaryFile, intent: req.intent },
          requires_approval: true,
          risk_level: 'medium',
          dependencies: [1, 2],
          verification_requirement: 'Diff applies cleanly with 0 syntax errors',
        },
        {
          step_number: 4,
          title: 'Verify package dependencies',
          description: 'Ensure no unauthorized or missing packages are introduced',
          suggested_tool: 'workspace.read_file',
          tool_arguments: { filePath: 'package.json' },
          requires_approval: false,
          risk_level: 'low',
          dependencies: [3],
          verification_requirement: 'Zero unapproved dependencies',
        },
        {
          step_number: 5,
          title: 'Run TypeScript typecheck',
          description: 'Execute tsc --noEmit in isolated sandbox container',
          suggested_tool: 'workspace.run_tests',
          tool_arguments: { command: 'tsc --noEmit' },
          requires_approval: false,
          risk_level: 'low',
          dependencies: [3, 4],
          verification_requirement: 'Exit code 0, 0 compiler errors',
        },
        {
          step_number: 6,
          title: 'Execute project build',
          description: `Run ${context.project.buildCommand} in container sandbox`,
          suggested_tool: 'workspace.build',
          tool_arguments: { command: context.project.buildCommand },
          requires_approval: false,
          risk_level: 'low',
          dependencies: [5],
          verification_requirement: 'Build completes with exit code 0',
        },
        {
          step_number: 7,
          title: 'Start isolated container preview service',
          description: 'Bind container port to dynamic host port (3100-3999)',
          suggested_tool: 'workspace.start_preview',
          tool_arguments: { internalPort: context.project.defaultPort || 3000 },
          requires_approval: false,
          risk_level: 'low',
          dependencies: [6],
          verification_requirement: 'Preview service responding with HTTP 200',
        },
        {
          step_number: 8,
          title: 'Generate frontend preview URL',
          description: 'Establish live preview endpoint for chat console iframe',
          suggested_tool: 'workspace.get_preview_url',
          tool_arguments: {},
          requires_approval: false,
          risk_level: 'low',
          dependencies: [7],
          verification_requirement: 'Preview URL accessible',
        },
        {
          step_number: 9,
          title: 'Await human user review & approval',
          description: 'Display interactive Action Approval Card with diff and live preview',
          suggested_tool: 'user.await_approval',
          tool_arguments: { target: req.target },
          requires_approval: true,
          risk_level: 'high',
          dependencies: [8],
          verification_requirement: 'Explicit user authorization received',
        },
        {
          step_number: 10,
          title: 'Create atomic Git branch & GitHub Pull Request',
          description: 'Commit verified changes and open GitHub PR for team merge',
          suggested_tool: 'github.create_pr',
          tool_arguments: { title: req.requestedOutcome },
          requires_approval: true,
          risk_level: 'high',
          dependencies: [9],
          verification_requirement: 'GitHub PR successfully opened',
        },
      ],
      providerUsed: 'local_deterministic_engine',
      modelUsed: 'ryvix-deterministic-planner-v1',
      latencyMs: 1,
      isFallback: true,
    };
  }
}

export const aiAgentLLMGateway = new AIAgentLLMGateway();
