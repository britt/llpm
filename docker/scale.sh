#!/bin/bash

# LLPM Docker Agent Scaling Script
# Usage: ./scale.sh [preset|custom options]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "LLPM Docker Agent Scaling Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  dev        - Development setup (1 of each agent)"
    echo "  team       - Team setup (2 codex, 2 aider, 1 claude, 1 opencode)"
    echo "  heavy      - Heavy workload (3 codex, 3 aider, 2 claude, 2 opencode)"
    echo "  minimal    - Minimal setup (1 aider only)"
    echo "  custom     - Custom scaling (specify with --scale flags)"
    echo "  stop       - Stop all agents (scale to 0)"
    echo "  status     - Show current agent status"
    echo ""
    echo "Custom scaling options:"
    echo "  --claude N      - Scale Claude Code to N instances"
    echo "  --codex N       - Scale OpenAI Codex to N instances"
    echo "  --aider N       - Scale Aider to N instances"
    echo "  --opencode N    - Scale OpenCode to N instances"
    echo ""
    echo "Authentication options:"
    echo "  --auth-type TYPE - Authentication type: api_key (default) or subscription"
    echo ""
    echo "Examples:"
    echo "  $0 dev                                    # Start development setup (default: api_key auth)"
    echo "  $0 dev --auth-type subscription          # Development with subscription auth"
    echo "  $0 custom --codex 2 --aider 1            # 2 Codex, 1 Aider (default: api_key)"
    echo "  $0 custom --codex 2 --auth-type subscription  # Custom with subscription auth"
    echo "  $0 stop                                   # Stop all agents"
    echo "  $0 status                                 # Show running agents"
    echo ""
}

# Function to cleanup all existing agent containers
cleanup_all_agent_containers() {
    print_info "Cleaning up all existing agent containers..."

    # Get all agent containers using regex pattern match
    local all_agent_containers=$(docker ps -aq | xargs docker inspect --format='{{.Name}} {{.Id}}' 2>/dev/null | grep -E 'docker-(claude-code|openai-codex|aider|opencode)-' | awk '{print $2}' || true)

    if [ -n "$all_agent_containers" ]; then
        echo "  Found containers to remove:"
        docker ps -a --filter id="$all_agent_containers" --format "    {{.Names}} ({{.ID}})" 2>/dev/null || true
        echo "  Forcing removal..."
        docker rm -f $all_agent_containers 2>&1 | sed 's/^/    /' || true
        print_success "Removed $(echo "$all_agent_containers" | wc -w | tr -d ' ') container(s)"
    else
        echo "  No agent containers found"
    fi

    echo ""
}

# Function to scale services
scale_services() {
    local claude=$1
    local codex=$2
    local aider=$3
    local opencode=$4
    local auth_type=${5:-api_key}

    print_info "Scaling agents:"
    echo "  Claude Code: $claude instance(s)"
    echo "  OpenAI Codex: $codex instance(s)"
    echo "  Aider: $aider instance(s)"
    echo "  OpenCode: $opencode instance(s)"
    echo "  Auth Type: $auth_type"
    echo ""

    # Export auth type for docker-compose
    export AGENT_AUTH_TYPE=$auth_type

    # Cleanup existing agent containers BEFORE generating new config
    cleanup_all_agent_containers

    # Generate docker-compose.override.yml with per-agent workspaces
    print_info "Generating per-agent workspace configuration..."
    ./generate-compose-override.sh $claude $codex $aider $opencode $auth_type

    # Cleanup again AFTER generating new config to catch any containers
    # that were created in a failed previous attempt
    cleanup_all_agent_containers

    # Ensure base services are running
    print_info "Starting base services..."
    docker-compose up -d litellm-proxy postgres

    # Start agent services using the generated override
    # Use --scale to prevent base agent services from starting (only numbered instances should run)
    print_info "Starting agent services with isolated workspaces..."
    docker-compose up -d --scale claude-code=0 --scale openai-codex=0 --scale aider=0 --scale opencode=0

    print_success "Agent scaling complete!"
    echo ""
    show_status
}

# Function to show current status
show_status() {
    print_info "Current agent status:"
    echo ""
    echo "Agent Type     | Running | Container Names"
    echo "---------------|---------|----------------------------------"

    # Check each agent type by looking for running containers
    for agent_type in "claude-code" "openai-codex" "aider" "opencode"; do
        containers=$(docker ps --filter "name=docker-${agent_type}-" --format "{{.Names}}" 2>/dev/null | sort)

        if [ -n "$containers" ]; then
            count=$(echo "$containers" | wc -l | tr -d ' ')
            container_list=$(echo "$containers" | tr '\n' ', ' | sed 's/,$//')
            printf "%-14s | %-7s | %s\n" "$agent_type" "$count" "$container_list"
        else
            printf "%-14s | %-7s | %s\n" "$agent_type" "0" "none"
        fi
    done

    echo ""

    # Show LiteLLM proxy status
    if docker ps --filter "name=litellm-proxy" --filter "status=running" | grep -q "litellm-proxy"; then
        print_success "LiteLLM Proxy is running on port 4000"
    else
        print_warning "LiteLLM Proxy is not running"
    fi
}

# Parse auth type option from all commands
auth_type="api_key"
parse_auth_type() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auth-type)
                auth_type="$2"
                if [[ "$auth_type" != "api_key" && "$auth_type" != "subscription" ]]; then
                    print_error "Invalid auth-type: $auth_type (must be 'api_key' or 'subscription')"
                    exit 1
                fi
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
}

# Main script logic
case "${1:-}" in
    dev)
        shift
        parse_auth_type "$@"
        print_info "Starting development setup..."
        scale_services 1 1 1 1 "$auth_type"
        ;;

    team)
        shift
        parse_auth_type "$@"
        print_info "Starting team setup..."
        scale_services 1 2 2 1 "$auth_type"
        ;;

    heavy)
        shift
        parse_auth_type "$@"
        print_info "Starting heavy workload setup..."
        scale_services 2 3 3 2 "$auth_type"
        ;;

    minimal)
        shift
        parse_auth_type "$@"
        print_info "Starting minimal setup..."
        scale_services 0 0 1 0 "$auth_type"
        ;;

    stop)
        print_info "Stopping all agents..."
        scale_services 0 0 0 0 "api_key"
        ;;

    status)
        show_status
        ;;

    custom)
        # Parse custom scaling options
        shift
        claude=0
        codex=0
        aider=0
        opencode=0
        auth_type="api_key"

        while [[ $# -gt 0 ]]; do
            case $1 in
                --claude)
                    claude="$2"
                    shift 2
                    ;;
                --codex)
                    codex="$2"
                    shift 2
                    ;;
                --aider)
                    aider="$2"
                    shift 2
                    ;;
                --opencode)
                    opencode="$2"
                    shift 2
                    ;;
                --auth-type)
                    auth_type="$2"
                    if [[ "$auth_type" != "api_key" && "$auth_type" != "subscription" ]]; then
                        print_error "Invalid auth-type: $auth_type (must be 'api_key' or 'subscription')"
                        exit 1
                    fi
                    shift 2
                    ;;
                *)
                    print_error "Unknown option: $1"
                    show_usage
                    exit 1
                    ;;
            esac
        done

        print_info "Starting custom setup..."
        scale_services $claude $codex $aider $opencode "$auth_type"
        ;;

    *)
        show_usage
        exit 0
        ;;
esac