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

function renderAgent(agent) {
    return `
        <div class="agent-card">
            <div class="agent-header">
                <div>
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-id">${agent.id}</div>
                </div>
                <span class="status-badge ${getStatusClass(agent.status)}">${agent.status}</span>
            </div>

            <div class="health-indicator">
                <div class="health-dot ${getHealthClass(agent.health.status)}"></div>
                <div class="health-text">
                    ${agent.health.status} ${agent.health.message ? `- ${agent.health.message}` : ''}
                </div>
            </div>

            <div class="agent-metadata">
                <div class="metadata-item">
                    <span class="metadata-label">Type:</span>
                    <span class="metadata-value">${agent.type}</span>
                </div>
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

async function loadAgents() {
    const container = document.getElementById('agentsContainer');
    const statsContainer = document.getElementById('stats');

    try {
        container.innerHTML = '<div class="loading">Loading agents...</div>';

        const response = await fetch('/agents');
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
