#!/bin/bash

# REST API Broker Integration Test
# This script tests the basic functionality of the REST broker with docker-compose

set -e

BROKER_URL="http://localhost:3000"
TIMEOUT=30

echo "REST API Broker Integration Test"
echo "================================="

# Function to wait for service
wait_for_service() {
    local url=$1
    local timeout=$2
    local elapsed=0
    
    echo "Waiting for service at $url..."
    while [ $elapsed -lt $timeout ]; do
        if curl -s -f "$url/health" > /dev/null 2>&1; then
            echo "✓ Service is ready"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    echo "✗ Service failed to start within ${timeout}s"
    return 1
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    
    echo -n "Testing $method $endpoint... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BROKER_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BROKER_URL$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✓ (HTTP $status_code)"
        return 0
    else
        echo "✗ (Expected $expected_status, got $status_code)"
        echo "Response: $body"
        return 1
    fi
}

# Start docker-compose services
echo "Starting Docker services..."
cd "$(dirname "$0")/.."
docker-compose up -d rest-broker

# Wait for broker to be ready
if ! wait_for_service "$BROKER_URL" "$TIMEOUT"; then
    echo "Failed to start REST broker"
    docker-compose logs rest-broker
    docker-compose down
    exit 1
fi

echo ""
echo "Running tests..."
echo "----------------"

# Test 1: Root endpoint
test_endpoint "GET" "/" "" "200"

# Test 2: Health check
test_endpoint "GET" "/health" "" "200"

# Test 3: OpenAPI spec
test_endpoint "GET" "/openapi.json" "" "200"

# Test 4: List agents
test_endpoint "GET" "/agents" "" "200"

# Test 5: Submit a job
JOB_DATA='{"prompt":"Write a hello world function in Python","context":{},"options":{}}'
echo -n "Testing POST /agents/claude-code/jobs... "
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$JOB_DATA" \
    "$BROKER_URL/agents/claude-code/jobs")

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "202" ]; then
    echo "✓ (HTTP $status_code)"
    # Extract job ID from response
    JOB_ID=$(echo "$body" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$JOB_ID" ]; then
        echo "  Job ID: $JOB_ID"
        
        # Test 6: Get job status
        sleep 1
        test_endpoint "GET" "/agents/claude-code/jobs/$JOB_ID" "" "200"
        
        # Test 7: Cancel job
        test_endpoint "POST" "/agents/claude-code/jobs/$JOB_ID/cancel" "" "200"
    fi
else
    echo "✗ (Expected 202, got $status_code)"
    echo "Response: $body"
fi

# Test 8: Invalid agent
test_endpoint "POST" "/agents/invalid-agent/jobs" "$JOB_DATA" "404"

# Test 9: Metrics endpoint
test_endpoint "GET" "/metrics" "" "200"

echo ""
echo "Integration tests completed!"
echo ""

# Clean up
echo "Stopping Docker services..."
docker-compose down

echo "✓ All tests completed successfully"