#!/bin/bash
cd /root/hermes-dash/backend
export $(grep -v '^\s*#' .env | grep -v '^\s*$' | xargs)
source venv/bin/activate
exec uvicorn main:app --host 0.0.0.0 --port 8080
