/**
 * Dependency Analyzer
 * Parses and analyzes project dependencies from various package managers
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { FileInfo } from './projectAnalyzer';

/**
 * Parsed dependency information
 */
export interface ParsedDependency {
  name: string;
  version?: string;
  purpose?: string;
}

/**
 * Dependency categories
 */
export interface DependencyCategories {
  runtime: ParsedDependency[];
  development: ParsedDependency[];
  peer: ParsedDependency[];
}

/**
 * Complete dependency analysis result
 */
export interface DependencyInfo {
  packageManager: string | null;
  runtime: ParsedDependency[];
  development: ParsedDependency[];
  peer: ParsedDependency[];
  totalCount: number;
}

/**
 * Common package purposes for auto-inference
 */
export const COMMON_DEPENDENCY_PURPOSES: Record<string, string> = {
  // React ecosystem
  'react': 'UI library',
  'react-dom': 'React DOM renderer',
  'next': 'React framework with SSR',
  'gatsby': 'React static site generator',
  '@tanstack/react-query': 'Data fetching and caching',

  // Vue ecosystem
  'vue': 'UI library',
  'nuxt': 'Vue framework with SSR',
  'vuex': 'State management',
  'pinia': 'State management',

  // Angular
  '@angular/core': 'UI framework',
  '@angular/cli': 'Angular CLI',

  // Backend frameworks
  'express': 'HTTP server framework',
  'fastify': 'HTTP server framework',
  'koa': 'HTTP server framework',
  'hapi': 'HTTP server framework',
  'nestjs': 'Enterprise Node.js framework',
  '@nestjs/core': 'Enterprise Node.js framework',

  // Python frameworks
  'flask': 'HTTP server framework',
  'django': 'Full-stack web framework',
  'fastapi': 'Async HTTP framework',
  'starlette': 'ASGI framework',

  // Database
  'mongoose': 'MongoDB ODM',
  'prisma': 'Database ORM',
  '@prisma/client': 'Database ORM client',
  'typeorm': 'Database ORM',
  'sequelize': 'Database ORM',
  'knex': 'SQL query builder',
  'drizzle-orm': 'TypeScript ORM',

  // Testing
  'vitest': 'Unit testing framework',
  'jest': 'Unit testing framework',
  'mocha': 'Testing framework',
  'chai': 'Assertion library',
  'pytest': 'Python testing framework',
  'cypress': 'E2E testing framework',
  'playwright': 'E2E testing framework',
  '@testing-library/react': 'React testing utilities',

  // Build tools
  'webpack': 'Module bundler',
  'vite': 'Development server and bundler',
  'esbuild': 'Fast JavaScript bundler',
  'rollup': 'ES module bundler',
  'parcel': 'Zero-config bundler',
  'tsup': 'TypeScript bundler',

  // Linting & Formatting
  'eslint': 'JavaScript linting',
  'prettier': 'Code formatting',
  'stylelint': 'CSS linting',
  'biome': 'Linting and formatting',

  // TypeScript
  'typescript': 'TypeScript compiler',
  'ts-node': 'TypeScript execution',
  'tsx': 'TypeScript execution',

  // CLI & UI
  'ink': 'React for CLIs',
  'chalk': 'Terminal string styling',
  'commander': 'CLI argument parsing',
  'yargs': 'CLI argument parsing',
  'inquirer': 'Interactive prompts',

  // State management
  'redux': 'State management',
  '@reduxjs/toolkit': 'Redux utilities',
  'zustand': 'State management',
  'jotai': 'Atomic state management',
  'recoil': 'State management',
  'mobx': 'State management',

  // HTTP & API
  'axios': 'HTTP client',
  'node-fetch': 'HTTP client',
  'got': 'HTTP client',
  'graphql': 'GraphQL runtime',
  '@apollo/client': 'GraphQL client',
  'trpc': 'End-to-end typesafe APIs',

  // Validation
  'zod': 'Schema validation',
  'yup': 'Schema validation',
  'joi': 'Schema validation',
  'ajv': 'JSON Schema validation',

  // Authentication
  'passport': 'Authentication middleware',
  'jsonwebtoken': 'JWT utilities',
  'next-auth': 'Authentication for Next.js',
  'lucia': 'Authentication library',

  // Utilities
  'lodash': 'Utility functions',
  'date-fns': 'Date utilities',
  'dayjs': 'Date utilities',
  'uuid': 'UUID generation',
  'nanoid': 'ID generation',

  // AI/ML
  'openai': 'OpenAI API client',
  '@anthropic-ai/sdk': 'Anthropic API client',
  'ai': 'Vercel AI SDK',
  'langchain': 'LLM framework',

  // Rust ecosystem
  'serde': 'Serialization framework',
  'tokio': 'Async runtime',
  'actix-web': 'Web framework',
  'axum': 'Web framework',
  'clap': 'CLI argument parsing',

  // Go ecosystem
  'github.com/gin-gonic/gin': 'HTTP web framework',
  'github.com/gorilla/mux': 'HTTP router',
  'github.com/stretchr/testify': 'Testing toolkit',
};

