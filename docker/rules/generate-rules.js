#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Agent configurations
const agents = {
  'claude-code': {
    agent_name: 'Claude Code',
    output_filename: 'CLAUDE.md',
    agent_specific_rules: null
  },
  'aider': {
    agent_name: 'Aider',
    output_filename: 'CONVENTIONS.md',
    agent_specific_rules: null
  },
  'openai-codex': {
    agent_name: 'OpenAI Codex',
    output_filename: 'AGENT.md',
    agent_specific_rules: null
  },
  'opencode': {
    agent_name: 'OpenCode',
    output_filename: 'AGENT.md',
    agent_specific_rules: null
  }
};

// Check if specific agent requested via command line
const requestedAgent = process.argv[2];
const agentsToProcess = requestedAgent ? { [requestedAgent]: agents[requestedAgent] } : agents;

if (requestedAgent && !agents[requestedAgent]) {
  console.error(`Error: Unknown agent "${requestedAgent}"`);
  console.error(`Available agents: ${Object.keys(agents).join(', ')}`);
  process.exit(1);
}

// Read the base template
const templatePath = path.join(__dirname, 'AGENT_RULES.base.md');
const templateContent = fs.readFileSync(templatePath, 'utf8');
const template = Handlebars.compile(templateContent);

// Process each agent
for (const [agentId, config] of Object.entries(agentsToProcess)) {
  // Check if agent has specific rules file
  const specificRulesPath = path.join(__dirname, agentId, 'specific-rules.md');
  if (fs.existsSync(specificRulesPath)) {
    config.agent_specific_rules = fs.readFileSync(specificRulesPath, 'utf8').trim();
  }

  // Generate the rules file
  const output = template(config);

  // Write to agent directory
  const outputPath = path.join(__dirname, '..', agentId, config.output_filename);
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`Generated ${outputPath}`);
}

console.log(requestedAgent ? `Generated rules for ${requestedAgent}` : 'All agent rules files generated successfully!');
