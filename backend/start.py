#!/usr/bin/env python3
"""Load .env and start uvicorn."""
import os
import sys

# Read .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            key, _, val = line.partition('=')
            os.environ[key.strip()] = val.strip().strip('"\'')

# Start uvicorn
import uvicorn
sys.argv = ['uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8080']
uvicorn.run('main:app', host='0.0.0.0', port=8080)
