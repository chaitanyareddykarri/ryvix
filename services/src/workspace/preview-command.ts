/** Select only a detected package script; the script itself executes in the sandbox. */
export function repositoryPreviewCommand(stack: string, packageManager: string, pkg: { scripts?: Record<string,string>; dependencies?: Record<string,string>; devDependencies?: Record<string,string> }): string | null {
  const script = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
  if (!script) return null;
  if (!['npm','pnpm','yarn'].includes(packageManager)) throw new Error('Unsupported preview package manager');
  const runner = `${packageManager} run ${script}`;
  const separator = packageManager === 'npm' ? ' --' : '';
  if (stack === 'nextjs') return `${runner}${separator} --hostname 0.0.0.0 --port 3000`;
  if (pkg.dependencies?.vite || pkg.devDependencies?.vite) return `${runner}${separator} --host 0.0.0.0 --port 3000`;
  return runner;
}
