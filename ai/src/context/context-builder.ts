/**
 * Ryvix Task Context Builder & Secrets Sanitization Layer
 * 
 * Responsibilities:
 * - Scopes project, repository, and runtime context strictly to the current task
 * - Prevents dumping the entire codebase or full server telemetry into the LLM prompt
 * - Protects credentials: automatically strips passwords, private keys, service-role keys, tokens
 * - Produces an authorized, clean, scoped TaskContext object
 */

import { RefinedRequirement } from '../understanding/intent-processor';

export interface ProjectMetadata {
  id: string;
  name: string;
  framework: string;
  language: string;
  packageManager: string;
  buildCommand?: string;
  testCommand?: string;
  defaultPort?: number;
}

export interface ScopedFileEntry {
  path: string;
  summary?: string;
  contentSnippet?: string;
}

export interface SanitizationReport {
  strippedTokensCount: number;
  clean: boolean;
  redactedKeys: string[];
}

export interface TaskContext {
  taskId: string;
  refinedRequirement: RefinedRequirement;
  project: ProjectMetadata;
  relevantFiles: ScopedFileEntry[];
  allowedTools: string[];
  policies: string[];
  runtimeContext?: Record<string, unknown>;
  sanitizationReport: SanitizationReport;
  createdAt: string;
}

export interface ContextBuilderOptions {
  taskId: string;
  project?: Partial<ProjectMetadata>;
  candidateFiles?: Array<{ path: string; content?: string }>;
  runtimeTelemetry?: Record<string, unknown>;
  customPolicies?: string[];
}

export class ContextBuilder {
  private static readonly SECRET_PATTERNS: RegExp[] = [
    new RegExp('-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\\s\\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----', 'gi'),
    new RegExp('(?:password|passwd|pwd|secret|api_key|token|auth_token|service_role_key|jwt_secret)\\s*[:=]\\s*["\']?([a-zA-Z0-9_\\-\\.]{8,})["\']?', 'gi'),
    new RegExp('ghp_[a-zA-Z0-9]{36}', 'gi'),
    new RegExp('sk-[a-zA-Z0-9]{32,}', 'gi'),
    new RegExp('postgres(?:ql)?:\\/\\/[^:]+:([^@]+)@', 'gi'),
    new RegExp('bearer\\s+[a-zA-Z0-9\\-_\\.~\\+\\/]+=*', 'gi'),
  ];

  private static readonly DEFAULT_ALLOWED_TOOLS = [
    'workspace.read_file',
    'workspace.list_dir',
    'workspace.apply_diff',
    'workspace.run_tests',
    'workspace.build',
    'workspace.start_preview',
    'workspace.get_preview_url',
    'github.create_branch',
    'github.create_pr',
    'audit.record_event',
    'user.await_approval',
  ];

  private static readonly DEFAULT_POLICIES = [
    'READ_ONLY_BEFORE_APPROVAL: All files outside ephemeral sandbox are immutable before approval',
    'ISOLATE_IN_CONTAINER_SANDBOX: Compile, test, and preview must run inside isolated container',
    'NO_DIRECT_PRODUCTION_MUTATION: Production cannot be modified directly without user approval',
    'PRESERVE_AUTH_PROTOCOLS: Do not alter Supabase/OAuth configurations without explicit intent',
    'SECRETS_PROHIBITED_IN_PROMPT: No credentials, private keys, or passwords may be emitted',
  ];

