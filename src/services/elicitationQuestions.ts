// src/services/elicitationQuestions.ts
import type { ProjectDomain } from '../types/elicitation';

/**
 * Question definition for requirement elicitation.
 */
export interface QuestionDefinition {
  id: string;
  section: string;
  question: string;
  description?: string;
  required: boolean;
  followUpTrigger?: string;
  followUpQuestionIds?: string[];
}

/**
 * Get base questions that apply to all project types.
 */
export function getBaseQuestions(): QuestionDefinition[] {
  return [
    // Overview section
    {
      id: 'project-name',
      section: 'overview',
      question: 'What is the name of your project?',
      required: true,
    },
    {
      id: 'project-description',
      section: 'overview',
      question: 'In 2-3 sentences, what does this project do?',
      description: 'Describe the core purpose and value proposition.',
      required: true,
    },
    {
      id: 'success-criteria',
      section: 'overview',
      question: 'How will you know when this project is successful?',
      description: 'What metrics or outcomes indicate success?',
      required: true,
    },
    {
      id: 'target-users',
      section: 'overview',
      question: 'Who are the primary users of this system?',
      required: true,
    },
    // Functional section
    {
      id: 'user-roles',
      section: 'functional',
      question: 'What different user roles or personas will interact with the system?',
      description: 'E.g., admin, regular user, guest, etc.',
      required: true,
    },
    {
      id: 'core-features',
      section: 'functional',
      question: 'What are the 3-5 core features that MUST be in the MVP?',
      required: true,
    },
    {
      id: 'user-journeys',
      section: 'functional',
      question: 'Describe the primary user journey (main flow through the system)',
      required: true,
    },
    {
      id: 'integrations',
      section: 'functional',
      question: 'Will this integrate with any third-party services or existing systems?',
      followUpTrigger: 'yes',
      followUpQuestionIds: ['integration-details'],
      required: false,
    },
    {
      id: 'integration-details',
      section: 'functional',
      question: 'What integrations are needed? (APIs, databases, services)',
      required: false,
    },
    // Nonfunctional section
    {
      id: 'performance-requirements',
      section: 'nonfunctional',
      question: 'What are the performance expectations? (response times, throughput)',
      required: false,
    },
    {
      id: 'security-requirements',
      section: 'nonfunctional',
      question: 'What security requirements exist? (authentication, authorization, data protection)',
      required: true,
    },
    {
      id: 'reliability-requirements',
      section: 'nonfunctional',
      question: 'What are the uptime/availability requirements?',
      required: false,
    },
    {
      id: 'scalability',
      section: 'nonfunctional',
      question: 'What scale does the system need to handle? (users, data volume)',
      required: false,
    },
    // Constraints section
    {
      id: 'timeline',
      section: 'constraints',
      question: 'Are there any hard deadlines or milestones?',
      required: false,
    },
    {
      id: 'budget',
      section: 'constraints',
      question: 'Are there budget constraints that affect technology choices?',
      required: false,
    },
    {
      id: 'tech-constraints',
      section: 'constraints',
      question: 'Are there any required technologies, frameworks, or infrastructure?',
      required: false,
    },
    {
      id: 'team-constraints',
      section: 'constraints',
      question: 'What is the team size and what skills are available?',
      required: false,
    },
    // Edge cases section
    {
      id: 'error-scenarios',
      section: 'edge-cases',
      question: 'What are the most likely things that could go wrong?',
      required: true,
    },
    {
      id: 'boundary-conditions',
      section: 'edge-cases',
      question: 'What are the limits of the system? (max users, data size, etc.)',
      required: false,
    },
    {
      id: 'failure-recovery',
      section: 'edge-cases',
      question: 'How should the system behave when things fail?',
      required: false,
    },
    {
      id: 'risks',
      section: 'edge-cases',
      question: 'What are the biggest risks to this project?',
      required: true,
    },
  ];
}

/**
 * Get domain-specific questions.
 */
