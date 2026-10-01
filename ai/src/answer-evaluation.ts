export interface AnswerCase {
  id: string;
  question: string;
  history?: Array<{ role:'user'|'assistant'; content:string }>;
  evidence: unknown;
  required: string[];
  forbidden: string[];
}
/** Explicit rubric checks, not a substitute for human assessment of correctness. */
export function scoreAnswer(fixture: AnswerCase, answer: string) {
  const missing = fixture.required.filter(pattern => !new RegExp(pattern,'i').test(answer));
  const violations = fixture.forbidden.filter(pattern => new RegExp(pattern,'i').test(answer));
  return { id:fixture.id, passed:!!answer.trim() && !missing.length && !violations.length,
    missing, violations, humanReviewRequired:true };
}