/**
 * Lock file to package manager mapping
 */
const LOCK_FILE_MANAGERS: Record<string, string> = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
  'poetry.lock': 'poetry',
  'Cargo.lock': 'cargo',
  'go.sum': 'go',
  'Gemfile.lock': 'bundler',
};

/**
 * Detect the package manager used by the project
 */
export function detectPackageManager(files: FileInfo[]): string | null {
  const fileNames = new Set(files.map(f => f.name));

  // Check for lock files first (most specific)
  for (const [lockFile, manager] of Object.entries(LOCK_FILE_MANAGERS)) {
    if (fileNames.has(lockFile)) {
      return manager;
    }
  }

  // Check for manifest files
  if (fileNames.has('requirements.txt')) return 'pip';
  if (fileNames.has('pyproject.toml')) return 'pip'; // Default to pip for pyproject
  if (fileNames.has('Cargo.toml')) return 'cargo';
  if (fileNames.has('go.mod')) return 'go';
  if (fileNames.has('Gemfile')) return 'bundler';
  if (fileNames.has('composer.json')) return 'composer';
  if (fileNames.has('Package.swift')) return 'swift';

  return null;
}

/**
 * Parse package.json dependencies
 */
export function parsePackageJson(packageJson: Record<string, unknown>): DependencyCategories {
  const result: DependencyCategories = {
    runtime: [],
    development: [],
    peer: [],
  };

  const dependencies = packageJson.dependencies as Record<string, string> | undefined;
  const devDependencies = packageJson.devDependencies as Record<string, string> | undefined;
  const peerDependencies = packageJson.peerDependencies as Record<string, string> | undefined;

  if (dependencies) {
    for (const [name, version] of Object.entries(dependencies)) {
      result.runtime.push({
        name,
        version,
        purpose: inferDependencyPurpose(name) ?? undefined,
      });
    }
  }

  if (devDependencies) {
    for (const [name, version] of Object.entries(devDependencies)) {
      result.development.push({
        name,
        version,
        purpose: inferDependencyPurpose(name) ?? undefined,
      });
    }
  }

  if (peerDependencies) {
    for (const [name, version] of Object.entries(peerDependencies)) {
      result.peer.push({
        name,
        version,
        purpose: inferDependencyPurpose(name) ?? undefined,
      });
    }
  }

  return result;
}

/**
 * Parse requirements.txt format
 */
export function parseRequirementsTxt(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip empty lines, comments, and special flags
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) {
      continue;
    }

    // Parse package name and version
    // Handle formats: package==1.0.0, package>=1.0.0, package[extra]>=1.0.0
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[.*?\])?(.*)?$/);
    if (match) {
      const name = match[1];
      const versionPart = match[2]?.trim();

      deps.push({
        name,
        version: versionPart || undefined,
        purpose: inferDependencyPurpose(name) ?? undefined,
      });
    }
  }

  return deps;
}

/**
 * Parse pyproject.toml dependencies
 */
