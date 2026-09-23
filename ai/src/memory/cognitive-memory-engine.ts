/**
 * @file cognitive-memory-engine.ts
 * @module @ryvix/ai/memory
 *
 * Mem0 Cognitive Architecture - Unified Memory Orchestrator
 * 
 * Integrates:
 * 1. Short-Term Memory: Ephemeral conversation turns and working task scratchpad
 * 2. Long-Term Memory: Persistent user preferences, tech stack facts, and incident fixes
 * 3. Semantic Memory: 64-D dense vector embedding associative recall
 * 
 * Provides unified interface:
 * - recordInteraction() -> updates Short-Term, extracts Long-Term facts, indexes Semantic entries
 * - recall() -> gathers 360-degree memory context for prompt augmentation
 * - formatPromptContext() -> produces clean markdown prompt injection blocks
 * - distillSession() -> consolidates finished interactions into persistent knowledge
 */

import {
  shortTermMemory,
  ShortTermMemoryManager,
  WorkingTurn,
  MemoryRole
} from './short-term-memory';
import {
  longTermMemory,
  LongTermMemoryManager,
  LongTermFact,
  FactCategory
} from './long-term-memory';
import {
  semanticMemory,
  SemanticMemoryManager,
  SemanticSearchResult,
  SemanticCategory
} from './semantic-memory';

export interface RecordInteractionInput {
  sessionId: string;
  userId?: string;
  role: MemoryRole;
  content: string;
  metadata?: Record<string, any>;
  extractLongTermFacts?: boolean;
}

export interface RecallMemoryInput {
  query: string;
  sessionId?: string;
  userId?: string;
  maxShortTerm?: number;
  maxLongTerm?: number;
  maxSemantic?: number;
}

export interface CognitiveMemoryRecallResult {
  query: string;
  shortTermTurns: WorkingTurn[];
  longTermFacts: LongTermFact[];
  semanticMatches: SemanticSearchResult[];
  formattedContext: string;
  latencyMs: number;
}

export class CognitiveMemoryEngine {
  public readonly shortTerm: ShortTermMemoryManager;
  public readonly longTerm: LongTermMemoryManager;
  public readonly semantic: SemanticMemoryManager;

  constructor(
    shortTermMgr: ShortTermMemoryManager = shortTermMemory,
    longTermMgr: LongTermMemoryManager = longTermMemory,
    semanticMgr: SemanticMemoryManager = semanticMemory
  ) {
    this.shortTerm = shortTermMgr;
    this.longTerm = longTermMgr;
    this.semantic = semanticMgr;
  }

  /**
   * Records an interaction turn across appropriate memory tiers
   */
  public recordInteraction(input: RecordInteractionInput): {
    turn: WorkingTurn;
    learnedFacts: LongTermFact[];
  } {
    const { sessionId, userId = 'global', role, content, metadata, extractLongTermFacts = true } = input;

    // 1. Record into Short-Term working memory
    const turn = this.shortTerm.recordTurn(sessionId, role, content, metadata);

    // 2. Extract facts for Long-Term memory if requested
    let learnedFacts: LongTermFact[] = [];
    if (extractLongTermFacts && role === 'user') {
      learnedFacts = this.longTerm.extractFactsFromInteraction(userId, content);
    }

    return { turn, learnedFacts };
  }

  /**
   * Recalls 360-degree memory context across Short-Term, Long-Term, and Semantic tiers
   */
  public recall(input: RecallMemoryInput): CognitiveMemoryRecallResult {
    const start = Date.now();
    const {
      query,
      sessionId,
      userId = 'global',
      maxShortTerm = 6,
      maxLongTerm = 4,
      maxSemantic = 3
    } = input;

    // 1. Short-Term Recall
    const shortTermTurns = sessionId
      ? this.shortTerm.getRecentTurns(sessionId, maxShortTerm)
      : [];

    // 2. Long-Term Persistent Facts Recall
    const longTermFacts = this.longTerm.searchFacts(userId, query, maxLongTerm);

    // 3. Semantic Vector Similarity Recall
    const semanticMatches = this.semantic.recall(query, maxSemantic);

    // 4. Synthesize Formatted Prompt Context
    const formattedContext = this.formatPromptContext({
      shortTermTurns,
      longTermFacts,
      semanticMatches
    });

    return {
      query,
      shortTermTurns,
      longTermFacts,
      semanticMatches,
      formattedContext,
      latencyMs: Date.now() - start
    };
  }

