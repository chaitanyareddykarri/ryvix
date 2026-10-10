/** Explicit small-host mode: no package managers, repository scripts or builds. */
export function staticWorkspaceMode(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.RYVIX_WORKSPACE_MODE || 'standard';
  if (!['standard', 'static'].includes(mode)) throw new Error('Invalid workspace mode');
  return mode === 'static';
}
export const STATIC_MEMORY_MB = 192;
export const STATIC_CPU = 0.25;
export const STATIC_CHECK = 'node /opt/ryvix/static-site.cjs check';
export const STATIC_PREVIEW = 'node /opt/ryvix/static-site.cjs serve';
export function staticPath(path: string) {
  return typeof path === 'string' && path.length <= 180 && path.split('/').length <= 13 &&
    path.split('/').every(part => /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(part)) &&
    (/\.(html|css|js|txt|md)$/i.test(path) || path === 'LICENSE');
}
export function validateStaticTree(entries: Array<{path:string;type:string;mode:string;size?:number}>) {
  const files = entries.filter(entry => entry.type !== 'tree');
  if (!files.length || files.length > 64 || !files.some(file => file.path === 'index.html'))
    throw new Error('Static mode requires index.html and at most 64 text files');
  let bytes = 0;
  for (const file of files) {
    if (file.type !== 'blob' || file.mode !== '100644' || !staticPath(file.path) ||
        !Number.isInteger(file.size) || file.size! < 0 || file.size! > 32768)
      throw new Error('Static mode accepts only small regular HTML, CSS, JS and documentation files; no dependencies or scripts');
    bytes += file.size!;
  }
  if (bytes > 262144) throw new Error('Static repository exceeds 256 KiB');
}
export function validateStaticChanges(changes: Array<{path:string;action:string;content?:string}>) {
  for (const change of changes) {
    if (!staticPath(change.path) || (change.path === 'index.html' && change.action === 'delete') ||
        (change.action !== 'delete' && (typeof change.content !== 'string' || Buffer.byteLength(change.content) > 32768 || change.content.includes('\0'))))
      throw new Error('Change exceeds the static-only workspace boundary');
  }
}
