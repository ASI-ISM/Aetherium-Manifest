#!/usr/bin/env bash
set -euo pipefail

# Requires kafka-topics.sh in PATH and connectivity to cluster.

kafka-topics.sh --create --topic intent-events \
  --partitions 24 --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=86400000 \
  --config cleanup.policy=delete

kafka-topics.sh --create --topic visual-contracts \
  --partitions 24 --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=172800000 \
  --config cleanup.policy=delete

kafka-topics.sh --create --topic telemetry-events \
  --partitions 48 --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --config compression.type=zstd

kafka-topics.sh --create --topic governor-audit-log \
  --partitions 12 --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=2592000000 \
  --config cleanup.policy=delete

cat <<'KEYS'
Recommended partition keys:
- visual-contracts  -> room_id
- intent-events     -> session_id
- telemetry-events  -> service_name
- governor-audit-log -> trace_id
KEYS
