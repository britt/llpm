import { existsSync as fsExistsSync } from 'fs';
import { askQuestion, askYesNo, type ReadlineInterface } from '../prompts';
import { addProject, listProjects, expandPath } from '../../utils/projectConfig';
import type { Project } from '../../types/project';

export interface ProjectResult {
  success: boolean;
  skipped: boolean;
  project?: Project;
}

export interface ProjectStepDeps {
  checkPathExists: (path: string) => boolean;
}

const defaultDeps: ProjectStepDeps = {
  checkPathExists: fsExistsSync,
};

export async function setupFirstProject(
  rl: ReadlineInterface,
  force: boolean,
  deps: ProjectStepDeps = defaultDeps
): Promise<ProjectResult> {
  console.log('\n  Step 5: Create First Project\n');
  console.log('  A project links a name, GitHub repo, and local directory.\n');

  // Check if projects already exist
  if (!force) {
    const existing = await listProjects();
    if (existing.length > 0) {
      console.log(`  You already have ${existing.length} project(s) configured.`);
      const addAnother = await askYesNo(rl, '  Add another project?', false);
      if (!addAnother) {
        return { success: true, skipped: true };
      }
    }
  }

  // Prompt for project details
  let name = '';
  while (!name) {
    name = await askQuestion(rl, '  Project name: ');
    if (!name) {
      console.log('  Project name is required.');
    }
  }

  let repository = '';
  while (!repository) {
    repository = await askQuestion(rl, '  GitHub repository (owner/repo): ');
    if (!repository) {
      console.log('  Repository is required.');
    }
  }

  let path = '';
  while (!path) {
    const input = await askQuestion(rl, '  Local project path: ');
    if (!input) {
      console.log('  Path is required.');
      continue;
    }
    const expanded = expandPath(input);
    if (!deps.checkPathExists(expanded)) {
      console.log(`  Path "${input}" does not exist. Please enter a valid path.`);
      continue;
    }
    path = expanded;
  }

  const descriptionInput = await askQuestion(rl, '  Description (optional): ');
  const description = descriptionInput || undefined;

  // Normalize repository to full URL and extract owner/repo for github_repo
  let normalizedRepo = repository;
  let githubRepo = repository;
  if (repository.startsWith('http://') || repository.startsWith('https://')) {
    normalizedRepo = repository;
    try {
      githubRepo = new URL(repository).pathname.slice(1);
    } catch {
      githubRepo = repository;
    }
  } else if (repository.includes('/') && !repository.includes('.')) {
    normalizedRepo = `https://github.com/${repository}`;
    githubRepo = repository;
  }

  const project = await addProject({
    name,
    repository: normalizedRepo,
    github_repo: githubRepo,
    path,
    description,
  });

  console.log(`\n  Project "${project.name}" created and set as active.`);

  return { success: true, skipped: false, project };
}
