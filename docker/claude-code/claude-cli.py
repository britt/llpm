#!/usr/bin/env python3
import sys
import json
import os
import argparse
import requests

def main():
    parser = argparse.ArgumentParser(description='Claude CLI')
    parser.add_argument('--model', type=str, help='Model to use')
    parser.add_argument('input', nargs='?', type=str, help='Input prompt')
    
    args = parser.parse_args()
    
    # Read from stdin if no input provided
    if args.input:
        prompt = args.input
    else:
        prompt = sys.stdin.read().strip()
    
    # Get model from args or environment
    model = args.model or os.environ.get('CLAUDE_MODEL', 'claude-3-5-sonnet-20241022')
    
    # Get API configuration
    api_base = os.environ.get('ANTHROPIC_BASE_URL', 'http://litellm-proxy:4000')
    api_key = os.environ.get('LITELLM_MASTER_KEY', os.environ.get('ANTHROPIC_API_KEY', 'sk-1234'))
    
    # Make request to LiteLLM
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    data = {
        'model': model,
        'messages': [{'role': 'user', 'content': prompt}]
    }
    
    try:
        response = requests.post(
            f'{api_base}/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=120
        )
        response.raise_for_status()
        result = response.json()
        
        # Extract and print the response
        if 'choices' in result and len(result['choices']) > 0:
            content = result['choices'][0]['message']['content']
            print(content)
        else:
            print(json.dumps(result), file=sys.stderr)
            sys.exit(1)
            
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyError as e:
        print(f"Unexpected response format: {e}", file=sys.stderr)
        print(json.dumps(result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()