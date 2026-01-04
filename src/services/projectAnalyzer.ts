/**
 * Project Analyzer
 * Scans and analyzes project structure, languages, and frameworks
 */

import { existsSync } from 'fs';
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, dirname, basename, relative } from 'path';
import type { DirectoryEntry, FileInfo, KeyFile, ProjectType } from '../types/projectScan';

// Re-export types for use by other modules
export type { FileInfo };

/**
 * Map of file extensions to programming languages
 */
export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  // JavaScript/TypeScript
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',

  // Python
  '.py': 'Python',
  '.pyw': 'Python',
  '.pyi': 'Python',

  // Rust
  '.rs': 'Rust',

  // Go
  '.go': 'Go',

  // Java/Kotlin
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',

  // C/C++
  '.c': 'C',
  '.h': 'C',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hpp': 'C++',

  // C#
  '.cs': 'C#',

  // Ruby
  '.rb': 'Ruby',
  '.erb': 'Ruby',

  // PHP
  '.php': 'PHP',

  // Swift
  '.swift': 'Swift',

  // Shell
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',

  // SQL
  '.sql': 'SQL',

  // Scala
  '.scala': 'Scala',

  // Elixir
  '.ex': 'Elixir',
  '.exs': 'Elixir',

  // Haskell
  '.hs': 'Haskell',

  // Lua
  '.lua': 'Lua',

  // R
  '.r': 'R',
  '.R': 'R',

  // Dart
  '.dart': 'Dart',

  // Zig
  '.zig': 'Zig',

  // OCaml
  '.ml': 'OCaml',
  '.mli': 'OCaml',
};

/**
 * Framework detection indicators
 */
export const FRAMEWORK_INDICATORS: Record<
  string,
  { packages?: string[]; files?: string[]; devPackages?: string[] }
> = {
  React: { packages: ['react', 'react-dom'] },
  'Next.js': { packages: ['next'], files: ['next.config.js', 'next.config.mjs', 'next.config.ts'] },
  Vue: { packages: ['vue'], files: ['vue.config.js'] },
  Angular: { packages: ['@angular/core'], files: ['angular.json'] },
  Svelte: { packages: ['svelte'], files: ['svelte.config.js'] },
  'Node.js': { files: ['package.json'] },
  Express: { packages: ['express'] },
  Fastify: { packages: ['fastify'] },
  Koa: { packages: ['koa'] },
  NestJS: { packages: ['@nestjs/core'] },
  FastAPI: { files: ['requirements.txt'] }, // Detected by file content later
  Flask: { packages: ['flask'] },
  Django: { files: ['manage.py', 'settings.py'] },
  Rails: { files: ['Gemfile', 'config/routes.rb'] },
  Prisma: { packages: ['@prisma/client'], devPackages: ['prisma'] },
  TypeORM: { packages: ['typeorm'] },
  Sequelize: { packages: ['sequelize'] },
  Mongoose: { packages: ['mongoose'] },
  Ink: { packages: ['ink'] },
  Electron: { packages: ['electron'] },
  Vite: { devPackages: ['vite'], files: ['vite.config.ts', 'vite.config.js'] },
  Webpack: { devPackages: ['webpack'], files: ['webpack.config.js'] },
  Rollup: { devPackages: ['rollup'], files: ['rollup.config.js'] },
  Jest: { devPackages: ['jest'], files: ['jest.config.js'] },
  Vitest: { devPackages: ['vitest'], files: ['vitest.config.ts', 'vitest.config.js'] },
  Tailwind: { devPackages: ['tailwindcss'], files: ['tailwind.config.js', 'tailwind.config.ts'] },
};

/**
 * Detect the programming language from a file path
 */
export function detectLanguage(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();
  return LANGUAGE_EXTENSIONS[ext] || null;
}

/**
 * Detect primary languages from a list of files
 */
export function detectLanguages(files: FileInfo[]): string[] {
  const languageLines: Record<string, number> = {};

  for (const file of files) {
    const language = detectLanguage(file.path);
    if (language && file.lines) {
      languageLines[language] = (languageLines[language] || 0) + file.lines;
    }
  }

  // Sort by line count descending
  return Object.entries(languageLines)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

/**
 * Detect frameworks used in the project
 */
export function detectFrameworks(
  files: FileInfo[],
  packageJson?: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
): string[] {
  const frameworks: string[] = [];
  const fileNames = new Set(files.map(f => basename(f.path)));
  const filePaths = new Set(files.map(f => f.path));

  for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
    let detected = false;

    // Check packages
    if (packageJson?.dependencies && indicators.packages) {
      for (const pkg of indicators.packages) {
        if (packageJson.dependencies[pkg]) {
          detected = true;
          break;
        }
      }
    }

    // Check devPackages
    if (!detected && packageJson?.devDependencies && indicators.devPackages) {
      for (const pkg of indicators.devPackages) {
        if (packageJson.devDependencies[pkg]) {
          detected = true;
          break;
        }
      }
    }

    // Check files
    if (!detected && indicators.files) {
      for (const file of indicators.files) {
        if (fileNames.has(file) || filePaths.has(file)) {
          detected = true;
          break;
        }
      }
    }

    if (detected) {
      frameworks.push(framework);
    }
  }

  return frameworks;
}

