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

function renderAgentDetail(agent, jobs) {
    const metadata = agent.metadata || {};
    const metadataEntries = Object.entries(metadata);

    return `
        <div class="detail-grid">
            <!-- Status Card -->
            <div class="detail-card">
                <h2>Status & Health</h2>
                <div class="status-section">
                    <span class="status-badge ${getStatusClass(agent.status)}">${agent.status}</span>
                </div>
                <div class="health-indicator">
                    <div class="health-dot ${getHealthClass(agent.health.status)}"></div>
                    <div>
                        <strong>${agent.health.status}</strong>
                        ${agent.health.message ? `<br><small>${agent.health.message}</small>` : ''}
                    </div>
                </div>
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
                        <span class="info-value">${agent.type}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${agent.name}</span>
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
                        <span class="info-label">Last Heartbeat:</span>
                        <span class="info-value">${formatTime(agent.lastHeartbeat)}</span>
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
        document.getElementById('agentName').textContent = agent.name;
        document.getElementById('agentId').textContent = agent.id;
        document.title = `${agent.name} - LLPM REST API Broker`;

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    agentId = getAgentIdFromUrl();
    loadAgentDetail();
    // Auto-refresh every 10 seconds
    autoRefresh = setInterval(loadAgentDetail, 10000);
});
