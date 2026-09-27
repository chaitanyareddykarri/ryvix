/**
 * Ryvix Real-Time Repository Analyzer & Deployment Detector
 * 
 * Inspects repository file trees, manifests, and deployment workflows
 * to automatically determine technology stacks, package managers, 
 * CI/CD pipelines, and secret exposure risks.
 */

export interface DeploymentDetectionResult {
  detected: boolean;
  provider: 'GitHub Actions' | 'Vercel' | 'Docker' | 'Netlify' | 'AWS' | 'Cloudflare' | 'None';
  summary: string;
  workflowFile?: string;
  hasContinuousDeployment: boolean;
}

export interface SecretScanResult {
  hasPotentialSecrets: boolean;
  flaggedFiles: string[];
  warningMessage?: string;
}

export interface RepositoryAnalysisResult {
  stack: string;
  displayName: string;
  language: string;
  framework: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'poetry' | 'cargo' | 'go' | 'none';
  buildCommand: string;
  testCommand: string;
  devCommand: string;
  defaultPort: number;
  entryPoint?: string;
  deployment: DeploymentDetectionResult;
  security: SecretScanResult;
  filesCount: number;
}

export class RepositoryAnalyzer {
  /**
   * Analyzes an array of repository file paths and optional manifest contents.
   */
  static analyze(
    filePaths: string[],
    manifests: Record<string, string> = {}
  ): RepositoryAnalysisResult {
    const pathsLower = filePaths.map((p) => p.toLowerCase());
    const fileSet = new Set(pathsLower);

    // =========================================================================
    // 1. SECRET DETECTION (Security Guardrail)
    // =========================================================================
    const sensitivePatterns = [
      /^\.env$/,
      /^\.env\.production$/,
      /^\.env\.local$/,
      /^\.env\.staging$/,
      /id_rsa$/,
      /id_ed25519$/,
      /\.pem$/,
      /\.key$/,
      /service-account.*\.json$/,
      /credentials\.json$/,
    ];

    const flaggedFiles: string[] = [];
    for (const p of filePaths) {
      const filename = p.split('/').pop() || p;
      if (sensitivePatterns.some((pattern) => pattern.test(filename.toLowerCase()))) {
        flaggedFiles.push(filename);
      }
    }

    const security: SecretScanResult = {
      hasPotentialSecrets: flaggedFiles.length > 0,
      flaggedFiles,
      warningMessage:
        flaggedFiles.length > 0
          ? `Potential secret file(s) detected in source tree: ${flaggedFiles.join(', ')}. Ensure confidential credentials are added to .gitignore and removed from git history.`
          : undefined,
    };

    // =========================================================================
    // 2. DEPLOYMENT & CI/CD DETECTION
    // =========================================================================
    let deployment: DeploymentDetectionResult = {
      detected: false,
      provider: 'None',
      summary: 'No deployment system was detected.',
      hasContinuousDeployment: false,
    };

    // A. GitHub Actions Workflows
    const workflowFiles = filePaths.filter((p) =>
      p.toLowerCase().includes('.github/workflows/') && (p.endsWith('.yml') || p.endsWith('.yaml'))
    );

    if (workflowFiles.length > 0) {
      const primaryWorkflow = workflowFiles[0];
      const workflowName = primaryWorkflow.split('/').pop() || primaryWorkflow;
      deployment = {
        detected: true,
        provider: 'GitHub Actions',
        summary: `Automated CI/CD workflow (${workflowName}) detected in .github/workflows`,
        workflowFile: primaryWorkflow,
        hasContinuousDeployment: true,
      };
    } else if (filePaths.some((p) => p.toLowerCase() === 'vercel.json' || p.toLowerCase().endsWith('/vercel.json'))) {
      deployment = {
        detected: true,
        provider: 'Vercel',
        summary: 'Vercel edge deployment configuration (vercel.json) detected',
        workflowFile: 'vercel.json',
        hasContinuousDeployment: true,
      };
    } else if (filePaths.some((p) => p.toLowerCase() === 'netlify.toml' || p.toLowerCase().endsWith('/netlify.toml'))) {
      deployment = {
        detected: true,
        provider: 'Netlify',
        summary: 'Netlify edge deployment configuration (netlify.toml) detected',
        workflowFile: 'netlify.toml',
        hasContinuousDeployment: true,
      };
    } else if (filePaths.some((p) => p.toLowerCase().includes('dockerfile') || p.toLowerCase().includes('docker-compose'))) {
      const dockerFile = filePaths.find((p) => p.toLowerCase().includes('dockerfile')) || 'Dockerfile';
      deployment = {
        detected: true,
        provider: 'Docker',
        summary: `Containerized deployment configuration (${dockerFile}) detected`,
        workflowFile: dockerFile,
        hasContinuousDeployment: false,
      };
    } else if (filePaths.some((p) => p.toLowerCase() === 'wrangler.toml')) {
      deployment = {
        detected: true,
        provider: 'Cloudflare',
        summary: 'Cloudflare Pages / Workers configuration (wrangler.toml) detected',
        workflowFile: 'wrangler.toml',
        hasContinuousDeployment: true,
      };
    } else if (filePaths.some((p) => p.toLowerCase() === 'serverless.yml' || p.toLowerCase() === 'cdk.json')) {
      deployment = {
        detected: true,
        provider: 'AWS',
        summary: 'AWS Serverless / CDK deployment configuration detected',
        hasContinuousDeployment: true,
      };
    }

    // =========================================================================
    // 3. FRAMEWORK & TECHNOLOGY DETECTION
    // =========================================================================
    let packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'poetry' | 'cargo' | 'go' | 'none' = 'npm';
    if (filePaths.some((p) => p.includes('pnpm-lock.yaml'))) packageManager = 'pnpm';
    else if (filePaths.some((p) => p.includes('yarn.lock'))) packageManager = 'yarn';
    else if (filePaths.some((p) => p.includes('bun.lockb') || p.includes('bun.lock'))) packageManager = 'bun';
    else if (filePaths.some((p) => p.includes('poetry.lock'))) packageManager = 'poetry';
    else if (filePaths.some((p) => p.includes('requirements.txt') || p.includes('pyproject.toml'))) packageManager = 'pip';
    else if (filePaths.some((p) => p.includes('cargo.lock') || p.includes('cargo.toml'))) packageManager = 'cargo';
    else if (filePaths.some((p) => p.includes('go.mod'))) packageManager = 'go';

    // Parse package.json dependencies if available
    let allDeps: Record<string, string> = {};
    const pkgJsonRaw = manifests['package.json'] || manifests['PACKAGE.JSON'];
    if (pkgJsonRaw) {
      try {
        const parsed = JSON.parse(pkgJsonRaw);
        allDeps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
      } catch {
        // ignore parse error
      }
    }

    const hasDep = (dep: string) => Boolean(allDeps[dep]);

    // A. Next.js (App Router or Pages)
    if (
      hasDep('next') ||
      filePaths.some((p) => p.includes('next.config') || p.includes('app/page.') || p.includes('app/layout.'))
    ) {
      const isTypeScript = filePaths.some((p) => p.endsWith('.ts') || p.endsWith('.tsx') || p.includes('tsconfig'));
      const isAppRouter = filePaths.some((p) => p.includes('app/page.') || p.includes('app/layout.'));
      return {
        stack: 'nextjs',
        displayName: isAppRouter ? 'Next.js (App Router)' : 'Next.js',
        language: isTypeScript ? 'TypeScript' : 'JavaScript',
        framework: 'Next.js',
        packageManager,
        buildCommand: `${packageManager === 'npm' ? 'npm run' : packageManager} build`,
        testCommand: `${packageManager === 'npm' ? 'npm' : packageManager} test`,
        devCommand: `${packageManager === 'npm' ? 'npm run' : packageManager} dev`,
        defaultPort: 3000,
        entryPoint: filePaths.find((p) => p.includes('app/page.') || p.includes('pages/index.')) || 'app/page.tsx',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // B. React (Vite / CRA / Remix)
    if (
      hasDep('react') ||
      filePaths.some((p) => p.includes('vite.config') || p.includes('src/app.tsx') || p.includes('src/app.jsx'))
    ) {
      const isVite = hasDep('vite') || filePaths.some((p) => p.includes('vite.config'));
      const isTypeScript = filePaths.some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));
      return {
        stack: 'react',
        displayName: isVite ? 'React (Vite SPA)' : 'React Application',
        language: isTypeScript ? 'TypeScript' : 'JavaScript',
        framework: isVite ? 'Vite + React' : 'React',
        packageManager,
        buildCommand: `${packageManager === 'npm' ? 'npm run' : packageManager} build`,
        testCommand: `${packageManager === 'npm' ? 'npm' : packageManager} test`,
        devCommand: `${packageManager === 'npm' ? 'npm run' : packageManager} dev`,
        defaultPort: isVite ? 5173 : 3000,
        entryPoint: filePaths.find((p) => p.includes('src/main.') || p.includes('src/index.') || p.includes('src/app.')) || 'src/App.tsx',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // C. Vue / Nuxt
    if (hasDep('vue') || hasDep('nuxt') || filePaths.some((p) => p.includes('nuxt.config') || p.endsWith('.vue'))) {
      const isNuxt = hasDep('nuxt') || filePaths.some((p) => p.includes('nuxt.config'));
      return {
        stack: isNuxt ? 'nuxt' : 'vue',
        displayName: isNuxt ? 'Nuxt.js Fullstack' : 'Vue.js Application',
        language: filePaths.some((p) => p.endsWith('.ts')) ? 'TypeScript' : 'JavaScript',
        framework: isNuxt ? 'Nuxt' : 'Vue',
        packageManager,
        buildCommand: `${packageManager === 'npm' ? 'npm run' : packageManager} build`,
        testCommand: `${packageManager === 'npm' ? 'npm' : packageManager} test`,
        devCommand: `${packageManager === 'npm' ? 'npm run' : packageManager} dev`,
        defaultPort: isNuxt ? 3000 : 5173,
        entryPoint: filePaths.find((p) => p.includes('app.vue') || p.includes('src/main.')) || 'app.vue',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // D. Python (FastAPI / Django / Flask)
    if (filePaths.some((p) => p.includes('pyproject.toml') || p.includes('requirements.txt') || p.endsWith('.py'))) {
      const isFastAPI = filePaths.some((p) => p.includes('main.py') || p.includes('fastapi'));
      const isDjango = filePaths.some((p) => p.includes('manage.py') || p.includes('wsgi.py'));
      const isFlask = filePaths.some((p) => p.includes('app.py') || p.includes('wsgi.py'));
      const framework = isFastAPI ? 'FastAPI' : isDjango ? 'Django' : isFlask ? 'Flask' : 'Python';
      return {
        stack: isFastAPI ? 'python_fastapi' : 'python',
        displayName: `${framework} Web Application`,
        language: 'Python',
        framework,
        packageManager: packageManager === 'poetry' ? 'poetry' : 'pip',
        buildCommand: 'python -m compileall .',
        testCommand: 'pytest',
        devCommand: isFastAPI ? 'uvicorn main:app --reload --port 8000' : isDjango ? 'python manage.py runserver' : 'python app.py',
        defaultPort: 8000,
        entryPoint: filePaths.find((p) => p.endsWith('main.py') || p.endsWith('app.py') || p.endsWith('manage.py')) || 'main.py',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // E. Go (Gin / Standard)
    if (filePaths.some((p) => p.includes('go.mod') || p.endsWith('.go'))) {
      return {
        stack: 'golang',
        displayName: 'Go Web Service',
        language: 'Go',
        framework: 'Go',
        packageManager: 'go',
        buildCommand: 'go build -o /tmp/app ./...',
        testCommand: 'go test -v ./...',
        devCommand: 'go run .',
        defaultPort: 8080,
        entryPoint: filePaths.find((p) => p.endsWith('main.go')) || 'main.go',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // F. Rust (Axum / Actix / Cargo)
    if (filePaths.some((p) => p.includes('cargo.toml') || p.endsWith('.rs'))) {
      return {
        stack: 'rust',
        displayName: 'Rust Application',
        language: 'Rust',
        framework: 'Rust',
        packageManager: 'cargo',
        buildCommand: 'cargo build --release',
        testCommand: 'cargo test',
        devCommand: 'cargo run',
        defaultPort: 8080,
        entryPoint: filePaths.find((p) => p.endsWith('main.rs') || p.endsWith('lib.rs')) || 'src/main.rs',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // G. Node.js Generic
    if (filePaths.some((p) => p.includes('package.json'))) {
      const isTypeScript = filePaths.some((p) => p.endsWith('.ts'));
      return {
        stack: 'nodejs',
        displayName: 'Node.js Backend Service',
        language: isTypeScript ? 'TypeScript' : 'JavaScript',
        framework: hasDep('express') ? 'Express' : hasDep('@nestjs/core') ? 'NestJS' : 'Node.js',
        packageManager,
        buildCommand: `${packageManager === 'npm' ? 'npm run' : packageManager} build`,
        testCommand: `${packageManager === 'npm' ? 'npm' : packageManager} test`,
        devCommand: `${packageManager === 'npm' ? 'npm start' : packageManager} start`,
        defaultPort: 3000,
        entryPoint: filePaths.find((p) => p.includes('index.') || p.includes('server.') || p.includes('main.')) || 'index.js',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // H. HTML / Static Site
    if (filePaths.some((p) => p.endsWith('.html'))) {
      return {
        stack: 'static',
        displayName: 'Static Website (HTML/CSS/JS)',
        language: 'HTML / CSS / JavaScript',
        framework: 'Static',
        packageManager: 'none',
        buildCommand: 'echo "Static site: No build required"',
        testCommand: 'echo "No tests configured"',
        devCommand: 'npx serve .',
        defaultPort: 3000,
        entryPoint: filePaths.find((p) => p.endsWith('index.html')) || 'index.html',
        deployment,
        security,
        filesCount: filePaths.length,
      };
    }

    // Fallback
    return {
      stack: 'generic',
      displayName: 'Web Project',
      language: 'Standard',
      framework: 'Custom',
      packageManager: 'none',
      buildCommand: 'echo "Custom build"',
      testCommand: 'echo "Custom test"',
      devCommand: 'echo "Custom dev"',
      defaultPort: 8080,
      deployment,
      security,
      filesCount: filePaths.length,
    };
  }
}
