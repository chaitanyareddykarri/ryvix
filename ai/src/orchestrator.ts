/**
 * Ryvix AI Decision Orchestrator
 * 
 * Implements the hybrid intelligent architecture:
 * 1. Coding Tasks: Always routed directly to LLM Reasoning Gateway.
 * 2. Server Operations & Security Incidents:
 *    - Tier 1: Evaluated locally by LocalSecurityEngine (<1ms latency, ZERO external LLM calls).
 *    - Tier 2: Checked against persistent SelfLearningStore (<1ms latency, ZERO external LLM calls).
 *    - Tier 3: If unknown zero-day, escalated to LLM Gateway -> diagnosed -> automatically
 *              learned into persistent local store for future 0-call instant remediation!
 */

import { modelGateway, LLMResponse } from './model-gateway';
import { LocalSecurityEngine, ServerEventData, LocalAnalysisResult } from './local-security-engine';
import { selfLearningStore, LearnedPattern } from './self-learning-store';

export interface TaskPlan {
  taskId: string;
  steps: Array<{ order: number; action: string; description: string }>;
  providerUsed: string;
  llmCallsUsed: number;
}

export interface ServerIncidentAnalysis {
  resolvedLocally: boolean;
  source: 'local_engine' | 'learned_memory' | 'llm_escalated';
  threatType: string;
  diagnosis: string;
  recommendedAction: string;
  capabilityToInvoke?: {
    action: string;
    params: Record<string, any>;
  };
  llmCallsUsed: number;
  fingerprint: string;
  learnedNewPattern?: boolean;
}

export class RyvixOrchestrator {
  /**
   * Software engineering and coding tasks are routed directly to the LLM Gateway.
   */
  async generateTaskPlan(param1: any, param2?: string): Promise<any> {
    let taskId = 'task_plan_01';
    let userInstruction = 'Implement required code modifications';
    let projectId = 'proj_default';

    if (typeof param1 === 'object' && param1 !== null) {
      taskId = param1.taskId || taskId;
      projectId = param1.projectId || projectId;
      userInstruction = param1.userPrompt || param1.userInstruction || userInstruction;
    } else if (typeof param1 === 'string') {
      taskId = param1;
      userInstruction = param2 || userInstruction;
    }

    const prompt = `You are the Ryvix AI Coding Orchestrator. Create a structured JSON execution plan for the following task:\n\n"${userInstruction}"\n\nOutput a JSON object with { planTitle, steps: [{ step_number, title, description, suggested_tool, requires_approval }] }.`;
    
    const response = await modelGateway.complete([{ role: 'user', content: prompt }]);

    let planTitle = `Autonomous Implementation Plan for ${taskId}`;
    let steps: any[] = [
      {
        order: 1,
        step_number: 1,
        title: 'Analyze repository context',
        action: 'analyze_repository',
        description: 'Inspect manifests and source files using repository analyzer',
        suggested_tool: 'repo.read_tree',
        requires_approval: false,
      },
      {
        order: 2,
        step_number: 2,
        title: 'Synthesize code modifications',
        action: 'execute_changes',
        description: `Implement: ${userInstruction}`,
        suggested_tool: 'workspace.generate_diff',
        requires_approval: true,
      },
      {
        order: 3,
        step_number: 3,
        title: 'Run test validation suite',
        action: 'verify_and_test',
        description: 'Run test suites and verify diffs in isolated sandbox',
        suggested_tool: 'workspace.run_tests',
        requires_approval: false,
      },
    ];

    try {
      const parsed = JSON.parse(response.content);
      if (parsed.planTitle) {
        planTitle = parsed.planTitle;
      }
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        steps = parsed.steps.map((s: any, idx: number) => ({
          order: s.order || idx + 1,
          step_number: s.step_number || idx + 1,
          title: s.title || s.action || `Step ${idx + 1}`,
          action: s.action || s.title || 'action',
          description: s.description || 'Execution step',
          suggested_tool: s.suggested_tool || 'workspace.execute',
          requires_approval: s.requires_approval ?? (idx === 1),
        }));
      }
    } catch {
      // Use fallback structured steps
    }

