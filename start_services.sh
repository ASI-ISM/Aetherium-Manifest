#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

API_HOST="${API_HOST:-0.0.0.0}"
API_PORT="${API_PORT:-8080}"
WS_HOST="${WS_HOST:-0.0.0.0}"
WS_PORT="${WS_PORT:-8090}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-4173}"
API_WORKERS="${API_WORKERS:-2}"
START_WS_GATEWAY="${START_WS_GATEWAY:-1}"
LOG_DIR="${LOG_DIR:-${ROOT_DIR}/.logs}"

mkdir -p "${LOG_DIR}"

if [[ -n "${VIRTUAL_ENV:-}" ]]; then
  python -m pip install -r "${ROOT_DIR}/api_gateway/requirements.txt" -r "${ROOT_DIR}/ws_gateway/requirements.txt"
else
  echo "WARNING: no virtualenv active. Installing dependencies into current interpreter." >&2
  python3 -m pip install -r "${ROOT_DIR}/api_gateway/requirements.txt" -r "${ROOT_DIR}/ws_gateway/requirements.txt"
fi

echo "Starting api-gateway on ${API_HOST}:${API_PORT} (${API_WORKERS} workers)"
uvicorn api_gateway.main:app \
  --host "${API_HOST}" \
  --port "${API_PORT}" \
  --workers "${API_WORKERS}" \
  > "${LOG_DIR}/api_gateway.log" 2>&1 &
API_PID=$!

WS_PID=""
if [[ "${START_WS_GATEWAY}" == "1" ]]; then
  echo "Starting ws-gateway on ${WS_HOST}:${WS_PORT}"
  uvicorn ws_gateway.main:app \
    --host "${WS_HOST}" \
    --port "${WS_PORT}" \
    > "${LOG_DIR}/ws_gateway.log" 2>&1 &
  WS_PID=$!
fi

cleanup() {
  echo "Shutting down services..."
  kill "${API_PID}" 2>/dev/null || true
  if [[ -n "${WS_PID}" ]]; then
    kill "${WS_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting frontend static server on ${FRONTEND_HOST}:${FRONTEND_PORT}"
python3 -m http.server "${FRONTEND_PORT}" --bind "${FRONTEND_HOST}"
