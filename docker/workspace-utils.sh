#!/bin/bash

# Workspace path utilities for LLPM agents
# Provides functions to generate and manage per-agent workspace paths

# Get the workspace root directory
# Priority: LLPM_WORKSPACE_ROOT env var > global config > default
get_workspace_root() {
    if [ -n "$LLPM_WORKSPACE_ROOT" ]; then
        echo "$LLPM_WORKSPACE_ROOT"
    elif [ -f "$HOME/.llpm/config.yaml" ]; then
        # Try to parse workspace_root from config.yaml
        local config_root=$(grep '^workspace_root:' "$HOME/.llpm/config.yaml" | sed 's/workspace_root: *//' | sed 's/["'\'']//g')
        if [ -n "$config_root" ]; then
            # Expand ~ to $HOME
            echo "${config_root/#\~/$HOME}"
        else
            echo "$HOME/.llpm/workspaces"
        fi
    else
        echo "$HOME/.llpm/workspaces"
    fi
}

# Get workspace path for a specific agent
# Args: agent_id (e.g., "claude-code-1")
get_agent_workspace() {
    local agent_id="$1"
    if [ -z "$agent_id" ]; then
        echo "Error: agent_id required" >&2
        return 1
    fi

    local workspace_root=$(get_workspace_root)
    echo "$workspace_root/$agent_id"
}

# Create workspace directory for an agent if it doesn't exist
# Args: agent_id (e.g., "claude-code-1")
ensure_agent_workspace() {
    local agent_id="$1"
    if [ -z "$agent_id" ]; then
        echo "Error: agent_id required" >&2
        return 1
    fi

    local workspace_path=$(get_agent_workspace "$agent_id")

    if [ ! -d "$workspace_path" ]; then
        mkdir -p "$workspace_path"
        echo "Created workspace: $workspace_path" >&2
    fi

    echo "$workspace_path"
}

# Export functions for use in other scripts
export -f get_workspace_root
export -f get_agent_workspace
export -f ensure_agent_workspace
