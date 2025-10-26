let autoRefresh = null;

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function getStatusClass(status) {
  const statusMap = {
    available: 'status-available',
    busy: 'status-busy',
    offline: 'status-offline'
  };
  return statusMap[status] || 'status-offline';
}

function getHealthClass(status) {
  const healthMap = {
    healthy: 'health-healthy',
    unhealthy: 'health-unhealthy',
    unknown: 'health-unknown'
  };
  return healthMap[status] || 'health-unknown';
}

function getAgentEmoji(agentType) {
  const emojiMap = {
    'claude-code': '🤖',
    'openai-codex': '🧠',
    aider: '🛠️',
    opencode: '💻'
  };
  return emojiMap[agentType] || '🔧';
}

function renderStats(agents) {
  const stats = {
    total: agents.length,
    available: agents.filter(a => a.status === 'available').length,
    busy: agents.filter(a => a.status === 'busy').length,
    offline: agents.filter(a => a.status === 'offline').length,
    healthy: agents.filter(a => a.health.status === 'healthy').length
  };

  return `
        <div class="stat-item">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Agents</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.available}</div>
            <div class="stat-label">Available</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.busy}</div>
            <div class="stat-label">Busy</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.offline}</div>
            <div class="stat-label">Offline</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.healthy}</div>
            <div class="stat-label">Healthy</div>
        </div>
    `;
}

function getUnifiedStatus(agent) {
  // For subscription-based agents, check authentication first
  if (agent.authType === 'subscription' && agent.health.authenticated === false) {
    return {
      label: '⏳ Awaiting Auth',
      class: 'status-awaiting-auth'
    };
  }

  // For API key agents or authenticated subscription agents, use availability status
  if (agent.status === 'available') {
    return {
      label: 'Available',
      class: 'status-available'
    };
  } else if (agent.status === 'busy') {
    return {
      label: 'Busy',
      class: 'status-busy'
    };
  } else {
    return {
      label: 'Unavailable',
      class: 'status-offline'
    };
  }
}

function renderOnboardingMessage(agent) {
  if (agent.authType === 'subscription' && agent.health.authenticated === false) {
    return `
            <div style="background: #fffaf0; border: 2px solid #ed8936; border-radius: 8px; padding: 12px; margin-top: 12px;">
                <div style="font-weight: 600; color: #7c2d12; margin-bottom: 8px;">🔐 Authentication Required</div>
                <div style="font-size: 0.85em; color: #744210; margin-bottom: 8px;">
                    This agent uses subscription-based authentication. Please authenticate to start using it.
                </div>
                ${
                  agent.provider
                    ? `
                <div style="font-size: 0.85em; color: #744210;">
                    <strong>Provider:</strong> ${agent.provider}
                    ${agent.model ? `<br><strong>Model:</strong> ${agent.model}` : ''}
                </div>
                `
                    : ''
                }
            </div>
        `;
  }
  return '';
}

function renderAgent(agent) {
  const status = getUnifiedStatus(agent);
  return `
        <div class="agent-card" data-agent-id="${agent.id}">
            <div class="agent-header">
                <div style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; width: 100%;">
                        <div class="agent-id">${agent.id}<span class="connect-icon" data-connect-agent="${agent.id}" title="Connect to container">🔌</span></div>
                        <span class="status-badge ${status.class}" style="flex-shrink: 0; margin-left: 12px;">${status.label}</span>
                    </div>
                    <div class="agent-name" style="width: 100%;">${getAgentEmoji(agent.type)} ${agent.name}</div>
                </div>
            </div>

            <div class="health-indicator">
                <div style="font-weight: 600; color: #4a5568; width: 100%;">
                    ${agent.status === 'busy' ? '⚡ Active' : '💤 Idle'}
                </div>
                ${
                  agent.status === 'busy' && agent.activeJob
                    ? `
                <div style="margin-top: 12px; font-size: 0.85em; color: #718096; line-height: 1.4; width: 100%;">
                    <div style="font-weight: 500; color: #4a5568; margin-bottom: 4px;">Current task:</div>
                    <div style="font-style: italic;">"${agent.activeJob.prompt.length > 60 ? agent.activeJob.prompt.substring(0, 60) + '...' : agent.activeJob.prompt}"</div>
                </div>
                `
                    : ''
                }
            </div>

            ${renderOnboardingMessage(agent)}

            <div class="agent-metadata">
                <div class="metadata-item">
                    <span class="metadata-label">Type:</span>
                    <span class="metadata-value">${agent.type}</span>
                </div>
                ${
                  agent.authType
                    ? `
                <div class="metadata-item">
                    <span class="metadata-label">Auth Type:</span>
                    <span class="metadata-value">${agent.authType}</span>
                </div>
                `
                    : ''
                }
                <div class="metadata-item">
                    <span class="metadata-label">Last Check:</span>
                    <span class="metadata-value">${formatTime(agent.health.lastCheck)}</span>
                </div>
                ${
                  agent.registeredAt
                    ? `
                <div class="metadata-item">
                    <span class="metadata-label">Registered:</span>
                    <span class="metadata-value">${formatTime(agent.registeredAt)}</span>
                </div>
                `
                    : ''
                }
            </div>
        </div>
    `;
}

