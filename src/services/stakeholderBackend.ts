import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { getConfigDir } from '../utils/config';
import type {
  Stakeholder,
  StakeholderFile,
  StakeholderSummary,
  StakeholderGoal,
  ConflictResolution
} from '../types/stakeholder';

/**
 * Current schema version for stakeholder files
 */
const STAKEHOLDER_FILE_VERSION = '1.0';

/**
 * Backend service for managing stakeholder data stored in markdown files
 */
export class StakeholderBackend {
  private projectId: string;
  private notesDir: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.notesDir = join(getConfigDir(), 'projects', projectId, 'notes');
  }

  /**
   * Initialize the backend - create directories and empty file if needed
   */
  async initialize(): Promise<void> {
    // Ensure notes directory exists
    if (!existsSync(this.notesDir)) {
      mkdirSync(this.notesDir, { recursive: true });
    }

    // Create empty stakeholders.md if it doesn't exist
    const filePath = this.getFilePath();
    if (!existsSync(filePath)) {
      const emptyFile = this.serializeStakeholderFile({
        version: STAKEHOLDER_FILE_VERSION,
        updatedAt: new Date().toISOString(),
        stakeholders: [],
        conflictResolutions: []
      });
      writeFileSync(filePath, emptyFile, 'utf-8');
    }
  }

  /**
   * Get the path to the stakeholders.md file
   */
  getFilePath(): string {
    return join(this.notesDir, 'stakeholders.md');
  }

  /**
   * Load all stakeholder data from the file
   */
  async loadStakeholders(): Promise<StakeholderFile> {
    const filePath = this.getFilePath();

    if (!existsSync(filePath)) {
      return {
        version: STAKEHOLDER_FILE_VERSION,
        updatedAt: new Date().toISOString(),
        stakeholders: [],
        conflictResolutions: []
      };
    }

    const content = readFileSync(filePath, 'utf-8');
    return this.parseStakeholderFile(content);
  }

  /**
   * Parse the stakeholder markdown file into structured data
   */
  private parseStakeholderFile(content: string): StakeholderFile {
    const { data: frontmatter, content: body } = matter(content);

    const stakeholders: Stakeholder[] = [];
    const conflictResolutions: ConflictResolution[] = [];
    const goalIssueLinks: Map<string, Map<string, number[]>> = new Map();

    // Parse Goal-Issue Links section first
    const linksSectionMatch = body.match(/# Goal-Issue Links\n([\s\S]*?)(?=\n# |$)/);
    if (linksSectionMatch && linksSectionMatch[1]) {
      const linksContent = linksSectionMatch[1];
      let currentStakeholder = '';

      for (const line of linksContent.split('\n')) {
        const stakeholderMatch = line.match(/^## (.+)$/);
        if (stakeholderMatch && stakeholderMatch[1]) {
          currentStakeholder = stakeholderMatch[1];
          continue;
        }

        const linkMatch = line.match(/^- \*\*(.+)\*\*: (.+)$/);
        if (linkMatch && linkMatch[1] && linkMatch[2] && currentStakeholder) {
          const goal = linkMatch[1];
          const issues = linkMatch[2]
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.startsWith('#'))
            .map((s: string) => parseInt(s.slice(1), 10))
            .filter((n: number) => !isNaN(n));

          if (!goalIssueLinks.has(currentStakeholder)) {
            goalIssueLinks.set(currentStakeholder, new Map());
          }
          const stakeholderLinks = goalIssueLinks.get(currentStakeholder);
          if (stakeholderLinks) {
            stakeholderLinks.set(goal, issues);
          }
        }
      }
    }

    // Parse stakeholder sections
    const stakeholderSections = body.split(/(?=# Stakeholder: )/);

    for (const section of stakeholderSections) {
      const nameMatch = section.match(/^# Stakeholder: (.+)$/m);
      if (!nameMatch) continue;

      const name = nameMatch[1];
      const stakeholder = this.parseStakeholderSection(section, name);

      // Apply goal-issue links
      const stakeholderLinks = goalIssueLinks.get(name);
      if (stakeholderLinks) {
        for (const goal of stakeholder.goals) {
          const links = stakeholderLinks.get(goal.text);
          if (links) {
            goal.linkedIssues = links;
          }
        }
      }

      stakeholders.push(stakeholder);
    }

    // Parse Conflict Resolutions section
    const conflictsSectionMatch = body.match(/# Conflict Resolutions\n([\s\S]*?)(?=\n# |$)/);
    if (conflictsSectionMatch && conflictsSectionMatch[1]) {
      const conflictsContent = conflictsSectionMatch[1];
      const conflictBlocks = conflictsContent.split(/(?=## \d{4}-\d{2}-\d{2}:)/);

      for (const block of conflictBlocks) {
        const headerMatch = block.match(/^## (\d{4}-\d{2}-\d{2}): (.+) vs (.+)$/m);
        if (!headerMatch || !headerMatch[1] || !headerMatch[2] || !headerMatch[3]) continue;

        const conflictMatch = block.match(/- \*\*Conflict\*\*: (.+)$/m);
        const decisionMatch = block.match(/- \*\*Decision\*\*: (.+)$/m);
        const rationaleMatch = block.match(/- \*\*Rationale\*\*: (.+)$/m);

        if (conflictMatch?.[1] && decisionMatch?.[1] && rationaleMatch?.[1]) {
          conflictResolutions.push({
            date: headerMatch[1],
            stakeholder1: headerMatch[2],
            stakeholder2: headerMatch[3],
            conflict: conflictMatch[1],
            decision: decisionMatch[1],
            rationale: rationaleMatch[1]
          });
        }
      }
    }

    return {
      version: (frontmatter.version as string) || STAKEHOLDER_FILE_VERSION,
      updatedAt: (frontmatter.updated_at as string) || new Date().toISOString(),
      stakeholders,
      conflictResolutions
    };
  }

  /**
   * Parse a single stakeholder section from markdown
   */
  private parseStakeholderSection(section: string, name: string): Stakeholder {
    // Parse Basic Info
    const roleMatch = section.match(/- \*\*Role\*\*: (.+)$/m);
    const descMatch = section.match(/- \*\*Description\*\*: (.+)$/m);

    // Parse Goals
    const goals: StakeholderGoal[] = [];
    const goalsSection = section.match(/## Goals\n([\s\S]*?)(?=\n## |$)/);
    if (goalsSection && goalsSection[1]) {
      const goalLines = goalsSection[1].match(/^- .+$/gm) || [];
      for (const line of goalLines) {
        goals.push({
          text: line.slice(2).trim(),
          linkedIssues: []
        });
      }
    }

    // Parse Pain Points
    const painPoints: string[] = [];
    const painSection = section.match(/## Pain Points\n([\s\S]*?)(?=\n## |$)/);
    if (painSection && painSection[1]) {
      const painLines = painSection[1].match(/^- .+$/gm) || [];
      for (const line of painLines) {
        painPoints.push(line.slice(2).trim());
      }
    }

    // Parse Priorities (numbered list)
    const priorities: string[] = [];
    const prioritiesSection = section.match(/## Priorities\n([\s\S]*?)(?=\n## |$)/);
    if (prioritiesSection && prioritiesSection[1]) {
      const priorityLines = prioritiesSection[1].match(/^\d+\. .+$/gm) || [];
      for (const line of priorityLines) {
        priorities.push(line.replace(/^\d+\.\s*/, '').trim());
      }
    }

    return {
      name,
      role: roleMatch?.[1] || '',
      description: descMatch?.[1] || '',
      goals,
      painPoints,
      priorities
    };
  }

  /**
   * Serialize stakeholder data to markdown format
   */
  private serializeStakeholderFile(data: StakeholderFile): string {
    const frontmatter = {
      version: data.version,
      updated_at: data.updatedAt
    };

    let body = '';

    // Serialize each stakeholder
    for (const stakeholder of data.stakeholders) {
      body += this.serializeStakeholder(stakeholder);
      body += '\n---\n\n';
    }

    // Serialize Goal-Issue Links
    const hasLinks = data.stakeholders.some(s =>
      s.goals.some(g => g.linkedIssues.length > 0)
    );

    if (hasLinks || data.stakeholders.length > 0) {
      body += '# Goal-Issue Links\n\n';

      for (const stakeholder of data.stakeholders) {
        const goalsWithLinks = stakeholder.goals.filter(g => g.linkedIssues.length > 0);
        if (goalsWithLinks.length > 0) {
          body += `## ${stakeholder.name}\n`;
          for (const goal of goalsWithLinks) {
            const issueRefs = goal.linkedIssues.map(n => `#${n}`).join(', ');
            body += `- **${goal.text}**: ${issueRefs}\n`;
          }
          body += '\n';
        }
      }
    }

    // Serialize Conflict Resolutions
    if (data.conflictResolutions.length > 0) {
      body += '# Conflict Resolutions\n\n';

      for (const resolution of data.conflictResolutions) {
        body += `## ${resolution.date}: ${resolution.stakeholder1} vs ${resolution.stakeholder2}\n`;
        body += `- **Conflict**: ${resolution.conflict}\n`;
        body += `- **Decision**: ${resolution.decision}\n`;
        body += `- **Rationale**: ${resolution.rationale}\n\n`;
      }
    }

    return matter.stringify(body, frontmatter);
  }

  /**
   * Serialize a single stakeholder to markdown
   */
  private serializeStakeholder(stakeholder: Stakeholder): string {
    let md = `# Stakeholder: ${stakeholder.name}\n\n`;

    md += '## Basic Info\n';
    md += `- **Role**: ${stakeholder.role}\n`;
    md += `- **Description**: ${stakeholder.description}\n\n`;

    md += '## Goals\n';
    for (const goal of stakeholder.goals) {
      md += `- ${goal.text}\n`;
    }
    md += '\n';

    md += '## Pain Points\n';
    for (const painPoint of stakeholder.painPoints) {
      md += `- ${painPoint}\n`;
    }
    md += '\n';

    md += '## Priorities\n';
    stakeholder.priorities.forEach((priority, index) => {
      md += `${index + 1}. ${priority}\n`;
    });

    return md;
  }

  /**
   * Save stakeholder data to file
   */
  private async saveStakeholders(data: StakeholderFile): Promise<void> {
    const updated = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    const content = this.serializeStakeholderFile(updated);
    writeFileSync(this.getFilePath(), content, 'utf-8');
  }

  /**
   * Add a new stakeholder
   */
  async addStakeholder(stakeholder: Stakeholder): Promise<void> {
    const data = await this.loadStakeholders();

    // Check for duplicate
    if (data.stakeholders.some(s => s.name === stakeholder.name)) {
      throw new Error(`Stakeholder "${stakeholder.name}" already exists`);
    }

    data.stakeholders.push(stakeholder);
    await this.saveStakeholders(data);
  }

  /**
   * Get a stakeholder by name
   */
  async getStakeholder(name: string): Promise<Stakeholder | null> {
    const data = await this.loadStakeholders();
    return data.stakeholders.find(s => s.name === name) || null;
  }

  /**
   * Update a stakeholder
   */
  async updateStakeholder(
    name: string,
    updates: Partial<Omit<Stakeholder, 'name'>>
  ): Promise<void> {
    const data = await this.loadStakeholders();
    const index = data.stakeholders.findIndex(s => s.name === name);

    if (index === -1) {
      throw new Error(`Stakeholder "${name}" not found`);
    }

    const existing = data.stakeholders[index];
    data.stakeholders[index] = {
      name: existing.name,
      role: updates.role ?? existing.role,
      description: updates.description ?? existing.description,
      goals: updates.goals ?? existing.goals,
      painPoints: updates.painPoints ?? existing.painPoints,
      priorities: updates.priorities ?? existing.priorities
    };

    await this.saveStakeholders(data);
  }

  /**
   * Remove a stakeholder
   */
  async removeStakeholder(name: string): Promise<void> {
    const data = await this.loadStakeholders();
    const index = data.stakeholders.findIndex(s => s.name === name);

    if (index === -1) {
      throw new Error(`Stakeholder "${name}" not found`);
    }

    data.stakeholders.splice(index, 1);
    await this.saveStakeholders(data);
  }

  /**
   * List all stakeholders as summaries
   */
  async listStakeholders(): Promise<StakeholderSummary[]> {
    const data = await this.loadStakeholders();

    return data.stakeholders.map(s => ({
      name: s.name,
      role: s.role,
      goalCount: s.goals.length,
      painPointCount: s.painPoints.length,
      linkedIssueCount: s.goals.reduce(
        (sum, g) => sum + g.linkedIssues.length,
        0
      )
    }));
  }

  /**
   * Link a GitHub issue to a stakeholder goal
   */
  async linkIssueToGoal(
    stakeholderName: string,
    goalText: string,
    issueNumber: number
  ): Promise<void> {
    const data = await this.loadStakeholders();
    const stakeholder = data.stakeholders.find(s => s.name === stakeholderName);

    if (!stakeholder) {
      throw new Error(`Stakeholder "${stakeholderName}" not found`);
    }

    const goal = stakeholder.goals.find(g => g.text === goalText);
    if (!goal) {
      throw new Error(`Goal "${goalText}" not found`);
    }

    // Add issue if not already linked
    if (!goal.linkedIssues.includes(issueNumber)) {
      goal.linkedIssues.push(issueNumber);
    }

    await this.saveStakeholders(data);
  }

  /**
   * Unlink a GitHub issue from a stakeholder goal
   */
  async unlinkIssueFromGoal(
    stakeholderName: string,
    goalText: string,
    issueNumber: number
  ): Promise<void> {
    const data = await this.loadStakeholders();
    const stakeholder = data.stakeholders.find(s => s.name === stakeholderName);

    if (!stakeholder) {
      throw new Error(`Stakeholder "${stakeholderName}" not found`);
    }

    const goal = stakeholder.goals.find(g => g.text === goalText);
    if (!goal) {
      throw new Error(`Goal "${goalText}" not found`);
    }

    goal.linkedIssues = goal.linkedIssues.filter(n => n !== issueNumber);
    await this.saveStakeholders(data);
  }

  /**
   * Add a conflict resolution record
   */
  async addConflictResolution(resolution: ConflictResolution): Promise<void> {
    const data = await this.loadStakeholders();
    data.conflictResolutions.push(resolution);
    await this.saveStakeholders(data);
  }
}

/**
 * Get stakeholder backend for a project (cached)
 */
let currentBackend: StakeholderBackend | null = null;
let currentProjectId: string | null = null;

export async function getStakeholderBackend(
  projectId: string
): Promise<StakeholderBackend> {
  if (currentBackend && currentProjectId === projectId) {
    return currentBackend;
  }

  currentBackend = new StakeholderBackend(projectId);
  currentProjectId = projectId;
  await currentBackend.initialize();

  return currentBackend;
}