/**
 * Infer the project type based on frameworks and file structure
 */
export function inferProjectType(frameworks: string[], files: FileInfo[]): ProjectType {
  // Check for CLI indicators
  if (frameworks.includes('Ink')) {
    return 'cli';
  }

  // Check for web app indicators
  if (
    frameworks.includes('React') ||
    frameworks.includes('Vue') ||
    frameworks.includes('Angular') ||
    frameworks.includes('Svelte') ||
    frameworks.includes('Next.js')
  ) {
    return 'web-app';
  }

  // Check for API server indicators
  if (
    frameworks.includes('Express') ||
    frameworks.includes('Fastify') ||
    frameworks.includes('NestJS') ||
    frameworks.includes('FastAPI') ||
    frameworks.includes('Flask') ||
    frameworks.includes('Django')
  ) {
    return 'api-server';
  }

  // Check for desktop app
  if (frameworks.includes('Electron')) {
    return 'desktop-app';
  }

  // Check for library indicators
  const hasLibSrc = files.some(
    f =>
      f.path.startsWith('lib/') || f.path.startsWith('src/') || f.path.startsWith('packages/')
  );
  const hasIndex = files.some(f => f.path === 'index.ts' || f.path === 'index.js');

  if (hasLibSrc && hasIndex) {
    return 'library';
  }

  // Check for documentation
  if (files.some(f => f.path.includes('docs/') && f.extension === '.md')) {
    return 'documentation';
  }

  return 'other';
}

/**
 * Identify key files in the project
 */