    return {
      taskId,
      projectId,
      planTitle,
      steps,
      providerUsed: response.providerUsed,
      llmCallsUsed: 1,
    };
  }

  /**
   * Autonomous server operations & attack analysis.
   * Prioritizes local intelligence and memory store, escalating to LLM only for novel zero-days.
   */
  async analyzeServerEvent(event: ServerEventData): Promise<ServerIncidentAnalysis> {
    // TIER 1: Evaluate via Local Intelligence Engine (<1ms, 0 LLM calls)
    const localResult: LocalAnalysisResult = LocalSecurityEngine.analyze(event);
    const rawLog = event.recentLogs?.join(' ');

    if (localResult.isKnown && localResult.threatType !== 'UNKNOWN') {
      return {
        resolvedLocally: true,
        source: 'local_engine',
        threatType: localResult.threatType,
        diagnosis: localResult.diagnosis,
        recommendedAction: localResult.recommendedAction,
        capabilityToInvoke: localResult.capabilityToInvoke,
        llmCallsUsed: 0,
        fingerprint: localResult.fingerprint,
      };
    }

    // TIER 2: Check Persistent Self-Learning Store (<1ms, 0 LLM calls)
    const learned: LearnedPattern | null = selfLearningStore.lookup(localResult.fingerprint, rawLog);
    if (learned) {
      return {
        resolvedLocally: true,
        source: 'learned_memory',
        threatType: learned.threatType,
        diagnosis: `[Self-Learned] ${learned.diagnosis}`,
        recommendedAction: learned.remediationAction,
        capabilityToInvoke: learned.capabilityToInvoke,
        llmCallsUsed: 0,
        fingerprint: localResult.fingerprint,
      };
    }

    // TIER 3: Novel Zero-Day Anomaly -> Escalate to LLM Reasoning Gateway
    const prompt = `You are the Ryvix Autonomous Security Specialist. An unrecognized server anomaly has occurred:
Hostname: ${event.hostname}
Metrics: CPU=${event.metrics.cpuPercent}%, MEM=${event.metrics.memPercent}%, DISK=${event.metrics.diskPercent}%
Recent Logs: ${event.recentLogs?.join('\n') || 'None'}
Systemd: ${JSON.stringify(event.systemdStates || [])}

Diagnose this threat and output JSON format:
{
  "threatType": "SHORT_CODE",
  "diagnosis": "Technical explanation",
  "remediationAction": "Actionable instructions",
  "action": "system.remediation_capability",
  "params": {}
}`;

    const llmResp = await modelGateway.complete([{ role: 'user', content: prompt }]);

    let parsedData = {
      threatType: 'ZERO_DAY_ANOMALY',
      diagnosis: 'Novel heuristic exploit diagnosed via LLM escalation.',
      remediationAction: 'Isolate compromised process and apply dynamic network containment.',
      action: 'security.quarantine_process',
      params: { reason: 'llm_diagnosed_zero_day' },
    };

    try {
      const jsonMatch = llmResp.content.match(/\{[\\s\\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedData = {
          threatType: parsed.threatType || parsedData.threatType,
          diagnosis: parsed.diagnosis || parsedData.diagnosis,
          remediationAction: parsed.remediationAction || parsedData.remediationAction,
          action: parsed.action || parsedData.action,
          params: parsed.params || parsedData.params,
        };
      }
    } catch {
      // Use fallback parsed data
    }

    // CONTINUOUS SELF-LEARNING: Commit the LLM's solution into permanent local memory
    selfLearningStore.learnPattern(localResult.fingerprint, {
      patternSignature: rawLog || `CPU:${event.metrics.cpuPercent}%_MEM:${event.metrics.memPercent}%`,
      threatType: parsedData.threatType,
      diagnosis: parsedData.diagnosis,
      remediationAction: parsedData.remediationAction,
      capabilityToInvoke: {
        action: parsedData.action,
        params: parsedData.params,
      },
      confidence: 0.95,
    });

    return {
      resolvedLocally: false,
      source: 'llm_escalated',
      threatType: parsedData.threatType,
      diagnosis: parsedData.diagnosis,
      recommendedAction: parsedData.remediationAction,
      capabilityToInvoke: {
        action: parsedData.action,
        params: parsedData.params,
      },
      llmCallsUsed: 1,
      fingerprint: localResult.fingerprint,
      learnedNewPattern: true,
    };
  }
}

export const orchestrator = new RyvixOrchestrator();

// Re-exports for modular consumer access
export { ModelGateway, modelGateway } from './model-gateway';
export { LocalSecurityEngine, type ServerEventData, type LocalAnalysisResult } from './local-security-engine';
export { SelfLearningStore, selfLearningStore } from './self-learning-store';

export const generateTaskPlan = (param1: any, param2?: string) =>
  orchestrator.generateTaskPlan(param1, param2);

export const analyzeServerEvent = (event: any) =>
  orchestrator.analyzeServerEvent(event);

import { codingAssistant, CodingAssistant } from './coding-assistant';
export { codingAssistant, CodingAssistant };
export const synthesizeCode = (instruction: string, ctx?: any) => codingAssistant.synthesizeCode(instruction, ctx);
export const explainCodeSimply = (diff: string) => codingAssistant.explainCodeSimply(diff);
export const selfDebugCode = (code: string, err: string) => codingAssistant.selfDebugCode(code, err);

// Server Archetypes, Modules & Access Management Exports
export { ServerClassifier, type ServerArchetype, type ServerFeatures } from './server-classifier';
export {
  ServerAccessManager,
  type ServerAccessType,
  type SshAccessConfig,
  type CloudProviderAccessConfig,
  type ServerAccessDiagnosis,
} from './server-access-manager';
export {
  SERVER_MODULES_REGISTRY,
  DETAILED_SERVER_ARCHETYPES,
  type ServerModuleDefinition,
  type DetailedServerArchetype,
} from './server-modules-knowledge';

// Neural Network Threat Classifier Exports
export {
  NeuralThreatClassifier,
  neuralThreatClassifier,
  type NeuralPrediction,
  NEURAL_THREAT_CLASSES,
} from './neural-network';

// Log Analysis & Root Cause Diagnostic Exports
export {
  LogAnalysisEngine,
  logAnalysisEngine,
  type LogLevel,
  type ParsedLogEntry,
  type LogRootCauseCategory,
  type LogAnalysisReport,
} from './log-analysis-engine';

// Deep SRE Autonomous Intelligence Exports
export {
  KillChainCorrelator,
  killChainCorrelator,
  type KillChainStage,
  type SecurityEventSignal,
  type KillChainProgression,
} from './kill-chain-correlator';

export {
  CascadingRootCauseAnalyzer,
  cascadingRootCauseAnalyzer,
  type ServiceDependencyNode,
  type ServiceFailureEvent,
  type CascadingAnalysisResult,
} from './cascading-root-cause';

export {
  AutonomousPerformanceTuner,
  autonomousPerformanceTuner,
  type HostHardwareProfile,
  type TunedSystemConfigurations,
} from './autonomous-tuner';

export {
  PredictiveResourceForecaster,
  predictiveResourceForecaster,
  type MetricSample,
  type ForecastEvaluation,
} from './predictive-forecast';

export {
  ExperienceReplayLedger,
  experienceReplayLedger,
  type RemediationTrial,
  type RemedyScoring,
} from './experience-ledger';

// General Intelligence Engine Exports
export {
  GeneralIntelligenceEngine,
  generalIntelligenceEngine,
  type ProblemScenario,
  type HypothesisEvaluation,
  type BlastRadiusAssessment,
  type ReasoningDeduction,
  type HighLevelGoal,
  type ExecutionTask,
  type ExecutionTaskDAG,
  type AdvisoryResponse,
} from './general-intelligence';

// Conversational Dialogue & Semantic Understanding Exports
export {
  ConversationalAgent,
  conversationalAgent,
  type AgentPersona,
  type CustomerAudienceRole,
  type CustomerSentiment,
  type CustomerChatContext,
  type CustomerChatResponse,
  type ChatMessage,
  type ConversationalTurnResponse,
} from './conversational-agent';

// Deep Self-Training & Meta-Learning Exports
export {
  DeepSelfTrainer,
  deepSelfTrainer,
  type SyntheticPerturbation,
  type TrainingRunSummary,
} from './deep-self-trainer';

// Project Stack & External LLM Co-Thinking Exports
export {
  ProjectStackAdvisor,
  projectStackAdvisor,
  type ProjectStackProfile,
  type ProjectDirective,
  type ProjectCoThinkingResponse,
} from './project-stack-advisor';

// Web Page Outage & Multi-Option Server Recovery Exports
export {
  WebOutageRecoveryEngine,
  webOutageRecoveryEngine,
  type WebOutageRootCause,
  type WebOutageTelemetry,
  type RecoveryOption,
  type WebOutageRecoveryPlan,
} from './web-outage-engine';

export {
  RyvixAgiCore,
  ryvixAgi,
  type AgiCognitiveState,
  type AgiPerceptionInput,
  type OodaCycleResult,
  type AgentDomainTask,
  type EpistemicBelief
} from "./agi-core";

export {
  brainDeliberativeReasoner,
  BrainDeliberativeReasoner,
  type BrainDialecticThoughtReport,
  type TreeOfThoughtBranch
} from "./brain-deliberative-reasoner";

export {
  riskAlertDispatcher,
  RiskAlertDispatcher,
  type RiskAlertNotification,
  type AlertSeverity,
  type AlertImpactedTarget,
  type NotificationChannelConfig
} from "./risk-alert-dispatcher";

export {
  ragEngine,
  RagEngine,
  type RagDocumentChunk,
  type RagSearchResult,
  type RagAugmentedResponse
} from "./rag-engine";

export {
  networkServerController,
  NetworkServerController,
  type ServerPlatformType,
  type NetworkIssueType,
  type NetworkDiagnosticRequest,
  type NetworkDiagnosticResult,
  type ServerControlTakeoverPlan,
  type ServerControlExecutionResult
} from "./network-server-controller";

// Customer Server & Website Health Query Agent Exports
export {
  CustomerHealthQueryAgent,
  customerHealthQueryAgent,
  type HealthQueryDomain,
  type HealthAgentResponse,
} from './customer-health-query-agent';

// =========================================================================
// AI UNDERSTANDING, CONTEXT BUILDER, LLM PLANNING & VALIDATION EXPORTS
// =========================================================================
export {
  RequirementRefiner,
  requirementRefiner,
  type RefinedRequirement,
  type RefinedIntentType,
  type TaskScope,
  type RefinementInput,
} from './understanding/intent-processor';

export {
  ContextBuilder,
  contextBuilder,
  type TaskContext,
  type ProjectMetadata,
  type ScopedFileEntry,
  type SanitizationReport,
  type ContextBuilderOptions,
} from './context/context-builder';

export {
  AIAgentLLMGateway,
  aiAgentLLMGateway,
  type RawLLMStep,
  type StructuredLLMPlanResult,
} from './llm/llm-gateway';

export {
  PlanGenerator,
  planGenerator,
  type PlanGenerationResult,
} from './planning/plan-generator';

export {
  PlanValidator,
  planValidator,
  type PlanValidationResult,
} from './validation/plan-validator';

export {
  ModelReadinessManager,
  modelReadinessManager,
  type ExecutionDataPoint,
  type ModelEvaluationMetrics,
} from './evaluation/model-readiness';

import { requirementRefiner, RefinedRequirement } from './understanding/intent-processor';
import { contextBuilder, TaskContext } from './context/context-builder';
import { planGenerator, PlanGenerationResult } from './planning/plan-generator';
import { planValidator, PlanValidationResult } from './validation/plan-validator';
import type { Plan } from '@ryvix/database';

export interface UserRequestToPlanResult {
  status: 'ambiguous_clarification_required' | 'plan_ready' | 'plan_rejected';
  refinedRequirement: RefinedRequirement;
  context?: TaskContext;
  plan?: Plan;
  validation?: PlanValidationResult;
  clarificationPrompt?: string;
  llmMetadata?: {
    providerUsed: string;
    modelUsed: string;
    latencyMs: number;
    isFallback: boolean;
  };
}

/**
 * End-to-End Pipeline:
 * Natural Language User Request -> Requirement Refinement -> Context Building -> LLM Planning -> Plan Validation
 */
export async function processUserRequestToPlan(input: {
  rawPrompt: string;
  taskId: string;
  project?: any;
  candidateFiles?: any[];
  runtimeTelemetry?: any;
}): Promise<UserRequestToPlanResult> {
  // Step 1: AI Understanding & Requirement Refinement
  const refined = await requirementRefiner.refine({ rawPrompt: input.rawPrompt });
  if (refined.isAmbiguous) {
    return {
      status: 'ambiguous_clarification_required',
      refinedRequirement: refined,
      clarificationPrompt: refined.clarificationPrompt,
    };
  }

  // Step 2: Context Building & Secret Stripping
  const context = await contextBuilder.buildContext(refined, {
    taskId: input.taskId,
    project: input.project,
    candidateFiles: input.candidateFiles,
    runtimeTelemetry: input.runtimeTelemetry,
  });

  // Step 3: Structured Technical Plan Generation
  const planResult: PlanGenerationResult = await planGenerator.generatePlan(refined, context);

  // Step 4: Plan Validation & Tool Authorization
  const validation: PlanValidationResult = planValidator.validatePlan(planResult.plan, context, refined);

  return {
    status: validation.isValid ? 'plan_ready' : 'plan_rejected',
    refinedRequirement: refined,
    context,
    plan: planResult.plan,
    validation,
    llmMetadata: planResult.llmMetadata,
  };
}

// Mem0 Cognitive Memory Architecture Integration
export * from './memory';

// Deep Autonomous Cognitive Architecture
export * from './semantic-cache';
export * from './graph-rag';
export * from './swarm-jury';
export * from './mcts-planner';
export * from './speculative-simulator';
export * from './reflexion-engine';

export * from './experience-ledger';
export * from './predictive-forecast';

// Frontier Deep Learning Architectures
export * from './deep-learning';

export * from './model-gateway';
