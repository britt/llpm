/**
 * Architecture Analyzer
 * LLM-powered analysis of project architecture
 */

import { generateText } from 'ai';
import { modelRegistry } from './modelRegistry';
import type { FileInfo } from './projectAnalyzer';
import type { KeyFile, DirectoryEntry } from '../types/projectScan';

/**
 * Architecture component definition
 */
export interface ArchitectureComponent {
  name: string;
  type: 'layer' | 'service' | 'module' | 'data-store' | 'utility' | 'external';
  description: string;
  dependencies: string[];
  keyFiles: string[];
}

/**
 * Architecture analysis result
 */
export interface ArchitectureAnalysis {
  description: string;
  components: ArchitectureComponent[];
  mermaidDiagram?: string;
}

/**
 * Context built for LLM analysis
 */
export interface ArchitectureContext {
  languages: string[];
  frameworks: string[];
  directories: DirectoryEntry[];
  keyFiles: KeyFile[];
  fileList: string[];
  totalFiles: number;
  totalLines: number;
}

/**
 * Options for architecture analysis
 */
export interface ArchitectureAnalysisOptions {
  skipLLM?: boolean;
}

/**
 * Maximum number of files to include in context
 */
const MAX_FILES_IN_CONTEXT = 50;

/**
 * Build context for LLM architecture analysis
 */
export function buildArchitectureContext(
  files: FileInfo[],
  directories: DirectoryEntry[],
  keyFiles: KeyFile[],
  languages: string[],
  frameworks: string[]
): ArchitectureContext {
  // Limit file list to prevent token overflow
  const limitedFiles = files.slice(0, MAX_FILES_IN_CONTEXT);

  const totalLines = files.reduce((sum, f) => sum + (f.lines || 0), 0);

  return {
    languages,
    frameworks,
    directories,
    keyFiles,
    fileList: limitedFiles.map(f => f.path),
    totalFiles: files.length,
    totalLines,
  };
}

/**
 * Parse the LLM response into structured architecture analysis
 */
export function parseArchitectureResponse(response: string): ArchitectureAnalysis {
  const result: ArchitectureAnalysis = {
    description: '',
    components: [],
  };

  try {
    // Try to extract JSON from code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

    const parsed = JSON.parse(jsonStr);

    if (typeof parsed.description === 'string') {
      result.description = parsed.description;
    }

    if (Array.isArray(parsed.components)) {
      result.components = parsed.components.filter(
        (c: unknown): c is ArchitectureComponent =>
          typeof c === 'object' &&
          c !== null &&
          typeof (c as any).name === 'string' &&
          typeof (c as any).type === 'string' &&
          typeof (c as any).description === 'string' &&
          Array.isArray((c as any).dependencies) &&
          Array.isArray((c as any).keyFiles)
      );
    }

    if (typeof parsed.mermaidDiagram === 'string') {
      result.mermaidDiagram = parsed.mermaidDiagram;
    }
  } catch {
    // Failed to parse JSON, return empty result
  }

  return result;
}

/**
 * Generate a Mermaid diagram from components
 */
export function generateMermaidDiagram(components: ArchitectureComponent[]): string {
  if (components.length === 0) {
    return '';
  }

  const lines: string[] = ['flowchart TD'];

  // Create a map of component names to safe IDs
  const idMap = new Map<string, string>();
  components.forEach((c, i) => {
    const safeId = `C${i}`;
    idMap.set(c.name, safeId);
  });

  // Add nodes with labels
  for (const component of components) {
    const id = idMap.get(component.name)!;
    // Escape quotes in names
    const safeName = component.name.replace(/"/g, '\\"');
    lines.push(`  ${id}["${safeName}"]`);
  }

  // Add edges for dependencies
  for (const component of components) {
    const fromId = idMap.get(component.name)!;
    for (const dep of component.dependencies) {
      const toId = idMap.get(dep);
      if (toId) {
        lines.push(`  ${fromId} --> ${toId}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * @prompt Architecture analysis prompt for LLM
 * Analyzes project structure to identify architectural components and their relationships.
 * Returns structured JSON with description, components array, and mermaid diagram.
 */
const ARCHITECTURE_PROMPT = `You are an expert software architect. Analyze the following project structure and provide an architectural overview.

## Project Information

**Languages:** {{languages}}
**Frameworks:** {{frameworks}}

## Directory Structure

{{directories}}

## Key Files

{{keyFiles}}

## File List (sample)

{{fileList}}

Total files: {{totalFiles}}
Total lines of code: {{totalLines}}

## Instructions

Analyze this project and provide:
1. A high-level architectural description (2-3 sentences)
2. A list of major architectural components
3. A Mermaid flowchart showing component relationships

Respond with valid JSON in this exact format:
{
  "description": "Brief architectural description",
  "components": [
    {
      "name": "Component Name",
      "type": "layer|service|module|data-store|utility|external",
      "description": "What this component does",
      "dependencies": ["Other Component Names"],
      "keyFiles": ["relevant/file/paths"]
    }
  ],
  "mermaidDiagram": "flowchart TD\\n  A --> B\\n  B --> C"
}

Important:
- Use only these component types: layer, service, module, data-store, utility, external
- Dependencies should reference other component names exactly
- The mermaid diagram should show data/control flow between components
- Focus on the main architectural components, not every file
- Limit to 5-8 major components`;

/**
 * Analyze project architecture using LLM
 */
export async function analyzeArchitecture(
  files: FileInfo[],
  directories: DirectoryEntry[],
  keyFiles: KeyFile[],
  languages: string[],
  frameworks: string[],
  options: ArchitectureAnalysisOptions = {}
): Promise<ArchitectureAnalysis> {
  if (options.skipLLM) {
    return {
      description: '',
      components: [],
    };
  }

  try {
    const context = buildArchitectureContext(files, directories, keyFiles, languages, frameworks);

    // Build the prompt
    const prompt = ARCHITECTURE_PROMPT
      .replace('{{languages}}', context.languages.join(', ') || 'Unknown')
      .replace('{{frameworks}}', context.frameworks.join(', ') || 'None detected')
      .replace(
        '{{directories}}',
        context.directories
          .map(d => `- ${d.path}: ${d.purpose} (${d.fileCount} files, ${d.primaryLanguage || 'mixed'})`)
          .join('\n') || 'No directories'
      )
      .replace(
        '{{keyFiles}}',
        context.keyFiles
          .map(f => `- ${f.path}: ${f.reason} (${f.category})`)
          .join('\n') || 'No key files identified'
      )
      .replace('{{fileList}}', context.fileList.join('\n') || 'No files')
      .replace('{{totalFiles}}', String(context.totalFiles))
      .replace('{{totalLines}}', String(context.totalLines));

    const model = await modelRegistry.createLanguageModel();

    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const analysis = parseArchitectureResponse(result.text);

    // If LLM didn't provide a diagram, generate one from components
    if (!analysis.mermaidDiagram && analysis.components.length > 0) {
      analysis.mermaidDiagram = generateMermaidDiagram(analysis.components);
    }

    return analysis;
  } catch {
    // LLM call failed, return empty analysis
    return {
      description: '',
      components: [],
    };
  }
}
