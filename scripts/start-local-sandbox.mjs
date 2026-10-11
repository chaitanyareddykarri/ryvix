import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(command, args = [], options = {}) {
  try {
    return execSync(`${command} ${args.join(' ')}`, { stdio: 'pipe', encoding: 'utf8', ...options }).trim();
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Ryvix Local Sandbox Engine - Pre-Flight Check');
  console.log('====================================================\n');

  // 1. Check Docker Daemon
  console.log('1. Checking local Docker Desktop daemon...');
  const dockerInfo = run('docker', ['info', '--format', '{{.OSType}}']);
  if (!dockerInfo || dockerInfo !== 'linux') {
    console.error('❌ ERROR: Docker Desktop is not running or not in Linux container mode!');
    console.error('👉 Please open Docker Desktop on your Windows laptop, wait until the icon turns green, and run this again.\n');
    process.exit(1);
  }
  console.log('   ✅ Docker Desktop is active and running in Linux container mode.\n');

  // 2. Check/Build Required Sandbox Images
  console.log('2. Verifying required sandbox container images...');
  const images = [
    {
      name: 'ryvix-micro-static:local',
      dockerfile: 'infrastructure/workspaces/Dockerfile.static',
      context: 'infrastructure/workspaces',
      desc: 'Static snapshot runner'
    },
    {
      name: 'ryvix-workspace-node:local',
      dockerfile: 'infrastructure/workspaces/Dockerfile.node',
      context: 'infrastructure/workspaces',
      desc: 'Node.js/Next.js coding workspace'
    },
    {
      name: 'ryvix-workspace-egress:local',
      dockerfile: 'infrastructure/workspaces/Dockerfile.egress',
      context: 'infrastructure/workspaces',
      desc: 'Restricted network egress proxy'
    }
  ];

  for (const img of images) {
    const inspect = run('docker', ['image', 'inspect', img.name, '--format', '{{.Id}}']);
    if (inspect) {
      console.log(`   ✅ Image found: ${img.name} (${img.desc})`);
    } else {
      console.log(`   ⏳ Image missing: ${img.name}. Building now...`);
      try {
        execSync(`docker build -f ${img.dockerfile} -t ${img.name} ${img.context}`, { stdio: 'inherit' });
        console.log(`   ✅ Successfully built: ${img.name}`);
      } catch (buildErr) {
        console.error(`   ❌ Failed to build ${img.name}:`, buildErr);
        process.exit(1);
      }
    }
  }

  // 3. Verify .env.workspace.local
  console.log('\n3. Checking .env.workspace.local configuration...');
  const envPath = resolve(process.cwd(), '.env.workspace.local');
  if (!existsSync(envPath)) {
    console.error('❌ ERROR: .env.workspace.local not found at project root!');
    process.exit(1);
  }

  const envContent = readFileSync(envPath, 'utf8');
  if (!envContent.includes('DATABASE_URL=') || envContent.includes('DATABASE_URL=\n')) {
    console.error('❌ ERROR: DATABASE_URL is missing in .env.workspace.local!');
    process.exit(1);
  }
  console.log('   ✅ .env.workspace.local is configured with database and model keys.\n');

  // 4. Launch Worker Process
  console.log('====================================================');
  console.log('🎯 Starting Ryvix Workspace Worker...');
  console.log('📡 Listening for prompts from Telegram (@RyvixAiBot) and Web...');
  console.log('💡 Press Ctrl+C at any time to stop.');
  console.log('====================================================\n');

  const child = spawn(
    process.execPath,
    ['--env-file=.env.workspace.local', '--import', 'tsx', 'scripts/workspace-worker.ts'],
    { stdio: 'inherit', env: process.env }
  );

  child.on('exit', code => {
    if (code !== 0) {
      console.log(`\n⚠️ Worker process exited with code ${code}.`);
      console.log(`💡 Tip: If you see "Another worker already owns this Docker host", press Ctrl+C in your other running terminal running 'npm run worker:local' and re-run.\n`);
    }
  });
}

main().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
