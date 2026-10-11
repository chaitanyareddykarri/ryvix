import {ModelUnavailableError,providerFailureReason} from './provider-errors';
import {compactMessages} from './context/message-budget';
import {ModelQuotaError} from './model-capacity';
import { streamProvider } from './provider-stream';
import type {TokenUsage} from './token-usage';
import {tokenCount} from './token-usage';
import {randomUUID} from 'node:crypto';
import type {AttemptObserver,ModelAttempt} from './model-attempt';
import {requireAttemptObserver} from './model-attempt';
/**
 * Ryvix Multi-Provider LLM Gateway with Automatic Rate-Limit Failover
 * 
 * Supports:
 * - Free / Low-Cost High-Speed Providers (Groq, Hugging Face, Google Gemini, Ollama)
 * - Automatic 429 Rate-Limit Detection & Instant Failover to the next healthy provider
 * - Explicit ordered fallback; selected production chains fail visibly when unavailable
 * - Token usage, latency metrics, and audit tracking
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  apiKey?: string;
  priority: number; // 1 is highest priority
  isRateLimitedUntil: number;
}

export type LLMResponse = LLMCompletionResult;

export interface LLMCompletionResult {
  content: string;
  providerUsed: string;
  modelUsed: string;
  promptTokens: number|null;
  completionTokens: number|null;
  latencyMs: number;
  failoverOccurred: boolean;
  failedProviders: string[];
}

export class ModelGateway {
  private providers: ProviderDefinition[] = [];
  private selectedProviders() {
    const selected = process.env.RYVIX_MODEL_PROVIDER;
    const chain = process.env.RYVIX_MODEL_FALLBACK_ORDER?.trim();
    if (chain) {
      const ids = chain.split(',').map(id => id.trim());
      if (new Set(ids).size !== ids.length || ids.some(id => !['gemini','groq','openai','claude'].includes(id))) throw new Error('Invalid model fallback order');
      if (selected && selected !== ids[0]) throw new Error('Primary provider conflicts with fallback order');
      if (process.env.RYVIX_CHAT_PROVIDER && process.env.RYVIX_CHAT_PROVIDER !== ids[0]) throw new Error('Chat provider conflicts with fallback order');
      return ids.map(id => {
        const provider = this.providers.find(p => p.id === id)!;
        const model = process.env[`${id.toUpperCase()}_MODEL`]?.trim();
        if (!model) throw new Error('Every fallback provider requires an explicit model');
        provider.model = model;
        return provider;
      });
    }
    if (selected && !this.providers.some(p => p.id === selected)) throw new Error('Unknown selected model provider');
    return [...this.providers].filter(p => !selected || p.id === selected).sort((a,b) => a.priority-b.priority).map(p => {
      const model = process.env[`${p.id.toUpperCase()}_MODEL`]?.trim();
      if (selected && !model) throw new Error('Selected provider requires an explicit model');
      if (model) p.model = model;
      return p;
    });
  }

  async *stream(messages: LLMMessage[], options: { maxTokens?: number; temperature?: number; signal?: AbortSignal;
    onProvider?: (provider: string, model: string) => void;onUsage?:(usage:TokenUsage&{provider:string;model:string})=>void;onAttempt?:AttemptObserver } = {}) {
    requireAttemptObserver(options.onAttempt);
    messages=compactMessages(messages,Number(process.env.RYVIX_MODEL_CONTEXT_CHAR_BUDGET||64000));
    const signal = AbortSignal.any([AbortSignal.timeout(120000), ...(options.signal ? [options.signal] : [])]);
    for (const provider of this.selectedProviders()) {
      if (!process.env.RYVIX_MODEL_FALLBACK_ORDER?.trim() && process.env.RYVIX_CHAT_PROVIDER && provider.id !== process.env.RYVIX_CHAT_PROVIDER) continue;
      if (signal.aborted) throw new Error('Model request cancelled');
      if (provider.isRateLimitedUntil > Date.now()) continue;
      const apiKey = this.getApiKey(provider.id) || provider.apiKey;
      if (!apiKey && provider.id !== 'ollama') continue;
      let emitted = false;
      const model = process.env[`${provider.id.toUpperCase()}_MODEL`] || provider.model;
      const attempt:ModelAttempt={id:randomUUID(),provider:provider.id,model,status:'started',latencyMs:0,usage:null};
      const started=Date.now();await options.onAttempt?.({...attempt});
      let outcome:ModelAttempt['status']='cancelled';
      try {
        signal.throwIfAborted();
        let usage:TokenUsage|undefined;
        const attemptSignal = AbortSignal.any([signal, AbortSignal.timeout(45000)]);
        for await (const chunk of streamProvider({ ...provider, apiKey, model }, messages, { ...options, signal:attemptSignal,onUsage:value=>{usage=value;},onObservedUsage:value=>{attempt.usage=value;} })) {
          if (!emitted) options.onProvider?.(provider.id,model);
          emitted = true;
          yield chunk;
        }
        if (!emitted) throw new Error('Empty provider response');
        if(usage)options.onUsage?.({...usage,provider:provider.id,model});
        outcome='completed';
        return;
      } catch (error) {
        outcome=signal.aborted?'cancelled':'failed';
        if (emitted || signal.aborted) throw new Error('Model stream interrupted. Please retry.');
        if (error instanceof Error && error.message.includes('429')) {
          const retryAt = (error as Error & {retryAt?:number}).retryAt;
          provider.isRateLimitedUntil = Math.max(Date.now()+60000,Number.isFinite(retryAt)?retryAt!:0);
        }
      } finally {
        await options.onAttempt?.({...attempt,status:outcome,latencyMs:Math.min(300000,Math.max(0,Date.now()-started))});
      }
    }
    this.throwIfQuotaLimited();
    throw new Error('No streaming AI provider is available. Configure a provider and retry.');
  }

  constructor() {
    this.initializeDefaultProviders();
  }
  private throwIfQuotaLimited() {
    const selected=this.selectedProviders();
    if(selected.length&&selected.every(p=>p.isRateLimitedUntil>Date.now()))throw new ModelQuotaError(Math.min(...selected.map(p=>p.isRateLimitedUntil)));
  }

  /**
   * Initializes the multi-provider failover chain.
   */

  /**
   * Resolves credentials only from the explicit process environment loaded by the entry point.
   */
  public getApiKey(providerId: string): string | undefined {
    let key: string | undefined;
    switch (providerId) {
      case 'groq':
        key = process.env.GROQ_API_KEY;
        break;
      case 'openai':
        key = process.env.OPENAI_API_KEY;
        break;
      case 'claude':
        key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
        break;
      case 'gemini':
        key = process.env.GEMINI_API_KEY;
        break;
      case 'huggingface':
        key = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
        break;
    }

    return key;
  }

  private initializeDefaultProviders() {
    this.providers = [
      // 1. Groq Cloud (Verified high-speed live inference: Qwen 3.8 / GPT-OSS)
      {
        id: 'groq',
        name: 'Groq Cloud (GPT-OSS 120B / 20B)',
        model: 'openai/gpt-oss-120b',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        priority: 1,
        isRateLimitedUntil: 0,
      },
      // 2. OpenAI (GPT-4o-mini / GPT-4o)
      {
        id: 'openai',
        name: 'OpenAI (GPT-4o-mini)',
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        priority: 2,
        isRateLimitedUntil: 0,
      },
      // 3. Anthropic Claude (Claude 3.5 Sonnet / Haiku)
      {
        id: 'claude',
        name: 'Anthropic Claude (3.5 Sonnet)',
        model: 'claude-3-5-sonnet-20241022',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: process.env.ANTHROPIC_API_KEY,
        priority: 3,
        isRateLimitedUntil: 0,
      },
      // 4. Google Gemini API
      {
        id: 'gemini',
        name: 'Google Gemini',
        model: 'gemini-1.5-flash',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: process.env.GEMINI_API_KEY,
        priority: 4,
        isRateLimitedUntil: 0,
      },
      // 5. Hugging Face Serverless
      {
        id: 'huggingface',
        name: 'Hugging Face Serverless (Qwen2.5-Coder)',
        model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        baseUrl: 'https://api-inference.huggingface.co/models',
        apiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN,
        priority: 5,
        isRateLimitedUntil: 0,
      },
      // 6. Local Ollama (100% Free on developer machine)
      {
        id: 'ollama',
        name: 'Local Ollama (qwen2.5-coder)',
        model: 'qwen2.5-coder:7b',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: undefined,
        priority: 6,
        isRateLimitedUntil: 0,
      },
    ];
  }

  /**
   * Registers or updates a model provider dynamically.
   */
  registerProvider(provider: ProviderDefinition) {
    const existingIndex = this.providers.findIndex((p) => p.id === provider.id);
    if (existingIndex >= 0) {
      this.providers[existingIndex] = provider;
    } else {
      this.providers.push(provider);
    }
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Executes a prompt with automatic rate-limit failover across the provider chain.
   */
  async complete(
    messages: LLMMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      requireProvider?: boolean;
      signal?: AbortSignal;
      onAttempt?: AttemptObserver;
      mockProviderFailures?: Record<string, number>; // For automated failover tests
    }
  ): Promise<LLMCompletionResult> {
    requireAttemptObserver(options?.onAttempt);
    messages=compactMessages(messages,Number(process.env.RYVIX_MODEL_CONTEXT_CHAR_BUDGET||64000));
    const startTime = Date.now();
    const signal = AbortSignal.any([AbortSignal.timeout(120000), ...(options?.signal ? [options.signal] : [])]);
    const failedProviders: string[] = [];
    const now = Date.now();

    // Sort providers by priority
    const sorted = this.selectedProviders();

    for (const provider of sorted) {
      signal.throwIfAborted();
      const activeKey = this.getApiKey(provider.id) || provider.apiKey;
      provider.apiKey = activeKey;
      // Check if provider is temporarily cooled down due to prior 429
      if (provider.isRateLimitedUntil > now) {
        failedProviders.push(`${provider.id} (cooling down until ${new Date(provider.isRateLimitedUntil).toISOString()})`);
        continue;
      }

      // Check simulated mock failures for automated testing
      if (options?.mockProviderFailures && options.mockProviderFailures[provider.id]) {
        const failureCode = options.mockProviderFailures[provider.id];
        if (failureCode === 429) {
          // Trip rate limit cooldown for 60 seconds
          provider.isRateLimitedUntil = now + 60000;
          failedProviders.push(`${provider.id} (HTTP 429: Rate Limit Exceeded)`);
          continue; // Automatically try next provider in chain!
        } else if (failureCode >= 500) {
          failedProviders.push(`${provider.id} (HTTP ${failureCode}: Provider Service Unavailable)`);
          continue;
        }
      }

      // If provider has an API key configured (or is local Ollama)
      if (provider.apiKey || provider.id === 'ollama') {
        const attempt: ModelAttempt = {id:randomUUID(),provider:provider.id,model:provider.model,status:'started',latencyMs:0,usage:null};
        const attemptStart=Date.now();
        await options?.onAttempt?.({...attempt});
        try {
          signal.throwIfAborted();
          const attemptSignal = AbortSignal.any([signal, AbortSignal.timeout(45000)]);
          const res = await this.callProvider(provider, messages, {...options,signal:attemptSignal});
          attempt.status='completed';
          attempt.usage={promptTokens:res.promptTokens,completionTokens:res.completionTokens,cachedInputTokens:null,cacheWriteTokens:null};
          const latencyMs = Date.now() - startTime;
          return {
            content: res.content,
            providerUsed: provider.id,
            modelUsed: provider.model,
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            latencyMs,
            failoverOccurred: failedProviders.length > 0,
            failedProviders,
          };
        } catch (err: any) {
          attempt.status=signal.aborted?'cancelled':'failed';
          if(signal.aborted)throw new Error('Model request cancelled');
          const errMsg = err.message || '';
          if (errMsg.includes('429') || errMsg.includes('rate limit')) {
            provider.isRateLimitedUntil = Math.max(Date.now()+60000,Number.isFinite(err.retryAt)?err.retryAt:0);
            failedProviders.push(`${provider.id} (429 Rate Limit)`);
          } else {
            failedProviders.push(`${provider.id} (${providerFailureReason(err)})`);
          }
          // Continue to next provider in failover chain!
          continue;
        } finally {
          await options?.onAttempt?.({...attempt,latencyMs:Math.min(300000,Math.max(0,Date.now()-attemptStart))});
        }
      } else {
        // No API key provided for this provider, skip to next
        failedProviders.push(`${provider.id} (No API key configured)`);
      }
    }

    // -----------------------------------------------------------------------
    // Legacy development-only deterministic fallback (never for explicit chains).
    // -----------------------------------------------------------------------
    // If all external API providers are exhausted or no keys are set,
    // legacy unconfigured development callers may use a deterministic fixture plan.
    const latencyMs = Date.now() - startTime;
    this.throwIfQuotaLimited();
    if (options?.requireProvider || process.env.RYVIX_MODEL_PROVIDER || process.env.RYVIX_MODEL_FALLBACK_ORDER?.trim() || process.env.NODE_ENV==='production') throw new ModelUnavailableError(failedProviders);
    const userMsg = messages.find((m) => m.role === 'user')?.content || 'Autonomous Task';
    const localContent = this.generateLocalReasoning(userMsg);

    return {
      content: localContent,
      providerUsed: 'local_deterministic_engine',
      modelUsed: 'ryvix-deterministic-planner-v1',
      promptTokens: null,
      completionTokens: null,
      latencyMs,
      failoverOccurred: failedProviders.length > 0,
      failedProviders,
    };
  }

  /**
   * Invokes an OpenAI-compatible / Hugging Face inference endpoint.
   */

  private async executeHttpCall(
    provider: ProviderDefinition,
    modelName: string,
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?:AbortSignal }
  ): Promise<{ content: string; promptTokens: number|null; completionTokens: number|null }> {
    const url = `${provider.baseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    };

    const payload = {
      model: modelName,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens || 1024,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: options?.signal,
      redirect: 'error',
    });

    if (res.status === 429) {
      const retry = res.headers.get('retry-after');
      const seconds = retry === null ? NaN : Number(retry);
      const retryAt = Number.isFinite(seconds) ? Date.now()+Math.max(0,seconds)*1000 : Date.parse(retry || '');
      await res.body?.cancel();
      throw Object.assign(new Error(`429 Rate Limit Exceeded on ${provider.id} (${modelName})`),{retryAt});
    }

    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`HTTP ${res.status} from ${provider.id}`);
    }

    const data = await res.json();
    if (data.choices?.[0]?.finish_reason === 'length') throw new Error('Provider answer reached its output limit');
    const content = data.choices?.[0]?.message?.content || '';
    if (!content.trim()) throw new Error('Empty provider response');
    return {
      content,
      promptTokens: tokenCount(data.usage?.prompt_tokens),
      completionTokens: tokenCount(data.usage?.completion_tokens),
    };
  }

  private async callProvider(
    provider: ProviderDefinition,
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number; signal?:AbortSignal }
  ): Promise<{ content: string; promptTokens: number|null; completionTokens: number|null }> {
    // A. Native Anthropic Claude API
    if (provider.id === 'claude') {
      const claudePayload = {
        model: provider.model,
        max_tokens: options?.maxTokens || 1024,
        messages: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
        system: messages.find((m) => m.role === 'system')?.content,
      };

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(claudePayload),
        signal: options?.signal,
        redirect: 'error',
      });

      if (res.status === 429) {
        const retry = res.headers.get('retry-after');
      const seconds = retry === null ? NaN : Number(retry);
      await res.body?.cancel();
      throw Object.assign(new Error(`429 Rate Limit Exceeded on ${provider.id}`), {retryAt: Number.isFinite(seconds) ? Date.now()+Math.max(0,seconds)*1000 : Date.parse(retry || '')});
      }
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status} from ${provider.id}: ${errText.slice(0, 80)}`);
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';
      return {
        content,
        promptTokens: tokenCount(data.usage?.input_tokens),
        completionTokens: tokenCount(data.usage?.output_tokens),
      };
    }
    const url = provider.id === 'huggingface'
      ? `${provider.baseUrl}/${provider.model}`
      : `${provider.baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    const payload = provider.id === 'huggingface'
      ? {
          inputs: messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'),
          parameters: {
            max_new_tokens: options?.maxTokens || 1024,
            temperature: options?.temperature ?? 0.2,
          },
        }
      : {
          model: provider.model,
          messages,
          temperature: options?.temperature ?? 0.2,
          max_tokens: options?.maxTokens || 1024,
        };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: options?.signal,
      redirect: 'error',
    });

    if (res.status === 429) {
      const retry = res.headers.get('retry-after');
      const seconds = retry === null ? NaN : Number(retry);
      await res.body?.cancel();
      throw Object.assign(new Error(`429 Rate Limit Exceeded on ${provider.id}`), {retryAt: Number.isFinite(seconds) ? Date.now()+Math.max(0,seconds)*1000 : Date.parse(retry || '')});
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status} from ${provider.id}: ${errText.slice(0, 80)}`);
    }

    const data = await res.json();
    let content = '';
    let promptTokens:number|null = null;
    let completionTokens:number|null = null;

    if (Array.isArray(data) && data[0]?.generated_text) {
      content = data[0].generated_text;
    } else if (data.choices && data.choices[0]?.message?.content) {
      content = data.choices[0].message.content;
      promptTokens = tokenCount(data.usage?.prompt_tokens);
      completionTokens = tokenCount(data.usage?.completion_tokens);
    } else {
      throw new Error('Empty provider response');
    }

    return { content, promptTokens, completionTokens };
  }

  /**
   * Deterministic local fallback plan generator.
   */
  private generateLocalReasoning(promptText: string): string {
    // If it is an escalated server incident/threat diagnosis
    if (promptText.includes('Ryvix Autonomous Security Specialist') || promptText.includes('Diagnose this threat') || promptText.includes('threatType')) {
      return JSON.stringify({
        threatType: 'ZERO_DAY_ANOMALY',
        diagnosis: 'Novel heuristic exploit pattern diagnosed via synthesized zero-day forensic analysis.',
        remediationAction: 'Quarantine offending process tree, enforce ephemeral container isolation, and apply network egress policy.',
        action: 'security.quarantine_process',
        params: { reason: 'llm_diagnosed_zero_day', isolationMode: 'strict' },
      });
    }

    // Default: Coding Task Execution Plan
    const userMatch = promptText.match(/"([^"]+)"/);
    const cleanTask = userMatch ? userMatch[1] : promptText.replace(/^You are the Ryvix AI Coding Orchestrator[^\n]*\n+/i, '').slice(0, 45);
    const cleanTitle = cleanTask.slice(0, 45).replace(/[\r\n]+/g, ' ').trim();

    return JSON.stringify({
      planTitle: `Implementation Plan: ${cleanTitle}`,
      steps: [
        {
          order: 1,
          step_number: 1,
          action: 'analyze_repository',
          title: 'Analyze repository context',
          description: 'Inspect manifests and source files using repository analyzer',
          requires_approval: false,
          status: 'pending',
          suggested_tool: 'repo.read_tree',
        },
        {
          order: 2,
          step_number: 2,
          action: 'execute_changes',
          title: 'Synthesize code modifications',
          description: 'Apply unified AST diffs in ephemeral Docker sandbox',
          requires_approval: true,
          status: 'pending',
          suggested_tool: 'workspace.generate_diff',
        },
        {
          order: 3,
          step_number: 3,
          action: 'verify_and_test',
          title: 'Run test validation suite',
          description: 'Execute build and verification runners in isolated sandbox',
          requires_approval: false,
          status: 'pending',
          suggested_tool: 'workspace.run_tests',
        },
      ],
    });
  }

  getProviders(): ProviderDefinition[] {
    return [...this.providers];
  }
}

export const modelGateway = new ModelGateway();
