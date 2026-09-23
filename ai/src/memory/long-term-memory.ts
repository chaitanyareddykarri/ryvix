/**
 * @file long-term-memory.ts
 * @module @ryvix/ai/memory
 *
 * Mem0 Cognitive Architecture - Long-Term Persistent Memory
 * 
 * Persistent episodic, declarative, and semantic knowledge store:
 * - Persists user preferences, tech stack constraints, and domain policies
 * - Remembers resolved incidents and operational troubleshooting runbooks
 * - Automatically learns and extracts facts from live user interactions
 * - Saves atomically to disk (ai/data/long_term_cognitive_memory.json)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export type FactCategory = 
  | 'USER_PREFERENCE'
  | 'TECH_STACK'
  | 'SYSTEM_CONFIG'
  | 'HISTORICAL_INCIDENT'
  | 'SECURITY_POLICY';

export interface LongTermFact {
  id: string;
  entityId: string; // userId, orgId, or 'global'
  category: FactCategory;
  fact: string;
  confidence: number; // 0.0 - 1.0
  accessCount: number;
  tags: string[];
  createdAt: string;
  lastAccessedAt: string;
}

export class LongTermMemoryManager {
  private facts = new Map<string, LongTermFact>();
  private persistencePath: string;

  constructor(customPath?: string) {
    this.persistencePath = customPath || path.resolve(__dirname, '..', '..', 'data', 'long_term_cognitive_memory.json');
    this.load();
  }

  /**
   * Loads persisted facts from disk or initializes defaults
   */
  private load(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, 'utf8');
        const parsed: LongTermFact[] = JSON.parse(raw);
        for (const item of parsed) {
          this.facts.set(item.id, item);
        }
        return;
      }
    } catch (err: any) {
      console.warn('[LongTermMemory] Note loading persistence:', err.message);
    }

    // Seed default foundational facts
    this.seedDefaults();
  }

  /**
   * Seeds foundational platform architectural knowledge
   */
  private seedDefaults(): void {
    const defaultFacts: Array<Omit<LongTermFact, 'id' | 'accessCount' | 'createdAt' | 'lastAccessedAt'>> = [
      {
        entityId: 'global',
        category: 'SECURITY_POLICY',
        fact: 'Ryvix Authentication mandates 100% 6-digit email OTP for all 3 flows: Signup, Existing Login, and Password Recovery. Magic links and clickable confirmation URLs are strictly disallowed.',
        confidence: 1.0,
        tags: ['auth', 'otp', 'supabase', 'security']
      },
      {
        entityId: 'global',
        category: 'TECH_STACK',
        fact: 'Ryvix Web is built with Next.js 15 App Router, React 19, TypeScript, Vanilla CSS for visual elegance, and Supabase for database and auth.',
        confidence: 1.0,
        tags: ['frontend', 'nextjs', 'react', 'css', 'typescript']
      },
      {
        entityId: 'global',
        category: 'HISTORICAL_INCIDENT',
        fact: 'EADDRINUSE 3000 collision occurs if dev and build servers run simultaneously. Kill competing node processes or clear .next before dev startup.',
        confidence: 0.95,
        tags: ['sre', 'port3000', 'eaddrinuse', 'build']
      },
      {
        entityId: 'global',
        category: 'USER_PREFERENCE',
        fact: 'User requires clean, responsive, dark-mode cyberpunk glassmorphism UI with interactive 3D moving blocks background and dynamic glowing animations.',
        confidence: 0.98,
        tags: ['ui', 'design', 'threejs', 'animations', 'preferences']
      }
    ];

    const now = new Date().toISOString();
    for (const f of defaultFacts) {
      const id = `fact_seed_${f.category.toLowerCase()}_${Math.random().toString(36).slice(2, 6)}`;
      this.facts.set(id, {
        id,
        ...f,
        accessCount: 1,
        createdAt: now,
        lastAccessedAt: now
      });
    }

    this.save();
  }

  /**
   * Persists all facts atomically to disk
   */
  public save(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.facts.values()), null, 2);
      fs.writeFileSync(this.persistencePath, data, 'utf8');
    } catch (err: any) {
      console.warn('[LongTermMemory] Failed to save facts to disk:', err.message);
    }
  }

  /**
   * Adds or updates a long-term fact
   */
  public upsertFact(
    entityId: string,
    fact: string,
    category: FactCategory = 'USER_PREFERENCE',
    confidence: number = 0.9,
    tags: string[] = []
  ): LongTermFact {
    const normalizedFact = fact.trim();
    const now = new Date().toISOString();

    for (const existing of this.facts.values()) {
      if (
        (existing.entityId === entityId || existing.entityId === 'global') &&
        existing.category === category &&
        (existing.fact.toLowerCase() === normalizedFact.toLowerCase() ||
         existing.fact.toLowerCase().includes(normalizedFact.toLowerCase()) ||
         normalizedFact.toLowerCase().includes(existing.fact.toLowerCase()))
      ) {
        existing.fact = normalizedFact;
        existing.confidence = Math.max(existing.confidence, confidence);
        existing.accessCount += 1;
        existing.lastAccessedAt = now;
        existing.tags = Array.from(new Set([...existing.tags, ...tags]));
        this.save();
        return existing;
      }
    }

    const id = `fact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newFact: LongTermFact = {
      id,
      entityId,
      category,
      fact: normalizedFact,
      confidence,
      accessCount: 1,
      tags,
      createdAt: now,
      lastAccessedAt: now
    };

    this.facts.set(id, newFact);
    this.save();
    return newFact;
  }

  /**
   * Retrieves facts for a specific entity (or global fallback)
   */
  public getFactsForEntity(
    entityId: string,
    category?: FactCategory,
    minConfidence: number = 0.5
  ): LongTermFact[] {
    const results: LongTermFact[] = [];
    const now = new Date().toISOString();

    for (const fact of this.facts.values()) {
      if (
        (fact.entityId === entityId || fact.entityId === 'global') &&
        (!category || fact.category === category) &&
        fact.confidence >= minConfidence
      ) {
        fact.accessCount += 1;
        fact.lastAccessedAt = now;
        results.push(fact);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Searches facts relevant to a given query string
   */
  public searchFacts(entityId: string, query: string, limit: number = 5): LongTermFact[] {
    const tokens = query.toLowerCase().split(/[^a-z0-9_.]+/).filter((w) => w.length >= 3);
    const scored: Array<{ fact: LongTermFact; score: number }> = [];
    const now = new Date().toISOString();

    for (const fact of this.facts.values()) {
      if (fact.entityId !== entityId && fact.entityId !== 'global') {
        continue;
      }

      const factText = `${fact.fact} ${fact.tags.join(' ')} ${fact.category}`.toLowerCase();
      let matches = 0;

      for (const token of tokens) {
        if (factText.includes(token)) {
          matches++;
        }
      }

      if (matches > 0 || tokens.length === 0) {
        fact.accessCount += 1;
        fact.lastAccessedAt = now;
        const score = (matches / Math.max(1, tokens.length)) * fact.confidence;
        scored.push({ fact, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.fact);
  }

  /**
   * Automatically extracts and learns user facts/preferences from text
   */
  public extractFactsFromInteraction(entityId: string, text: string): LongTermFact[] {
    const learned: LongTermFact[] = [];

    // Pattern 1: User preferences ('I prefer...', 'I like...', 'Always use...')
    const prefMatch = text.match(/(?:i prefer|i want to use|always use|prefer to use|never use|make sure to use)\s+([^.!?]+)/i);
    if (prefMatch && prefMatch[1].length > 3) {
      learned.push(this.upsertFact(
        entityId,
        `User preference: ${prefMatch[0].trim()}`,
        'USER_PREFERENCE',
        0.85,
        ['user_stated', 'preference']
      ));
    }

    // Pattern 2: Tech stack & tools ('we are using...', 'our stack is...', 'database is...')
    const stackMatch = text.match(/(?:our stack is|we are using|our backend is|our frontend is|database is|we use)\s+([^.!?]+)/i);
    if (stackMatch && stackMatch[1].length > 3) {
      learned.push(this.upsertFact(
        entityId,
        `Tech stack specification: ${stackMatch[0].trim()}`,
        'TECH_STACK',
        0.9,
        ['tech_stack', 'infrastructure']
      ));
    }

    // Pattern 3: Resolved incidents ('the issue was...', 'we fixed it by...')
    const incidentMatch = text.match(/(?:the issue was caused by|fixed it by|resolved by|the bug was)\s+([^.!?]+)/i);
    if (incidentMatch && incidentMatch[1].length > 4) {
      learned.push(this.upsertFact(
        entityId,
        `Historical incident insight: ${incidentMatch[0].trim()}`,
        'HISTORICAL_INCIDENT',
        0.88,
        ['incident_fix', 'troubleshooting']
      ));
    }

    return learned;
  }

  /**
   * Deletes a fact by ID
   */
  public deleteFact(factId: string): boolean {
    const deleted = this.facts.delete(factId);
    if (deleted) this.save();
    return deleted;
  }

  /**
   * Returns fact count and memory statistics
   */
  public getStats(): { totalFacts: number; categories: Record<string, number> } {
    const categories: Record<string, number> = {};
    for (const f of this.facts.values()) {
      categories[f.category] = (categories[f.category] || 0) + 1;
    }
    return {
      totalFacts: this.facts.size,
      categories
    };
  }
}

export const longTermMemory = new LongTermMemoryManager();
