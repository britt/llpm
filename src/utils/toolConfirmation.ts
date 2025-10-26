/**
 * Tool Confirmation System
 *
 * Provides a mechanism for tools to require explicit user confirmation
 * before executing destructive or sensitive operations.
 */

export interface ConfirmationRequired {
  required: true;
  operation: string;
  details: string;
  risks: string[];
  confirmationToken?: string;
}

export interface ConfirmationNotRequired {
  required: false;
}

export type ConfirmationCheck = ConfirmationRequired | ConfirmationNotRequired;

/**
 * Check if a tool operation requires confirmation
 */
export function requiresConfirmation(
  toolName: string,
  params: Record<string, any>
): ConfirmationCheck {
  // Destructive operations that require confirmation
  const destructiveOps = [
    'cancel_job',
    'delete_agent',
    'update_agent',
    'delete_project',
    'force_push'
  ];

  if (destructiveOps.includes(toolName)) {
    return {
      required: true,
      operation: getOperationDescription(toolName, params),
      details: getOperationDetails(toolName, params),
      risks: getOperationRisks(toolName)
    };
  }

  return { required: false };
}

/**
 * Get human-readable operation description
 */
function getOperationDescription(toolName: string, params: Record<string, any>): string {
  switch (toolName) {
    case 'cancel_job':
      return `Cancel job ${params.jobId} for agent ${params.agentId}`;
    case 'delete_agent':
      return `Delete agent ${params.agentId}`;
    case 'update_agent':
      return `Update agent ${params.agentId} configuration`;
    case 'delete_project':
      return `Delete project ${params.projectId}`;
    case 'force_push':
      return `Force push to ${params.branch} in ${params.repo}`;
    default:
      return `Execute ${toolName}`;
  }
}

/**
 * Get detailed operation information
 */
function getOperationDetails(toolName: string, _params: Record<string, any>): string {
  switch (toolName) {
    case 'cancel_job':
      return 'This will terminate the running job and mark it as cancelled. Any in-progress work will be lost.';
    case 'delete_agent':
      return 'This will permanently remove the agent registration and all associated configuration.';
    case 'update_agent':
      return 'This will modify the agent configuration. Changes may affect agent behavior.';
    case 'delete_project':
      return 'This will permanently delete the project and all associated data including notes and scans.';
    case 'force_push':
      return 'This will overwrite the remote branch history. Other developers may lose work.';
    default:
      return 'This operation may have irreversible effects.';
  }
}

/**
 * Get operation risks
 */
function getOperationRisks(toolName: string): string[] {
  switch (toolName) {
    case 'cancel_job':
      return [
        'In-progress work will be lost',
        'Job cannot be resumed',
        'Agent may be left in inconsistent state'
      ];
    case 'delete_agent':
      return ['Permanent deletion', 'Configuration cannot be recovered', 'Active jobs will fail'];
    case 'update_agent':
      return [
        'May break existing workflows',
        'Requires agent restart',
        'Configuration validation may fail'
      ];
    case 'delete_project':
      return [
        'All data will be permanently lost',
        'Notes and scans will be deleted',
        'Cannot be undone'
      ];
    case 'force_push':
      return ['Rewrites history', 'Other developers lose work', 'May break CI/CD pipelines'];
    default:
      return ['Operation may be irreversible'];
  }
}

/**
 * Format confirmation prompt for display
 */
export function formatConfirmationPrompt(check: ConfirmationRequired): string {
  return `⚠️  **Confirmation Required**

**Operation**: ${check.operation}

**Details**: ${check.details}

**Risks**:
${check.risks.map(risk => `- ${risk}`).join('\n')}

**To proceed**, please confirm by responding with: \`yes, proceed\`
**To cancel**, respond with: \`cancel\` or \`no\``;
}

/**
 * Validate confirmation response
 */
export function isConfirmed(userResponse: string): boolean {
  const normalized = userResponse.toLowerCase().trim();
  const confirmPhrases = ['yes, proceed', 'yes proceed', 'proceed', 'confirm', 'yes'];

  return confirmPhrases.some(phrase => normalized === phrase);
}

/**
 * Check if response is cancellation
 */
export function isCancelled(userResponse: string): boolean {
  const normalized = userResponse.toLowerCase().trim();
  const cancelPhrases = ['cancel', 'no', 'abort', 'stop', 'no, cancel'];

  return cancelPhrases.some(phrase => normalized === phrase);
}
