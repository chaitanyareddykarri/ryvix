import fs from 'node:fs';
import { parseEnv } from 'node:util';

/** Local files supply defaults; deployment-injected values always win. */
export function loadRuntimeEnvironment(env = process.env, files = ['.env', '.env.local', 'web/.env.local']) {
  const defaults = {};
  for (const file of files) {
    if (fs.existsSync(file)) Object.assign(defaults, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  for (const [name, value] of Object.entries(defaults)) {
    if (env[name] === undefined) env[name] = value;
  }
}

export function hasCloudModelCredential(env = process.env) {
  return ['GROQ_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY',
    'GEMINI_API_KEY', 'HUGGINGFACE_API_KEY', 'HF_TOKEN'].some(name => !!env[name]?.trim());
}
