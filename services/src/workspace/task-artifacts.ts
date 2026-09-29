export interface ChangedFile {
  filename: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff: string;
  additions: number;
  deletions: number;
}

/** Counts actual unified diff lines; file headers are not changed lines. */
export function measuredFileDiff(filename: string, diff: string, content: string | undefined, action: ChangedFile['action']): ChangedFile {
  if (!filename || filename.startsWith('/') || filename.includes('\\') || /[\x00-\x1f]/.test(filename) ||
      filename.split('/').some(p => !p || p === '.' || p === '..' || p.toLowerCase() === '.git')) {
    throw new Error('Invalid changed file path');
  }
  if (!diff.startsWith('diff --git ') || !diff.includes('\n@@ ')) throw new Error('A measured text diff is required');
  if (action !== 'delete' && typeof content !== 'string') throw new Error('Changed file content is required');
  let additions = 0, deletions = 0, inHunk = false;
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@ ')) { inHunk = true; continue; }
    if (!inHunk) continue;
    if (line.startsWith('+')) additions++;
    if (line.startsWith('-')) deletions++;
  }
  return { filename, action, ...(action === 'delete' ? {} : { content }), diff, additions, deletions };
}
