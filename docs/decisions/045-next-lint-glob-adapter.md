# ADR 045: Remove the vulnerable development glob chain

The installed Next ESLint plugin 15.1.7 has exactly one fast-glob call site:
`getRootDirs` calls `globSync(pattern, {onlyDirectories:true})`. Its dependency
chain brings the unpatched braces recursion advisory into development tooling.

Override only that pinned plugin's fast-glob dependency with the local
`tools/next-root-glob` adapter. A root development file dependency makes the
resolution reproducible in npm's lockfile. The adapter uses pinned tinyglobby,
disables automatic literal-directory expansion, preserves absolute/relative path
behavior and removes trailing directory separators. Reject patterns over 4096
characters or nesting over 32 and reject unsupported options. It is not a general
replacement for fast-glob's complete API. Re-audit callers when upgrading Next.

Docker dependency stages copy the adapter before npm ci; production workers do
not require the development lint dependency. No application behavior or customer
workspace dependency override is changed. Root-directory compatibility tests,
lint, clean install, dependency-tree validation and full npm audit are required.