export function parsePyProjectToml(content: string): DependencyCategories {
  const result: DependencyCategories = {
    runtime: [],
    development: [],
    peer: [],
  };

  if (!content.trim()) {
    return result;
  }

  // Parse Poetry format: [tool.poetry.dependencies]
  const poetryDepsMatch = content.match(
    /\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/
  );
  if (poetryDepsMatch) {
    const depsSection = poetryDepsMatch[1];
    for (const line of depsSection.split('\n')) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']?([^"'\s]+)/);
      if (match && match[1] !== 'python') {
        result.runtime.push({
          name: match[1],
          version: match[2],
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
      }
    }
  }

  // Parse Poetry dev-dependencies
  const poetryDevDepsMatch = content.match(
    /\[tool\.poetry\.dev-dependencies\]([\s\S]*?)(?=\[|$)/
  );
  if (poetryDevDepsMatch) {
    const depsSection = poetryDevDepsMatch[1];
    for (const line of depsSection.split('\n')) {
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']?([^"'\s]+)/);
      if (match) {
        result.development.push({
          name: match[1],
          version: match[2],
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
      }
    }
  }

  // Parse PEP 621 format: [project] dependencies
  const pep621DepsMatch = content.match(
    /\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/
  );
  if (pep621DepsMatch) {
    const depsArray = pep621DepsMatch[1];
    for (const line of depsArray.split('\n')) {
      const match = line.match(/["']([a-zA-Z0-9_-]+)([><=!~]+[^"']+)?["']/);
      if (match) {
        result.runtime.push({
          name: match[1],
          version: match[2] || undefined,
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
      }
    }
  }

  // Parse PEP 621 optional-dependencies.dev
  const pep621DevDepsMatch = content.match(
    /\[project\.optional-dependencies\][\s\S]*?dev\s*=\s*\[([\s\S]*?)\]/
  );
  if (pep621DevDepsMatch) {
    const depsArray = pep621DevDepsMatch[1];
    for (const line of depsArray.split('\n')) {
      const match = line.match(/["']([a-zA-Z0-9_-]+)([><=!~]+[^"']+)?["']/);
      if (match) {
        result.development.push({
          name: match[1],
          version: match[2] || undefined,
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
      }
    }
  }

  return result;
}

/**
 * Parse go.mod dependencies
 */
export function parseGoMod(content: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];

  // Parse require block
  const requireBlockMatch = content.match(/require\s*\(([\s\S]*?)\)/);
  if (requireBlockMatch) {
    for (const line of requireBlockMatch[1].split('\n')) {
      const trimmed = line.trim();
      // Skip indirect dependencies
      if (trimmed.includes('// indirect')) continue;

      const match = trimmed.match(/^(\S+)\s+(\S+)/);
      if (match) {
        deps.push({
          name: match[1],
          version: match[2],
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
      }
    }
  }

  // Parse single-line requires
  const singleRequireMatches = content.matchAll(/^require\s+(\S+)\s+(\S+)$/gm);
  for (const match of singleRequireMatches) {
    deps.push({
      name: match[1],
      version: match[2],
      purpose: inferDependencyPurpose(match[1]) ?? undefined,
    });
  }

  return deps;
}

/**
 * Parse Cargo.toml dependencies
 */
export function parseCargoToml(content: string): DependencyCategories {
  const result: DependencyCategories = {
    runtime: [],
    development: [],
    peer: [],
  };

  // Parse [dependencies] section
  const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
  if (depsMatch) {
    const depsSection = depsMatch[1];
    for (const line of depsSection.split('\n')) {
      // Handle simple: serde = "1.0"
      let match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (match) {
        result.runtime.push({
          name: match[1],
          version: match[2],
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
        continue;
      }

      // Handle table: tokio = { version = "1.0", features = [...] }
      match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*\{.*?version\s*=\s*"([^"]+)"/);
      if (match) {
        result.runtime.push({
          name: match[1],
          version: match[2],
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
        continue;
      }

      // Handle git dependencies: my-lib = { git = "..." }
      match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*\{.*?git\s*=/);
      if (match) {
        result.runtime.push({
          name: match[1],
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
      }
    }
  }

  // Parse [dev-dependencies] section
  const devDepsMatch = content.match(/\[dev-dependencies\]([\s\S]*?)(?=\[|$)/);
  if (devDepsMatch) {
    const depsSection = devDepsMatch[1];
    for (const line of depsSection.split('\n')) {
      let match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (match) {
        result.development.push({
          name: match[1],
          version: match[2],
          purpose: inferDependencyPurpose(match[1]) ?? undefined,
        });
      }
    }
  }

  return result;
}

/**
 * Infer the purpose of a dependency from its name
 */
export function inferDependencyPurpose(name: string): string | null {
  // Direct match
  if (COMMON_DEPENDENCY_PURPOSES[name]) {
    return COMMON_DEPENDENCY_PURPOSES[name];
  }

  // Pattern-based inference
  const lowerName = name.toLowerCase();

  if (lowerName.includes('test') || lowerName.includes('spec')) {
    return 'Testing';
  }
  if (lowerName.includes('lint') || lowerName.includes('eslint')) {
    return 'JavaScript linting';
  }
  if (lowerName.includes('prettier') || lowerName.includes('format')) {
    return 'Code formatting';
  }
  if (lowerName.includes('webpack') || lowerName.includes('bundle')) {
    return 'Module bundler';
  }
  if (lowerName.includes('babel')) {
    return 'JavaScript transpiler';
  }
  if (lowerName.includes('mock')) {
    return 'Mocking library';
  }
  if (lowerName.includes('types') || lowerName.startsWith('@types/')) {
    return 'TypeScript type definitions';
  }

  return null;
}

/**
 * Analyze project dependencies
 */
export async function analyzeDependencies(
  projectPath: string,
  files: FileInfo[]
): Promise<DependencyInfo> {
  const result: DependencyInfo = {
    packageManager: detectPackageManager(files),
    runtime: [],
    development: [],
    peer: [],
    totalCount: 0,
  };

  const fileNames = new Set(files.map(f => f.name));

  try {
    // Parse package.json (Node.js)
    if (fileNames.has('package.json')) {
      const packageJsonPath = join(projectPath, 'package.json');
      if (existsSync(packageJsonPath)) {
        const content = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        const deps = parsePackageJson(packageJson);
        result.runtime.push(...deps.runtime);
        result.development.push(...deps.development);
        result.peer.push(...deps.peer);
      }
    }

    // Parse requirements.txt (Python)
    if (fileNames.has('requirements.txt')) {
      const reqPath = join(projectPath, 'requirements.txt');
      if (existsSync(reqPath)) {
        const content = await readFile(reqPath, 'utf-8');
        const deps = parseRequirementsTxt(content);
        result.runtime.push(...deps);
      }
    }

    // Parse pyproject.toml (Python)
    if (fileNames.has('pyproject.toml')) {
      const pyprojectPath = join(projectPath, 'pyproject.toml');
      if (existsSync(pyprojectPath)) {
        const content = await readFile(pyprojectPath, 'utf-8');
        const deps = parsePyProjectToml(content);
        result.runtime.push(...deps.runtime);
        result.development.push(...deps.development);
      }
    }

    // Parse go.mod (Go)
    if (fileNames.has('go.mod')) {
      const goModPath = join(projectPath, 'go.mod');
      if (existsSync(goModPath)) {
        const content = await readFile(goModPath, 'utf-8');
        const deps = parseGoMod(content);
        result.runtime.push(...deps);
      }
    }

    // Parse Cargo.toml (Rust)
    if (fileNames.has('Cargo.toml')) {
      const cargoPath = join(projectPath, 'Cargo.toml');
      if (existsSync(cargoPath)) {
        const content = await readFile(cargoPath, 'utf-8');
        const deps = parseCargoToml(content);
        result.runtime.push(...deps.runtime);
        result.development.push(...deps.development);
      }
    }
  } catch {
    // Failed to parse dependencies
  }

  result.totalCount = result.runtime.length + result.development.length + result.peer.length;

  return result;
}