  /**
   * Formats retrieved memory into a compact, token-efficient prompt injection block
   */
  public formatPromptContext(result: {
    shortTermTurns: WorkingTurn[];
    longTermFacts: LongTermFact[];
    semanticMatches: SemanticSearchResult[];
  }): string {
    const sections: string[] = [];

    // 1. Long-Term Facts Section
    if (result.longTermFacts.length > 0) {
      const factLines = result.longTermFacts.map((f) => `- [${f.category}] ${f.fact}`);
      sections.push(`### USER & ARCHITECTURAL LONG-TERM KNOWLEDGE:\n${factLines.join('\n')}`);
    }

    // 2. Semantic Associative Memory Section
    if (result.semanticMatches.length > 0) {
      const semLines = result.semanticMatches.map(
        (m) => `- [${m.item.category}: ${m.item.title}] (Similarity: ${(m.similarity * 100).toFixed(1)}%): ${m.item.content}`
      );
      sections.push(`### ASSOCIATIVE SEMANTIC MEMORY:\n${semLines.join('\n')}`);
    }

    // 3. Short-Term Recent Turns Section
    if (result.shortTermTurns.length > 0) {
      const turnLines = result.shortTermTurns.map((t) => `${t.role.toUpperCase()}: ${t.content}`);
      sections.push(`### SHORT-TERM ACTIVE SESSION BUFFER:\n${turnLines.join('\n')}`);
    }

    if (sections.length === 0) {
      return '';
    }

    return `\n[--- MEM0 COGNITIVE MEMORY ACTIVE ---]\n${sections.join('\n\n')}\n[--- END MEMORY CONTEXT ---]\n`;
  }

  /**
   * Distills finished session into long-term knowledge and semantic memory
   */
  public distillSession(sessionId: string, userId: string = 'global'): {
    summaryCreated: boolean;
    extractedFactsCount: number;
  } {
    const turns = this.shortTerm.getRecentTurns(sessionId, 50);
    if (turns.length === 0) {
      return { summaryCreated: false, extractedFactsCount: 0 };
    }

    let extractedFactsCount = 0;
    for (const t of turns) {
      if (t.role === 'user') {
        const facts = this.longTerm.extractFactsFromInteraction(userId, t.content);
        extractedFactsCount += facts.length;
      }
    }

    // Index session into semantic memory
    const userPrompts = turns.filter((t) => t.role === 'user').map((t) => t.content).join('; ');
    const assistantResponses = turns.filter((t) => t.role === 'assistant').map((t) => t.content).slice(-2).join('; ');

    if (userPrompts.length > 10) {
      this.semantic.remember(
        `Session Distillation (${sessionId})`,
        `User Intent: ${userPrompts.slice(0, 300)}. Outcome: ${assistantResponses.slice(0, 300)}`,
        'EXPERIENCE',
        ['session_distillation', 'chat_history']
      );
    }

    return { summaryCreated: true, extractedFactsCount };
  }

  /**
   * Returns aggregated statistics across all 3 tiers
   */
  public getMetrics(): {
    shortTerm: { activeSessions: number; totalTurns: number };
    longTerm: { totalFacts: number; categories: Record<string, number> };
    semantic: { totalItems: number; categories: Record<string, number> };
  } {
    return {
      shortTerm: this.shortTerm.getStats(),
      longTerm: this.longTerm.getStats(),
      semantic: this.semantic.getStats()
    };
  }
}

export const cognitiveMemory = new CognitiveMemoryEngine();
