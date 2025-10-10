let autoRefresh = null;
let agentId = null;

function getAgentIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function formatTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
}

function getStatusClass(status) {
    const statusMap = {
        'available': 'status-available',
        'busy': 'status-busy',
        'offline': 'status-offline'
    };
    return statusMap[status] || 'status-offline';
}

function getHealthClass(status) {
    const healthMap = {
        'healthy': 'health-healthy',
        'unhealthy': 'health-unhealthy',
        'unknown': 'health-unknown'
    };
    return healthMap[status] || 'health-unknown';
}

function getJobStatusClass(status) {
    const statusMap = {
        'completed': 'job-completed',
        'running': 'job-running',
        'failed': 'job-failed',
        'queued': 'job-queued'
    };
    return statusMap[status] || 'job-queued';
}

function getAgentEmoji(agentType) {
    const emojiMap = {
        'claude-code': '🤖',
        'openai-codex': '🧠',
        'aider': '🛠️',
        'opencode': '💻'
    };
    return emojiMap[agentType] || '🔧';
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

function getAuthBadge(agent) {
    if (!agent.authType || agent.authType === 'api_key') {
        return '<span style="background: #bee3f8; color: #2c5282; padding: 6px 14px; border-radius: 12px; font-size: 0.9em; font-weight: 600;">🔑 API Key</span>';
    }

    if (agent.authType === 'subscription') {
        const isAuthenticated = agent.health.authenticated === true;
        if (isAuthenticated) {
            return '<span style="background: #c6f6d5; color: #22543d; padding: 6px 14px; border-radius: 12px; font-size: 0.9em; font-weight: 600;">✅ Authenticated</span>';
        } else {
            return '<span style="background: #feebc8; color: #7c2d12; padding: 6px 14px; border-radius: 12px; font-size: 0.9em; font-weight: 600;">⏳ Awaiting Auth</span>';
        }
    }

    return '';
}

function renderOnboardingMessage(agent) {
    if (agent.authType === 'subscription' && agent.health.authenticated === false) {
        return `
            <div style="background: #fffaf0; border: 2px solid #ed8936; border-radius: 12px; padding: 20px; margin-top: 16px;">
                <div style="font-weight: 700; color: #7c2d12; margin-bottom: 12px; font-size: 1.1em;">🔐 Authentication Required</div>
                <div style="color: #744210; line-height: 1.6;">
                    <p style="margin-bottom: 12px;">This agent uses subscription-based authentication. To authenticate:</p>
                    <ol style="margin-left: 20px; margin-bottom: 12px;">
                        <li style="margin-bottom: 8px;">Connect to the container: <code style="background: #fed7d7; padding: 2px 6px; border-radius: 4px; font-family: monospace;">docker exec -it docker-${agent.id}-1 bash</code></li>
                        <li style="margin-bottom: 8px;">Run the authentication command for ${agent.provider || 'your provider'}</li>
                        <li style="margin-bottom: 8px;">After successful authentication, run: <code style="background: #fed7d7; padding: 2px 6px; border-radius: 4px; font-family: monospace;">signal-authenticated</code></li>
                    </ol>
                    ${agent.provider ? `<p style="margin-top: 12px;"><strong>Provider:</strong> ${agent.provider}</p>` : ''}
                    ${agent.model ? `<p><strong>Model:</strong> ${agent.model}</p>` : ''}
                </div>
            </div>
        `;
    }
    return '';
}

function renderAgentDetail(agent, jobs) {
    const metadata = agent.metadata || {};
    const metadataEntries = Object.entries(metadata);
    const status = getUnifiedStatus(agent);

    return `
        <div class="detail-grid">
            <!-- Status Card -->
            <div class="detail-card">
                <h2>Status</h2>
                <div class="status-section">
                    <span class="status-badge ${status.class}">${status.label}</span>
                </div>
                <div style="margin-top: 16px; padding: 12px; background: #f7fafc; border-radius: 8px;">
                    <div style="font-weight: 600; color: #4a5568; font-size: 1.1em;">
                        ${agent.status === 'busy' ? '⚡ Active' : '💤 Idle'}
                    </div>
                </div>
            </div>

            <!-- Authentication Card -->
            <div class="detail-card">
                <h2>Authentication</h2>
                <div class="info-table">
                    <div class="info-row">
                        <span class="info-label">Auth Type:</span>
                        <span class="info-value">${agent.authType === 'subscription' ? 'Subscription' : 'API Key'}</span>
                    </div>
                    ${agent.authType === 'subscription' ? `
                    <div class="info-row">
                        <span class="info-label">Authenticated:</span>
                        <span class="info-value">${agent.health.authenticated ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    ${agent.provider ? `
                    <div class="info-row">
                        <span class="info-label">Provider:</span>
                        <span class="info-value">${agent.provider}</span>
                    </div>
                    ` : ''}
                    ${agent.model ? `
                    <div class="info-row">
                        <span class="info-label">Model:</span>
                        <span class="info-value">${agent.model}</span>
                    </div>
                    ` : ''}
                    ` : ''}
                    ${agent.baseUrl ? `
                    <div class="info-row">
                        <span class="info-label">Base URL:</span>
                        <span class="info-value" style="font-size: 0.85em; word-break: break-all;">${agent.baseUrl}</span>
                    </div>
                    ` : ''}
                </div>
                ${renderOnboardingMessage(agent)}
            </div>

            <!-- Basic Info Card -->
            <div class="detail-card">
                <h2>Basic Information</h2>
                <div class="info-table">
                    <div class="info-row">
                        <span class="info-label">Agent ID:</span>
                        <span class="info-value">${agent.id}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Type:</span>
                        <span class="info-value">${getAgentEmoji(agent.type)} ${agent.type}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${getAgentEmoji(agent.type)} ${agent.name}</span>
                    </div>
                    ${agent.host ? `
                    <div class="info-row">
                        <span class="info-label">Host:</span>
                        <span class="info-value">${agent.host}</span>
                    </div>
                    ` : ''}
                    ${agent.port ? `
                    <div class="info-row">
                        <span class="info-label">Port:</span>
                        <span class="info-value">${agent.port}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Timestamps Card -->
            <div class="detail-card">
                <h2>Timestamps</h2>
                <div class="info-table">
                    <div class="info-row">
                        <span class="info-label">Registered At:</span>
                        <span class="info-value">${formatTime(agent.registeredAt)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Last Health Check:</span>
                        <span class="info-value">${formatTime(agent.health.lastCheck)}</span>
                    </div>
                </div>
            </div>

            <!-- Metadata Card -->
            ${metadataEntries.length > 0 ? `
            <div class="detail-card">
                <h2>Metadata</h2>
                <div class="metadata-section">
                    ${metadataEntries.map(([key, value]) => `
                        <div class="metadata-item">
                            <span class="info-label">${key}:</span>
                            <span class="info-value">${JSON.stringify(value)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Recent Jobs Card -->
            <div class="detail-card jobs-section">
                <h2>Recent Jobs</h2>
                ${jobs && jobs.length > 0 ? `
                    ${jobs.map(job => `
                        <div class="job-item">
                            <div>
                                <strong>${job.id}</strong>
                                <br>
                                <small>${formatTime(job.createdAt)}</small>
                            </div>
                            <span class="job-status ${getJobStatusClass(job.status)}">${job.status}</span>
                        </div>
                    `).join('')}
                ` : '<p style="color: #718096; text-align: center; padding: 20px;">No jobs found</p>'}
            </div>
        </div>
    `;
}

async function loadAgentDetail() {
    const container = document.getElementById('detailContainer');

    if (!agentId) {
        container.innerHTML = '<div class="error">No agent ID specified</div>';
        return;
    }

    try {
        container.innerHTML = '<div class="loading">Loading agent details...</div>';

        // Fetch agent details
        const agentResponse = await fetch(`/agents`);
        if (!agentResponse.ok) {
            throw new Error(`HTTP error! status: ${agentResponse.status}`);
        }

        const agentData = await agentResponse.json();
        const agent = agentData.agents.find(a => a.id === agentId);

        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        // Update header
        document.getElementById('agentName').textContent = `${getAgentEmoji(agent.type)} ${agent.name}`;
        document.getElementById('agentId').textContent = agent.id;
        document.title = `${getAgentEmoji(agent.type)} ${agent.name} - LLPM REST API Broker`;

        // Fetch recent jobs (limit 10)
        let jobs = [];
        try {
            const jobsResponse = await fetch(`/agents/${agentId}/jobs?limit=10`);
            if (jobsResponse.ok) {
                const jobsData = await jobsResponse.json();
                jobs = jobsData.jobs || [];
            }
        } catch (error) {
            console.warn('Could not load jobs:', error);
        }

        // Render the detail view
        container.innerHTML = renderAgentDetail(agent, jobs);

        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    } catch (error) {
        container.innerHTML = `<div class="error">Error loading agent: ${error.message}</div>`;
    }
}

function connectToAgent() {
    if (!agentId) {
        alert('No agent ID available');
        return;
    }

    // Execute docker exec command to connect to the agent container
    const containerName = `docker-${agentId}-1`;

    // Create a command that opens a new terminal connected to the container
    const command = `docker exec -it ${containerName} /bin/bash`;

    // Show modal with command
    showConnectModal(command);
}

function showConnectModal(command) {
    const modal = document.getElementById('connectModal');
    const commandBox = document.getElementById('connectCommand');

    commandBox.textContent = command;
    modal.classList.add('show');

    // Store command for copying
    modal.dataset.command = command;
}

function closeConnectModal() {
    const modal = document.getElementById('connectModal');
    modal.classList.remove('show');

    // Reset copy button text
    const copyButton = document.getElementById('copyButton');
    copyButton.textContent = '📋 Copy to Clipboard';
    copyButton.classList.remove('copied');
}

function copyCommand() {
    const modal = document.getElementById('connectModal');
    const command = modal.dataset.command;
    const copyButton = document.getElementById('copyButton');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(command).then(() => {
            copyButton.textContent = '✅ Copied!';
            copyButton.classList.add('copied');

            setTimeout(() => {
                copyButton.textContent = '📋 Copy to Clipboard';
                copyButton.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            copyButton.textContent = '❌ Failed to copy';
        });
    } else {
        // Fallback: select text
        const commandBox = document.getElementById('connectCommand');
        const range = document.createRange();
        range.selectNodeContents(commandBox);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        copyButton.textContent = 'Text selected - press Ctrl+C';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    agentId = getAgentIdFromUrl();
    loadAgentDetail();
    // Auto-refresh every 10 seconds
    autoRefresh = setInterval(loadAgentDetail, 10000);

    // Add refresh button event listener
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', loadAgentDetail);
    }

    // Add connect button event listener
    const connectButton = document.getElementById('connectButton');
    if (connectButton) {
        connectButton.addEventListener('click', connectToAgent);
    }

    // Close modal when clicking outside of it
    const modal = document.getElementById('connectModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeConnectModal();
            }
        });
    }

    // Add close button event listener
    const closeButton = document.getElementById('modalCloseButton');
    if (closeButton) {
        closeButton.addEventListener('click', closeConnectModal);
    }

    // Add copy button event listener
    const copyButton = document.getElementById('copyButton');
    if (copyButton) {
        copyButton.addEventListener('click', copyCommand);
    }
});
