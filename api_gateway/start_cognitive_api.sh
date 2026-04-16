#!/usr/bin/env bash
set -euo pipefail

export AGNS_ENVIRONMENT="${AGNS_ENVIRONMENT:-production}"
export UV_PROJECT_ENVIRONMENT="${UV_PROJECT_ENVIRONMENT:-/app/.venv}"

if [[ -n "${GOOGLE_API_KEY:-}" ]] && [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "Warning: GOOGLE_API_KEY is deprecated. Please migrate to GEMINI_API_KEY."
  export GEMINI_API_KEY="${GOOGLE_API_KEY}"
fi

if [[ -z "${OPENAI_API_KEY:-}" ]] && [[ -z "${ANTHROPIC_API_KEY:-}" ]] && [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "Error: ต้องตั้งค่าอย่างน้อยหนึ่ง API key"
  exit 1
fi

uv run uvicorn api_gateway.main:app \
  --host 0.0.0.0 \
  --port 8080 \
  --workers 4 \
  --log-level info
