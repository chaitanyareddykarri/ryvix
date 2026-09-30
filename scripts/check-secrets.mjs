import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const reviewedFixtures = JSON.parse(fs.readFileSync(new URL('./secret-scan-fixtures.json', import.meta.url), 'utf8'));

// Focused regression guard, not a replacement for provider secret scanning.
// Reports locations and rules only, never matched credential material.
export function scanText(file, text) {
  const findings = [];
  // Catch credential-guessing lists, including multiline arrays, without echoing values.
  for (const match of text.matchAll(/\b(?:const|let|var)\s+(?:passwords|passwordCandidates|candidatePasswords)\s*=\s*\[([^\]]*)\]/gi)) {
    if (/['"][^'"\r\n]+['"]/.test(match[1])) findings.push({
      file, line: text.slice(0, match.index).split('\n').length, rule: 'hardcoded-password-candidates',
    });
  }
  const fixture = /(^|\/)(tests|docs)\//.test(file) || file.endsWith('.md') || file === '.env.example';
  for (const [index, line] of text.split('\n').entries()) {
    // Exact, reviewed test lines only. Editing their content invalidates the exception.
    if (reviewedFixtures.some(entry => entry.file === file && entry.line === index + 1 &&
        entry.sha256 === createHash('sha256').update(line.trim()).digest('hex'))) continue;
    const report = rule => findings.push({ file, line: index + 1, rule });
    for (const match of line.matchAll(/postgres(?:ql)?:\/\/[^\s"'`<>]+/g)) {
      try {
        const url = new URL(match[0]);
        const password = decodeURIComponent(url.password);
        const examplePassword = /^(?:\[.*\]|your[-_].*|password|postgres|secret|test[-_].*|fake[-_].*|example)$/i.test(password);
        if (password && !password.includes('${') && !(fixture && examplePassword)) report('database-password-in-url');
      } catch { /* Incomplete templates are not connection credentials. */ }
    }
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) report('private-key');
    if (/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sb_secret_[A-Za-z0-9_-]{20,})\b/.test(line)) report('provider-secret');
    for (const token of line.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
      try {
        const payload = JSON.parse(Buffer.from(token[0].split('.')[1], 'base64url').toString());
        if (payload.role === 'service_role') report('supabase-service-role-jwt');
      } catch { /* Ignore incomplete JWT examples. */ }
    }
    if (/\bAUTH_CHALLENGE_SECRET\s*=\s*['"]?[a-f\d]{64}\b/i.test(line)) report('otp-encryption-key');
  }
  return findings;
}

export function scanRepository(root = process.cwd()) {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
  const findings = [];
  for (const file of new Set(tracked.split('\0').filter(Boolean))) {
    if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('/.env.example') && file !== '.env.example') {
      findings.push({ file, line: 1, rule: 'tracked-environment-file' });
    }
    const target = path.join(root, file);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) continue;
    const content = fs.readFileSync(target);
    if (!content.includes(0)) findings.push(...scanText(file, content.toString('utf8')));
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const findings = scanRepository();
    for (const finding of findings) console.error(`${finding.file}:${finding.line}: ${finding.rule}`);
    console.log(`Secret regression scan: ${findings.length} finding(s). Matched values are suppressed.`);
    process.exitCode = findings.length ? 1 : 0;
  } catch {
    console.error('Secret regression scan could not complete. No credentials were printed.');
    process.exitCode = 1;
  }
}