  /**
   * Builds an authorized, scoped, and secret-sanitized task context.
   */
  async buildContext(
    refinedReq: RefinedRequirement,
    options: ContextBuilderOptions
  ): Promise<TaskContext> {
    const project: ProjectMetadata = {
      id: options.project?.id || 'proj_active',
      name: options.project?.name || 'ryvix-storefront',
      framework: options.project?.framework || 'Next.js 15',
      language: options.project?.language || 'typescript',
      packageManager: options.project?.packageManager || 'npm',
      buildCommand: options.project?.buildCommand || 'npm run build',
      testCommand: options.project?.testCommand || 'npm test',
      defaultPort: options.project?.defaultPort || 3000,
    };

    // 1. Scope files strictly to target (limit to max 5 relevant files)
    const scopedFiles = this.filterRelevantFiles(refinedReq, options.candidateFiles || []);

    // 2. Sanitize files and runtime telemetry for secrets
    const { sanitizedFiles, sanitizedTelemetry, report } = this.sanitizeContext(
      scopedFiles,
      options.runtimeTelemetry
    );

    // 3. Assemble authorized tools
    const allowedTools = [...ContextBuilder.DEFAULT_ALLOWED_TOOLS];
    if (refinedReq.scope === 'server_ops') {
      allowedTools.push('connector.query_telemetry', 'connector.restart_service');
    }

    const policies = [...ContextBuilder.DEFAULT_POLICIES, ...(options.customPolicies || [])];

    return {
      taskId: options.taskId,
      refinedRequirement: refinedReq,
      project,
      relevantFiles: sanitizedFiles,
      allowedTools,
      policies,
      runtimeContext: sanitizedTelemetry,
      sanitizationReport: report,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Selects only the 1-5 files directly relevant to the target, rather than the entire repo.
   */
  private filterRelevantFiles(
    req: RefinedRequirement,
    candidates: Array<{ path: string; content?: string }>
  ): ScopedFileEntry[] {
    if (candidates.length === 0) {
      if (req.target.includes('login')) {
        return [
          { path: 'app/login/page.tsx', summary: 'Supabase authentication form and UI' },
          { path: 'components/LoginForm.tsx', summary: 'Form inputs, state, and submit handler' },
        ];
      }
      return [
        { path: 'app/page.tsx', summary: 'Homepage structure and root layout components' },
        { path: 'components/Hero.tsx', summary: 'Hero section and top banner elements' },
      ];
    }

    const targetLower = (req.target + ' ' + req.requestedOutcome).toLowerCase();
    
    // Sort candidates by relevance score
    const scored = candidates.map((c) => {
      let score = 0;
      const pathLower = c.path.toLowerCase();
      if (/page\.tsx|page\.jsx|main\.py|main\.go|app\.tsx/i.test(pathLower)) score += 3;
      if (/login|auth/i.test(targetLower) && /login|auth/i.test(pathLower)) score += 10;
      if (/hero|banner|header/i.test(targetLower) && /hero|banner|header/i.test(pathLower)) score += 10;
      if (/nav|menu/i.test(targetLower) && /nav|menu/i.test(pathLower)) score += 10;
      return { ...c, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Limit to top 5 files to protect context window and token budget
    return scored.slice(0, 5).map((f) => ({
      path: f.path,
      contentSnippet: f.content ? f.content.slice(0, 1500) : undefined,
      summary: 'Target file for ' + req.target,
    }));
  }

  /**
   * Sanitizes all strings within the context to strictly prevent leaking credentials.
   */
  private sanitizeContext(
    files: ScopedFileEntry[],
    telemetry?: Record<string, unknown>
  ): {
    sanitizedFiles: ScopedFileEntry[];
    sanitizedTelemetry?: Record<string, unknown>;
    report: SanitizationReport;
  } {
    let strippedCount = 0;
    const redactedKeys: string[] = [];

    const sanitizeString = (val: string, keyName = 'text'): string => {
      let result = val;
      for (const pattern of ContextBuilder.SECRET_PATTERNS) {
        if (pattern.test(result)) {
          strippedCount++;
          if (!redactedKeys.includes(keyName)) redactedKeys.push(keyName);
          result = result.replace(pattern, '[REDACTED_SECRET]');
        }
      }
      return result;
    };

    const sanitizedFiles: ScopedFileEntry[] = files.map((f) => ({
      path: f.path,
      summary: f.summary ? sanitizeString(f.summary, 'file_summary') : undefined,
      contentSnippet: f.contentSnippet ? sanitizeString(f.contentSnippet, f.path) : undefined,
    }));

    let sanitizedTelemetry: Record<string, unknown> | undefined = undefined;
    if (telemetry) {
      sanitizedTelemetry = {};
      for (const [k, v] of Object.entries(telemetry)) {
        if (/secret|token|password|key|auth|credential/i.test(k)) {
          strippedCount++;
          redactedKeys.push(k);
          sanitizedTelemetry[k] = '[REDACTED_SECRET]';
        } else if (typeof v === 'string') {
          sanitizedTelemetry[k] = sanitizeString(v, k);
        } else {
          sanitizedTelemetry[k] = v;
        }
      }
    }

    return {
      sanitizedFiles,
      sanitizedTelemetry,
      report: {
        strippedTokensCount: strippedCount,
        clean: strippedCount === 0,
        redactedKeys,
      },
    };
  }
}

export const contextBuilder = new ContextBuilder();
