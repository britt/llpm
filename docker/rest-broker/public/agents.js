let autoRefresh = null;

function formatTime(isoString) {
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

function renderAuthBadge(agent) {
    if (!agent.authType || agent.authType === 'api_key') {
        return '<span style="background: #bee3f8; color: #2c5282; padding: 4px 10px; border-radius: 12px; font-size: 0.75em; font-weight: 600;">🔑 API Key</span>';
    }

    if (agent.authType === 'subscription') {
        const isAuthenticated = agent.health.authenticated === true;
        if (isAuthenticated) {
            return '<span style="background: #c6f6d5; color: #22543d; padding: 4px 10px; border-radius: 12px; font-size: 0.75em; font-weight: 600;">✅ Authenticated</span>';
        } else {
            return '<span style="background: #feebc8; color: #7c2d12; padding: 4px 10px; border-radius: 12px; font-size: 0.75em; font-weight: 600;">⏳ Awaiting Auth</span>';
        }
    }

    return '';
}

function renderOnboardingMessage(agent) {
    if (agent.authType === 'subscription' && agent.health.authenticated === false) {
        return `
            <div style="background: #fffaf0; border: 2px solid #ed8936; border-radius: 8px; padding: 12px; margin-top: 12px;">
                <div style="font-weight: 600; color: #7c2d12; margin-bottom: 8px;">🔐 Authentication Required</div>
                <div style="font-size: 0.85em; color: #744210; margin-bottom: 8px;">
                    This agent uses subscription-based authentication. Please authenticate to start using it.
                </div>
                ${agent.provider ? `
                <div style="font-size: 0.85em; color: #744210;">
                    <strong>Provider:</strong> ${agent.provider}
                    ${agent.model ? `<br><strong>Model:</strong> ${agent.model}` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }
    return '';
}

function renderAgent(agent) {
    return `
        <div class="agent-card" data-agent-id="${agent.id}" style="cursor: pointer;">
            <div class="agent-header">
                <div>
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-id">${agent.id}</div>
                    <div style="margin-top: 8px;">${renderAuthBadge(agent)}</div>
                </div>
                <span class="status-badge ${getStatusClass(agent.status)}">${agent.status}</span>
            </div>

            <div class="health-indicator">
                <div class="health-dot ${getHealthClass(agent.health.status)}"></div>
                <div class="health-text">
                    ${agent.health.status} ${agent.health.message ? `- ${agent.health.message}` : ''}
                </div>
            </div>

            ${renderOnboardingMessage(agent)}

            <div class="agent-metadata">
                <div class="metadata-item">
                    <span class="metadata-label">Type:</span>
                    <span class="metadata-value">${agent.type}</span>
                </div>
                ${agent.authType ? `
                <div class="metadata-item">
                    <span class="metadata-label">Auth Type:</span>
                    <span class="metadata-value">${agent.authType}</span>
                </div>
                ` : ''}
                <div class="metadata-item">
                    <span class="metadata-label">Last Check:</span>
                    <span class="metadata-value">${formatTime(agent.health.lastCheck)}</span>
                </div>
                ${agent.registeredAt ? `
                <div class="metadata-item">
                    <span class="metadata-label">Registered:</span>
                    <span class="metadata-value">${formatTime(agent.registeredAt)}</span>
                </div>
                ` : ''}
                ${agent.lastHeartbeat ? `
                <div class="metadata-item">
                    <span class="metadata-label">Last Heartbeat:</span>
                    <span class="metadata-value">${formatTime(agent.lastHeartbeat)}</span>
                </div>
                ` : ''}
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

        statsContainer.innerHTML = renderStats(agents);
        container.innerHTML = `
            <div class="agents-grid">
                ${agents.map(renderAgent).join('')}
            </div>
        `;

        // Add click handlers to agent cards
        document.querySelectorAll('.agent-card').forEach(card => {
            card.addEventListener('click', () => {
                const agentId = card.getAttribute('data-agent-id');
                window.location.href = `/ui/agent-detail?id=${agentId}`;
            });
        });

        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    } catch (error) {
        container.innerHTML = `<div class="error">Error loading agents: ${error.message}</div>`;
        statsContainer.innerHTML = '';
    }
}

// Load agents on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAgents();
    // Auto-refresh every 10 seconds
    autoRefresh = setInterval(loadAgents, 10000);
});
