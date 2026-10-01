import 'server-only';
import { queryDirectDb } from './direct-db';
import { ContextBuilder } from '../../ai/src/context/context-builder';

export async function retrieveChatSources(organizationId: string, userId: string, question: string) {
  const stop = new Set(['what','which','this','that','with','from','about','please','explain','does','have','there','should','would','could']);
  const terms = [...new Set(question.toLowerCase().match(/[a-z0-9_-]{4,}/g) || [])].filter(term => !stop.has(term)).slice(-16);
  if (!terms.length) return [];
  const args = [organizationId,userId,terms];
  // Only stored task snapshots, never arbitrary files from the control-plane host.
  const [incidents, files] = await Promise.all([
    queryDirectDb(`SELECT i.id,i.title,i.ai_diagnosis,i.created_at FROM incidents i
      JOIN environments e ON e.id=i.environment_id JOIN projects p ON p.id=e.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      WHERE p.organization_id=$1 AND EXISTS (SELECT 1 FROM unnest($3::text[]) term
        WHERE strpos(lower(i.title || ' ' || COALESCE(i.ai_diagnosis,'')),term)>0)
      ORDER BY i.created_at DESC LIMIT 8`,args),
    queryDirectDb(`SELECT a.task_id,a.base_commit_sha,a.created_at,f.value->>'filename' AS filename,
        left(f.value->>'content',6000) AS content FROM task_artifacts a
      JOIN tasks t ON t.id=a.task_id JOIN projects p ON p.id=t.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=$2
      CROSS JOIN LATERAL jsonb_array_elements(a.files) f(value)
      WHERE p.organization_id=$1 AND f.value->>'action'<>'delete'
      AND EXISTS (SELECT 1 FROM unnest($3::text[]) term WHERE
        strpos(lower(COALESCE(f.value->>'filename','')),term)>0 OR
        strpos(lower(COALESCE(f.value->>'content','')),term)>0)
      ORDER BY a.created_at DESC LIMIT 8`,args),
  ]);
  const sources = [
    ...incidents.map(row => ({ id: `incident:${row.id}`, kind: 'recorded incident', date: row.created_at,
      title: row.title, excerpt: row.ai_diagnosis || row.title })),
    ...files.filter(row => !/(^|\/)(\.env|secrets?|credentials?)(\.|\/|$)|\.(pem|key)$/i.test(row.filename || '')).map(row => ({
      id: `task:${row.task_id}:${row.filename}`, kind: 'task file snapshot (not current branch)',
      date: row.created_at, title: row.filename, excerpt: row.content || '',
    })),
  ];
  let budget = 16000;
  return sources.map(source => {
    const excerpt = ContextBuilder.sanitizeText(source.excerpt).slice(0,Math.min(4000,budget));
    budget -= excerpt.length;
    return { ...source, title: ContextBuilder.sanitizeText(source.title), excerpt };
  }).filter(source => source.excerpt.length);
}
