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
    echo "  --claude N    - Scale Claude Code to N instances"
    echo "  --codex N     - Scale OpenAI Codex to N instances"
    echo "  --aider N     - Scale Aider to N instances"
    echo "  --opencode N  - Scale OpenCode to N instances"
    echo ""
    echo "Examples:"
    echo "  $0 dev                           # Start development setup"
    echo "  $0 custom --codex 2 --aider 1   # 2 Codex, 1 Aider"
    echo "  $0 stop                          # Stop all agents"
    echo "  $0 status                        # Show running agents"
    echo ""
}

# Function to scale services
scale_services() {
    local claude=$1
    local codex=$2
    local aider=$3
    local opencode=$4
    
    print_info "Scaling agents:"
    echo "  Claude Code: $claude instance(s)"
    echo "  OpenAI Codex: $codex instance(s)"
    echo "  Aider: $aider instance(s)"
    echo "  OpenCode: $opencode instance(s)"
    echo ""
    
    # Build the docker-compose scale command
    local scale_cmd="docker-compose up -d"
    scale_cmd="$scale_cmd --scale claude-code=$claude"
    scale_cmd="$scale_cmd --scale openai-codex=$codex"
    scale_cmd="$scale_cmd --scale aider=$aider"
    scale_cmd="$scale_cmd --scale opencode=$opencode"
    
    # Ensure base services are running
    print_info "Starting base services..."
    docker-compose up -d litellm-proxy base
    
    # Execute scaling
    print_info "Scaling agent services..."
    eval $scale_cmd
    
    print_success "Agent scaling complete!"
    echo ""
    show_status
}

# Function to show current status
show_status() {
    print_info "Current agent status:"
    echo ""
    echo "Service        | Instances | Container Names"
    echo "---------------|-----------|----------------------------------"
    
    # Check each service
    for service in claude-code openai-codex aider opencode; do
        count=$(docker-compose ps -q $service | wc -l | tr -d ' ')
        if [ "$count" -gt 0 ]; then
            containers=$(docker-compose ps $service | grep $service | awk '{print $1}' | tr '\n' ', ' | sed 's/,$//')
            printf "%-14s | %-9s | %s\n" "$service" "$count" "$containers"
        else
            printf "%-14s | %-9s | %s\n" "$service" "0" "none"
        fi
    done
    
    echo ""
    
    # Show LiteLLM proxy status
    if docker-compose ps litellm-proxy | grep -q "Up"; then
        print_success "LiteLLM Proxy is running on port 4000"
    else
        print_warning "LiteLLM Proxy is not running"
    fi
}

# Main script logic
case "${1:-}" in
    dev)
        print_info "Starting development setup..."
        scale_services 1 1 1 1
        ;;
    
    team)
        print_info "Starting team setup..."
        scale_services 1 2 2 1
        ;;
    
    heavy)
        print_info "Starting heavy workload setup..."
        scale_services 2 3 3 2
        ;;
    
    minimal)
        print_info "Starting minimal setup..."
        scale_services 0 0 1 0
        ;;
    
    stop)
        print_info "Stopping all agents..."
        scale_services 0 0 0 0
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
                *)
                    print_error "Unknown option: $1"
                    show_usage
                    exit 1
                    ;;
            esac
        done
        
        print_info "Starting custom setup..."
        scale_services $claude $codex $aider $opencode
        ;;
    
    *)
        show_usage
        exit 0
        ;;
esac