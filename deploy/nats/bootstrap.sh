#!/bin/bash
echo "Initializing NATS JetStream for Aetherium..."
# Check if nats CLI is installed
if ! command -v nats &> /dev/null
then
    echo "nats CLI not found. Please install it to run this script."
    echo "nats CLI not found. Please install it to run this script."
    exit 1
else
    nats stream add INTENT_EVENTS --subjects "intent.events.>" --storage file --retention limits --max-age 24h --max-msg-size 1MB --replicas 3
    nats stream add VISUAL_COMMANDS --subjects "visual.commands.>" --storage file --retention interest --max-age 4h --max-msg-size 512KB --replicas 3
    nats stream add ROOM_EVENTS --subjects "room.events.>" --storage file --retention limits --max-age 12h --replicas 3
    nats stream add TELEMETRY_STREAM --subjects "telemetry.stream.>" --storage file --retention limits --max-age 72h --max-msg-size 256KB --replicas 3
    echo "NATS JetStream initialization complete."
fi