export function identifyKeyFiles(
  files: FileInfo[],
  packageJson?: { main?: string; bin?: Record<string, string> | string }
): KeyFile[] {
  const keyFiles: KeyFile[] = [];
  const filePaths = new Set(files.map(f => f.path));

  // Entry points from package.json
  if (packageJson?.main && filePaths.has(packageJson.main)) {
    keyFiles.push({
      path: packageJson.main,
      reason: 'Main entry point specified in package.json',
      category: 'entry-point',
    });
  }

  if (packageJson?.bin) {
    const binEntries =
      typeof packageJson.bin === 'string'
        ? { default: packageJson.bin }
        : packageJson.bin;

    for (const [, binPath] of Object.entries(binEntries)) {
      const normalizedPath = binPath.replace(/^\.\//, '');
      if (filePaths.has(normalizedPath)) {
        keyFiles.push({
          path: normalizedPath,
          reason: 'CLI entry point specified in package.json',
          category: 'entry-point',
        });
      }
    }
  }

  // Common entry points
  for (const file of files) {
    const name = basename(file.path);

    // Documentation
    if (name === 'README.md' || name === 'readme.md') {
      keyFiles.push({
        path: file.path,
        reason: 'Project documentation',
        category: 'documentation',
      });
    }

    if (name === 'CHANGELOG.md' || name === 'changelog.md') {
      keyFiles.push({
        path: file.path,
        reason: 'Change log',
        category: 'documentation',
      });
    }

    // Config files
    if (name === 'tsconfig.json') {
      keyFiles.push({
        path: file.path,
        reason: 'TypeScript configuration',
        category: 'config',
      });
    }

    if (name === 'package.json') {
      keyFiles.push({
        path: file.path,
        reason: 'Package configuration',
        category: 'config',
      });
    }

    if (name.includes('.eslintrc') || name === 'eslint.config.js') {
      keyFiles.push({
        path: file.path,
        reason: 'ESLint configuration',
        category: 'config',
      });
    }

    // Build config
    if (
      name === 'vite.config.ts' ||
      name === 'vite.config.js' ||
      name === 'webpack.config.js' ||
      name === 'rollup.config.js'
    ) {
      keyFiles.push({
        path: file.path,
        reason: 'Build configuration',
        category: 'build-config',
      });
    }

    // Test setup
    if (
      name === 'vitest.config.ts' ||
      name === 'vitest.config.js' ||
      name === 'jest.config.js' ||
      name === 'jest.config.ts'
    ) {
      keyFiles.push({
        path: file.path,
        reason: 'Test configuration',
        category: 'test-setup',
      });
    }

    // Schema files
    if (name === 'schema.prisma' || name.endsWith('.graphql') || name.endsWith('.gql')) {
      keyFiles.push({
        path: file.path,
        reason: 'Schema definition',
        category: 'schema',
      });
    }
  }

  return keyFiles;
}

/**
 * Analyze directory structure
 */
export function analyzeDirectoryStructure(files: FileInfo[]): DirectoryEntry[] {
  const directories: Map<string, { files: FileInfo[]; languages: Record<string, number> }> =
    new Map();

  for (const file of files) {
    const dir = dirname(file.path);
    const topDir = dir.split('/')[0] || '.';

    if (!directories.has(topDir)) {
      directories.set(topDir, { files: [], languages: {} });
    }

    const dirInfo = directories.get(topDir)!;
    dirInfo.files.push(file);

    const language = detectLanguage(file.path);
    if (language && file.lines) {
      dirInfo.languages[language] = (dirInfo.languages[language] || 0) + file.lines;
    }
  }

  const entries: DirectoryEntry[] = [];

  for (const [path, info] of directories) {
    // Skip root directory files
    if (path === '.') continue;

    // Determine primary language
    const primaryLanguage = Object.entries(info.languages)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Infer purpose
    let purpose = 'Project files';
    if (path === 'src' || path === 'lib') {
      purpose = 'Source code';
    } else if (path === 'tests' || path === 'test' || path === '__tests__') {
      purpose = 'Test files';
    } else if (path === 'docs' || path === 'documentation') {
      purpose = 'Documentation';
    } else if (path === 'bin' || path === 'scripts') {
      purpose = 'Scripts and executables';
    } else if (path === 'config') {
      purpose = 'Configuration files';
    } else if (path === 'utils' || path === 'helpers') {
      purpose = 'Utility functions';
    } else if (path === 'components') {
      purpose = 'UI components';
    } else if (path === 'services') {
      purpose = 'Service layer';
    } else if (path === 'models' || path === 'entities') {
      purpose = 'Data models';
    } else if (path === 'api' || path === 'routes') {
      purpose = 'API routes';
    } else if (path === 'hooks') {
      purpose = 'React hooks';
    } else if (path === 'types') {
      purpose = 'Type definitions';
    } else if (path === 'public' || path === 'static' || path === 'assets') {
      purpose = 'Static assets';
    }

    entries.push({
      path,
      purpose,
      fileCount: info.files.length,
      primaryLanguage,
    });
  }

  return entries.sort((a, b) => b.fileCount - a.fileCount);
}

/**
 * Detect entry points
 */
export function detectEntryPoints(
  files: FileInfo[],
  packageJson?: { main?: string; bin?: Record<string, string> | string; module?: string }
): string[] {
  const entryPoints: string[] = [];
  const filePaths = new Set(files.map(f => f.path));

  // From package.json
  if (packageJson?.main && filePaths.has(packageJson.main)) {
    entryPoints.push(packageJson.main);
  }

  if (packageJson?.module && filePaths.has(packageJson.module)) {
    entryPoints.push(packageJson.module);
  }

  if (packageJson?.bin) {
    const binEntries =
      typeof packageJson.bin === 'string'
        ? { default: packageJson.bin }
        : packageJson.bin;

    for (const [, binPath] of Object.entries(binEntries)) {
      const normalizedPath = binPath.replace(/^\.\//, '');
      if (filePaths.has(normalizedPath)) {
        entryPoints.push(normalizedPath);
      }
    }
  }

  // Common index files
  for (const file of files) {
    const name = basename(file.path);
    if (
      name === 'index.ts' ||
      name === 'index.js' ||
      name === 'main.ts' ||
      name === 'main.js' ||
      name === 'app.ts' ||
      name === 'app.js'
    ) {
      if (!entryPoints.includes(file.path)) {
        entryPoints.push(file.path);
      }
    }
  }

  return entryPoints;
}

/**
 * Scan files in a directory
 */
export async function scanFiles(
  projectPath: string,
  ignoreFilter: (relativePath: string) => boolean,
  maxFiles: number = 5000,
  maxFileSize: number = 100 * 1024 // 100KB
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];

  async function scan(dir: string): Promise<void> {
    if (files.length >= maxFiles) return;

    if (!existsSync(dir)) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= maxFiles) break;

        const fullPath = join(dir, entry.name);
        const relativePath = relative(projectPath, fullPath);

        // Skip ignored paths
        if (ignoreFilter(relativePath)) continue;

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          try {
            const stats = await stat(fullPath);
            const extension = extname(entry.name);
            const language = detectLanguage(entry.name);

            const fileInfo: FileInfo = {
              path: relativePath,
              name: entry.name,
              extension,
              size: stats.size,
              modifiedAt: stats.mtime,
              language: language || undefined,
            };

            // Count lines for text files that aren't too large
            if (stats.size < maxFileSize && isTextFile(extension)) {
              try {
                const content = await readFile(fullPath, 'utf-8');
                fileInfo.lines = content.split('\n').length;
              } catch {
                // Skip line counting if file can't be read as text
              }
            }

            files.push(fileInfo);
          } catch {
            // Skip files that can't be stat'd
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  await scan(projectPath);
  return files;
}

/**
 * Check if a file is a text file based on extension
 */
function isTextFile(extension: string): boolean {
  const textExtensions = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.json',
    '.md',
    '.txt',
    '.html',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.yaml',
    '.yml',
    '.xml',
    '.toml',
    '.ini',
    '.cfg',
    '.conf',
    '.env',
    '.sh',
    '.bash',
    '.zsh',
    '.py',
    '.rb',
    '.rs',
    '.go',
    '.java',
    '.kt',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.swift',
    '.php',
    '.sql',
    '.graphql',
    '.gql',
    '.prisma',
    '.vue',
    '.svelte',
    '.astro',
  ]);

  return textExtensions.has(extension.toLowerCase());
}
