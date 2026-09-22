/**
 * Ryvix Self-Learning Knowledge Store
 * 
 * Persistent local memory that learns from every LLM escalation:
 * - Automatically loads from and persists to disk ('ai/data/learned_patterns.json').
 * - High-speed normalized token matching allows variations in IPs, timestamps, and PIDs
 *   to still match previously solved attacks with 0 LLM calls!
 * - Exports fine-tuning training datasets (JSONL format) for continuous model updates.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface LearnedPattern {
  fingerprint: string;
  patternSignature: string;
  threatType: string;
  diagnosis: string;
  remediationAction: string;
  capabilityToInvoke?: {
    action: string;
    params: Record<string, any>;
  };
  confidence: number;
  timesEncountered: number;
  firstLearnedAt: string;
  lastEncounteredAt: string;
}

export class SelfLearningStore {
  private memory = new Map<string, LearnedPattern>();
  private persistencePath: string;

  constructor(customPath?: string) {
    this.persistencePath = customPath || path.resolve(__dirname, '..', 'data', 'learned_patterns.json');
    this.load();
  }

  /**
   * Normalizes log snippets by stripping dynamic tokens (IPs, UUIDs, timestamps, PIDs)
   * to produce a stable generalized attack signature.
   */
  static normalizeSignature(raw: string): string {
    return raw
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<IP>')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
      .replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^ ]*/g, '<TIMESTAMP>')
      .replace(/pid\s*[:=]?\s*\d+/gi, 'pid:<PID>')
      .replace(/port\s*[:=]?\s*\d+/gi, 'port:<PORT>')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Generates a stable signature hash from normalized content.
   */
  static hashSignature(normalized: string): string {
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Looks up whether this anomaly pattern was previously learned.
   * Checks both exact fingerprint and normalized signature match.
   */
  lookup(fingerprint: string, rawLogSnippet?: string): LearnedPattern | null {
    // 1. Exact fingerprint lookup
    let found = this.memory.get(fingerprint);

    // 2. Normalized signature lookup if raw log snippet is provided
    if (!found && rawLogSnippet) {
      const normalized = SelfLearningStore.normalizeSignature(rawLogSnippet);
      const normHash = SelfLearningStore.hashSignature(normalized);
      found = this.memory.get(normHash);
      if (!found) {
        for (const pattern of this.memory.values()) {
          if (pattern.patternSignature && normalized.includes(SelfLearningStore.normalizeSignature(pattern.patternSignature))) {
            found = pattern;
            break;
          }
        }
      }
    }

    if (found) {
      found.timesEncountered++;
      found.lastEncounteredAt = new Date().toISOString();
      this.persist();
      return found;
    }

    return null;
  }

  /**
   * Commits a new LLM-generated diagnosis and fix into memory & disk.
   */
  learnPattern(
    fingerprint: string,
    data: {
      patternSignature: string;
      threatType: string;
      diagnosis: string;
      remediationAction: string;
      capabilityToInvoke?: {
        action: string;
        params: Record<string, any>;
      };
      confidence?: number;
    }
  ): LearnedPattern {
    const now = new Date().toISOString();
    const pattern: LearnedPattern = {
      fingerprint,
      patternSignature: data.patternSignature,
      threatType: data.threatType,
      diagnosis: data.diagnosis,
      remediationAction: data.remediationAction,
      capabilityToInvoke: data.capabilityToInvoke,
      confidence: data.confidence ?? 0.95,
      timesEncountered: 1,
      firstLearnedAt: now,
      lastEncounteredAt: now,
    };

    this.memory.set(fingerprint, pattern);

    // Also index normalized hash for generalization across IP/PID differences
    if (data.patternSignature) {
      const normHash = SelfLearningStore.hashSignature(
        SelfLearningStore.normalizeSignature(data.patternSignature)
      );
      if (normHash !== fingerprint) {
        this.memory.set(normHash, pattern);
      }
    }

    this.persist();
        // Also immediately append to continuous_fine_tuning.jsonl
    try {
      const fineTunePath = path.resolve(path.dirname(this.persistencePath), 'continuous_fine_tuning.jsonl');
      const entry = {
        prompt: `Analyze server anomaly pattern: ${pattern.patternSignature}`,
        completion: JSON.stringify({
          threatType: pattern.threatType,
          diagnosis: pattern.diagnosis,
          remediationAction: pattern.remediationAction,
          capability: pattern.capabilityToInvoke,
        }),
        timestamp: now,
      };
      fs.appendFileSync(fineTunePath, JSON.stringify(entry) + '\n', 'utf8');
    } catch {
      // Non-fatal
    }
    return pattern;
  }

  /**
   * Loads persisted patterns from JSON file.
   */
  load(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const raw = fs.readFileSync(this.persistencePath, 'utf8');
        const list: LearnedPattern[] = JSON.parse(raw);
        for (const p of list) {
          this.memory.set(p.fingerprint, p);
        }
      }
    } catch {
      // Non-fatal if file is missing
    }
  }

  /**
   * Persists memory to disk.
   */
  persist(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const uniquePatterns = Array.from(new Set(this.memory.values()));
      fs.writeFileSync(this.persistencePath, JSON.stringify(uniquePatterns, null, 2), 'utf8');
    } catch {
      // Non-fatal during test runs
    }
  }

  /**
   * Bulk train from a dataset of patterns.
   */
  trainFromDataset(patterns: LearnedPattern[]): number {
    let added = 0;
    for (const p of patterns) {
      this.memory.set(p.fingerprint, p);
      if (p.patternSignature) {
        const normHash = SelfLearningStore.hashSignature(
          SelfLearningStore.normalizeSignature(p.patternSignature)
        );
        this.memory.set(normHash, p);
      }
      added++;
    }
    this.persist();
    return added;
  }

  /**
   * Exports all learned patterns as a structured JSONL training dataset for local fine-tuning.
   */
  exportFineTuningDataset(): string {
    const lines: string[] = [];
    const unique = Array.from(new Set(this.memory.values()));
    for (const p of unique) {
      const entry = {
        prompt: `Analyze server anomaly pattern: ${p.patternSignature}`,
        completion: JSON.stringify({
          threatType: p.threatType,
          diagnosis: p.diagnosis,
          remediationAction: p.remediationAction,
          capability: p.capabilityToInvoke,
        }),
        metadata: {
          fingerprint: p.fingerprint,
          confidence: p.confidence,
          timesEncountered: p.timesEncountered,
        },
      };
      lines.push(JSON.stringify(entry));
    }
    return lines.join('\n');
  }

  getLearnedCount(): number {
    return Array.from(new Set(this.memory.values())).length;
  }

  clear() {
    this.memory.clear();
    try {
      if (fs.existsSync(this.persistencePath)) {
        fs.unlinkSync(this.persistencePath);
      }
    } catch {}
  }
}

export const selfLearningStore = new SelfLearningStore();