export function getDomainQuestions(domain: ProjectDomain): QuestionDefinition[] {
  const domainQuestions: Record<ProjectDomain, QuestionDefinition[]> = {
    'web-app': [
      {
        id: 'web-responsive',
        section: 'functional',
        question: 'Does the application need to be responsive (mobile/tablet/desktop)?',
        required: true,
      },
      {
        id: 'web-browsers',
        section: 'nonfunctional',
        question: 'Which browsers need to be supported?',
        required: false,
      },
      {
        id: 'web-accessibility',
        section: 'nonfunctional',
        question: 'What accessibility standards need to be met? (WCAG level)',
        required: false,
      },
      {
        id: 'web-seo',
        section: 'functional',
        question: 'Is SEO important for this application?',
        required: false,
      },
    ],
    'api': [
      {
        id: 'api-endpoints',
        section: 'functional',
        question: 'What are the main API endpoints or resources?',
        required: true,
      },
      {
        id: 'api-versioning',
        section: 'nonfunctional',
        question: 'How will API versioning be handled?',
        required: false,
      },
      {
        id: 'api-rate-limiting',
        section: 'nonfunctional',
        question: 'Is rate limiting required? What limits?',
        required: false,
      },
      {
        id: 'api-documentation',
        section: 'functional',
        question: 'How will the API be documented? (OpenAPI/Swagger, etc.)',
        required: false,
      },
    ],
    'full-stack': [
      {
        id: 'fullstack-frontend',
        section: 'functional',
        question: 'What frontend framework/technology is preferred?',
        required: true,
      },
      {
        id: 'fullstack-backend',
        section: 'functional',
        question: 'What backend framework/technology is preferred?',
        required: true,
      },
      {
        id: 'fullstack-data-flow',
        section: 'functional',
        question: 'How does data flow between frontend and backend?',
        required: true,
      },
    ],
    'cli': [
      {
        id: 'cli-commands',
        section: 'functional',
        question: 'What are the main commands and subcommands?',
        required: true,
      },
      {
        id: 'cli-flags',
        section: 'functional',
        question: 'What flags/options are needed?',
        required: true,
      },
      {
        id: 'cli-input-output',
        section: 'functional',
        question: 'What input/output formats are supported? (stdin, files, JSON)',
        required: true,
      },
      {
        id: 'cli-shells',
        section: 'nonfunctional',
        question: 'Which shells need to be supported? (bash, zsh, fish, PowerShell)',
        required: false,
      },
    ],
    'mobile': [
      {
        id: 'mobile-platforms',
        section: 'functional',
        question: 'Which platforms are required? (iOS, Android, both)',
        required: true,
      },
      {
        id: 'mobile-offline',
        section: 'functional',
        question: 'Does the app need to work offline?',
        required: true,
      },
      {
        id: 'mobile-notifications',
        section: 'functional',
        question: 'Are push notifications needed?',
        required: false,
      },
      {
        id: 'mobile-app-store',
        section: 'constraints',
        question: 'Will this be distributed through app stores?',
        required: true,
      },
    ],
    'data-pipeline': [
      {
        id: 'pipeline-sources',
        section: 'functional',
        question: 'What are the data sources? (databases, APIs, files)',
        required: true,
      },
      {
        id: 'pipeline-transformations',
        section: 'functional',
        question: 'What transformations are needed?',
        required: true,
      },
      {
        id: 'pipeline-destinations',
        section: 'functional',
        question: 'Where does the data go? (data warehouse, lake, API)',
        required: true,
      },
      {
        id: 'pipeline-scheduling',
        section: 'nonfunctional',
        question: 'How often does the pipeline run? (real-time, hourly, daily)',
        required: true,
      },
      {
        id: 'pipeline-error-handling',
        section: 'edge-cases',
        question: 'How should failed records be handled?',
        required: true,
      },
    ],
    'library': [
      {
        id: 'library-api-surface',
        section: 'functional',
        question: 'What is the public API surface? (main functions/classes)',
        required: true,
      },
      {
        id: 'library-versioning',
        section: 'nonfunctional',
        question: 'How will semantic versioning be managed?',
        required: true,
      },
      {
        id: 'library-distribution',
        section: 'constraints',
        question: 'How will the library be distributed? (npm, PyPI, crates.io)',
        required: true,
      },
      {
        id: 'library-compatibility',
        section: 'nonfunctional',
        question: 'What runtime/language versions need to be supported?',
        required: true,
      },
    ],
    'infrastructure': [
      {
        id: 'infra-environments',
        section: 'functional',
        question: 'What environments are needed? (dev, staging, prod)',
        required: true,
      },
      {
        id: 'infra-cloud',
        section: 'constraints',
        question: 'Which cloud provider(s) are being used?',
        required: true,
      },
      {
        id: 'infra-iac',
        section: 'functional',
        question: 'What Infrastructure as Code tool is preferred? (Terraform, Pulumi, etc.)',
        required: false,
      },
      {
        id: 'infra-monitoring',
        section: 'nonfunctional',
        question: 'What monitoring and alerting is needed?',
        required: true,
      },
      {
        id: 'infra-disaster-recovery',
        section: 'edge-cases',
        question: 'What is the disaster recovery strategy?',
        required: true,
      },
    ],
    'ai-ml': [
      {
        id: 'aiml-data',
        section: 'functional',
        question: 'What data is available for training/inference?',
        required: true,
      },
      {
        id: 'aiml-model-type',
        section: 'functional',
        question: 'What type of model is needed? (classification, regression, generation)',
        required: true,
      },
      {
        id: 'aiml-inference',
        section: 'nonfunctional',
        question: 'What are the inference latency requirements?',
        required: true,
      },
      {
        id: 'aiml-training',
        section: 'functional',
        question: 'Will the model be trained from scratch or fine-tuned?',
        required: true,
      },
      {
        id: 'aiml-evaluation',
        section: 'functional',
        question: 'How will model performance be evaluated?',
        required: true,
      },
    ],
    'general': [],
  };

  return domainQuestions[domain] || [];
}

/**
 * Get all questions for a specific section, combining base and domain questions.
 */
export function getQuestionsForSection(
  domain: ProjectDomain,
  section: string
): QuestionDefinition[] {
  const baseQuestions = getBaseQuestions().filter(q => q.section === section);
  const domainQuestions = getDomainQuestions(domain).filter(q => q.section === section);

  return [...baseQuestions, ...domainQuestions];
}
