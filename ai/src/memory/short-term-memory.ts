/**
 * @file short-term-memory.ts
 * @module @ryvix/ai/memory
 *
 * Mem0 Cognitive Architecture - Short-Term Working Memory
 * 
 * Ephemeral, high-speed conversation and task working buffer:
 * - Maintains active conversation turns with sliding-window capacity
 * - Manages transient task scratchpad (active files, open commands, pending queries)
 * - Automatically handles TTL eviction and memory compaction
 */

export type MemoryRole = 'user' | 'assistant' | 'system' | 'tool';

export interface WorkingTurn {
  id: string;
  role: MemoryRole;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SessionWorkingMemory {
  sessionId: string;
  turns: WorkingTurn[];
  scratchpad: Record<string, any>;
  createdAt: string;
  lastActiveAt: string;
}

export interface ShortTermMemoryConfig {
  maxTurnsPerSession?: number;
  sessionTtlMs?: number;
}

export class ShortTermMemoryManager {
  private sessions = new Map<string, SessionWorkingMemory>();
  private readonly maxTurns: number;
  private readonly sessionTtlMs: number;

  constructor(config?: ShortTermMemoryConfig) {
    this.maxTurns = config?.maxTurnsPerSession ?? 20;
    this.sessionTtlMs = config?.sessionTtlMs ?? 2 * 60 * 60 * 1000; // 2 hours
  }

  private getOrCreateSession(sessionId: string): SessionWorkingMemory {
    let session = this.sessions.get(sessionId);
    const now = new Date().toISOString();

    if (!session) {
      session = {
        sessionId,
        turns: [],
        scratchpad: {},
        createdAt: now,
        lastActiveAt: now
      };
      this.sessions.set(sessionId, session);
    } else {
      session.lastActiveAt = now;
    }

    return session;
  }

  /**
   * Records a single turn into active working memory
   */
  public recordTurn(
    sessionId: string,
    role: MemoryRole,
    content: string,
    metadata?: Record<string, any>
  ): WorkingTurn {
    const session = this.getOrCreateSession(sessionId);
    const turn: WorkingTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };

    session.turns.push(turn);

    // Sliding window eviction: keep only latest maxTurns
    if (session.turns.length > this.maxTurns) {
      session.turns = session.turns.slice(-this.maxTurns);
    }

    return turn;
  }

  /**
   * Retrieves the most recent turns for a given session
   */
  public getRecentTurns(sessionId: string, limit: number = 10): WorkingTurn[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.turns.slice(-Math.min(limit, this.maxTurns));
  }

  /**
   * Updates a key in the task scratchpad for transient reasoning
   */
  public setScratchpad(sessionId: string, key: string, value: any): void {
    const session = this.getOrCreateSession(sessionId);
    session.scratchpad[key] = value;
  }

  /**
   * Retrieves a scratchpad key or entire scratchpad
   */
  public getScratchpad(sessionId: string, key?: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return key ? undefined : {};
    return key ? session.scratchpad[key] : { ...session.scratchpad };
  }

  /**
   * Clears a session working memory
   */
  public clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Prunes sessions that have been inactive longer than sessionTtlMs
   */
  public pruneExpiredSessions(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, session] of this.sessions.entries()) {
      const lastActive = new Date(session.lastActiveAt).getTime();
      if (now - lastActive > this.sessionTtlMs) {
        this.sessions.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Returns current memory metrics
   */
  public getStats(): { activeSessions: number; totalTurns: number } {
    let totalTurns = 0;
    for (const s of this.sessions.values()) {
      totalTurns += s.turns.length;
    }
    return {
      activeSessions: this.sessions.size,
      totalTurns
    };
  }
}

export const shortTermMemory = new ShortTermMemoryManager();