async function loadAgents(verifyAuth = false) {
  const container = document.getElementById('agentsContainer');
  const statsContainer = document.getElementById('stats');

  try {
    container.innerHTML = '<div class="loading">Loading agents...</div>';

    // Add verifyAuth query parameter if requested
    const url = verifyAuth ? '/agents?verifyAuth=true' : '/agents';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const agents = data.agents || [];

    if (agents.length === 0) {
      container.innerHTML = '<div class="error">No agents registered</div>';
      statsContainer.innerHTML = '';
      return;
    }

    // Fetch active jobs for each agent
    const agentsWithJobs = await Promise.all(
      agents.map(async agent => {
        try {
          const jobsResponse = await fetch(`/agents/${agent.id}/jobs?status=running&limit=1`);
          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json();
            agent.activeJob = jobsData.jobs && jobsData.jobs.length > 0 ? jobsData.jobs[0] : null;
            console.log(`Agent ${agent.id} active job:`, agent.activeJob);
          }
        } catch (error) {
          console.warn(`Could not load jobs for agent ${agent.id}:`, error);
        }
        return agent;
      })
    );

    // Sort agents by type first, then by name
    const sortedAgents = agentsWithJobs.sort((a, b) => {
      // First sort by type
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      // Then sort by name (which includes instance number)
      return a.name.localeCompare(b.name);
    });

    statsContainer.innerHTML = renderStats(sortedAgents);
    container.innerHTML = `
            <div class="agents-grid">
                ${sortedAgents.map(renderAgent).join('')}
            </div>
        `;

    // Add event listeners for agent cards and connect icons
    document.querySelectorAll('.agent-card').forEach(card => {
      const agentId = card.getAttribute('data-agent-id');

      // Click on card goes to detail page
      card.addEventListener('click', e => {
        // Don't navigate if clicking on connect icon
        if (!e.target.classList.contains('connect-icon')) {
          window.location.href = `/ui/agent-detail?id=${agentId}`;
        }
      });

      // Click on connect icon opens modal
      const connectIcon = card.querySelector('.connect-icon');
      if (connectIcon) {
        connectIcon.addEventListener('click', e => {
          e.stopPropagation();
          const connectAgentId = connectIcon.getAttribute('data-connect-agent');
          connectToAgent(connectAgentId);
        });
      }
    });

    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
  } catch (error) {
    container.innerHTML = `<div class="error">Error loading agents: ${error.message}</div>`;
    statsContainer.innerHTML = '';
  }
}

function connectToAgent(agentId) {
  if (!agentId) {
    alert('No agent ID available');
    return;
  }

  const containerName = `docker-${agentId}`;
  const command = `docker exec -it ${containerName} /bin/bash`;
  showConnectModal(command);
}

function showConnectModal(command) {
  const modal = document.getElementById('connectModal');
  const commandBox = document.getElementById('connectCommand');

  commandBox.textContent = command;
  modal.classList.add('show');
  modal.dataset.command = command;
}

function closeConnectModal() {
  const modal = document.getElementById('connectModal');
  modal.classList.remove('show');

  const copyButton = document.getElementById('copyButton');
  copyButton.textContent = '📋 Copy to Clipboard';
  copyButton.classList.remove('copied');
}

function copyCommand() {
  const modal = document.getElementById('connectModal');
  const command = modal.dataset.command;
  const copyButton = document.getElementById('copyButton');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        copyButton.textContent = '✅ Copied!';
        copyButton.classList.add('copied');

        setTimeout(() => {
          copyButton.textContent = '📋 Copy to Clipboard';
          copyButton.classList.remove('copied');
        }, 2000);
      })
      .catch(() => {
        copyButton.textContent = '❌ Failed to copy';
      });
  } else {
    const commandBox = document.getElementById('connectCommand');
    const range = document.createRange();
    range.selectNodeContents(commandBox);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    copyButton.textContent = 'Text selected - press Ctrl+C';
  }
}

// Load agents on page load
document.addEventListener('DOMContentLoaded', () => {
  loadAgents();

  // Attach refresh button event listener
  const refreshButton = document.getElementById('refreshButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => loadAgents(true));
  }

  // Auto-refresh every 30 seconds WITH auth verification
  autoRefresh = setInterval(() => loadAgents(true), 30000);

  // Modal event listeners
  const modal = document.getElementById('connectModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeConnectModal();
      }
    });
  }

  const closeButton = document.getElementById('modalCloseButton');
  if (closeButton) {
    closeButton.addEventListener('click', closeConnectModal);
  }

  const copyButton = document.getElementById('copyButton');
  if (copyButton) {
    copyButton.addEventListener('click', copyCommand);
  }
});
