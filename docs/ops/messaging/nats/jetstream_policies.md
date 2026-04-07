# NATS / JetStream Messaging Policy

This document is the source of truth for Manifest-side JetStream stream and consumer naming.

## Streams

### `ROOM_EVENTS`
- subjects: `room.events.>`
- retention: `limits`
- storage: `file`
- purpose: durable fan-out history for room event publication and cross-node replay windows

### `VISUAL_COMMANDS`
- subjects: `visual.commands.>`
- retention: `limits`
- storage: `file`
- purpose: governor-approved visual command ingress for websocket fan-out nodes

## Consumer

### `WS_GATEWAY_FANOUT`
- bound stream: `VISUAL_COMMANDS`
- filter subject: `visual.commands.>`
- ack policy: `explicit`
- replay policy: `instant`
- deliver policy: `all`
- max ack pending: `1024`
- ack wait: `30s`

## Environment mapping

- `AETHER_ROOM_EVENTS_STREAM=ROOM_EVENTS`
- `AETHER_ROOM_EVENTS_SUBJECT=room.events.>`
- `AETHER_VISUAL_COMMAND_STREAM=VISUAL_COMMANDS`
- `AETHER_VISUAL_COMMAND_SUBJECT=visual.commands.>`
- `AETHER_VISUAL_COMMAND_CONSUMER=WS_GATEWAY_FANOUT`
- `AETHER_VISUAL_COMMAND_MAX_ACK_PENDING=1024`
- `AETHER_JETSTREAM_REPLICAS=1`

## Notes

- Stream/consumer names are intentionally stable because reconnect and replay contracts depend on them.
- Room websocket replay in `ws_gateway/` uses Redis Streams as the durable backend for multi-node resume.
- Tachyon Go nodes consume governor-approved commands through JetStream and publish room events to the room-events stream.
