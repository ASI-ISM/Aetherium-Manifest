#!/bin/bash
echo "Installing dependencies for api-gateway..."
pip install -r api_gateway/requirements.txt
echo "Starting api-gateway in the background..."
uvicorn api_gateway.main:app --host 0.0.0.0 --port 8080 --workers 4 &
echo "Starting frontend server in the foreground..."
python3 -m http.server 4173
