package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	server := NewServer(ServerConfig{
		NodeID:              envOrDefault("AETHER_NODE_ID", "node-1"),
		ShardCount:          envIntOrDefault("AETHER_SHARD_COUNT", 64),
		ReplayBufferPerRoom: envIntOrDefault("AETHER_REPLAY_BUFFER", 1024),
		DefaultRoom:         "default",
		RegisterBuffer:      1000,
		UnregisterBuffer:    1000,
		BroadcastBuffer:     10000,
		PerClientQueue:      256,
		ReadLimitBytes:      1024,
		ReadTimeout:         60 * time.Second,
		WriteTimeout:        10 * time.Second,
		HeartbeatInterval:   30 * time.Second,
		BackpressurePolicy:  DropSlowClient,
	})

	if natsURLs := os.Getenv("NATS_URLS"); natsURLs != "" {
		policy := DefaultJetStreamPolicy()
		policy.RoomEventsStream = envOrDefault("AETHER_ROOM_EVENTS_STREAM", policy.RoomEventsStream)
		policy.RoomEventsSubject = envOrDefault("AETHER_ROOM_EVENTS_SUBJECT", policy.RoomEventsSubject)
		policy.CommandStream = envOrDefault("AETHER_VISUAL_COMMAND_STREAM", policy.CommandStream)
		policy.CommandSubject = envOrDefault("AETHER_VISUAL_COMMAND_SUBJECT", policy.CommandSubject)
		policy.DurableConsumer = envOrDefault("AETHER_VISUAL_COMMAND_CONSUMER", policy.DurableConsumer)
		policy.MaxAckPending = envIntOrDefault("AETHER_VISUAL_COMMAND_MAX_ACK_PENDING", policy.MaxAckPending)
		policy.Replicas = envIntOrDefault("AETHER_JETSTREAM_REPLICAS", policy.Replicas)

		bridge := NewJetStreamBridge(strings.Split(natsURLs, ","), policy)
		if err := bridge.Connect(); err != nil {
			log.Fatalf("jetstream connect failed: %v", err)
		}
		defer bridge.Close()

		server.WithBusPublisher(bridge)
		server.WithBusConsumer(bridge)
		if err := server.StartBusConsumer(context.Background()); err != nil {
			log.Fatalf("jetstream consumer failed: %v", err)
		}
	}

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		lastKnown, _ := strconv.ParseInt(r.URL.Query().Get("last_known_version"), 10, 64)
		server.HandleConnectionWithContract(conn, ReconnectRequest{
			SessionID:        r.URL.Query().Get("session_id"),
			RoomID:           r.URL.Query().Get("room_id"),
			LastKnownVersion: lastKnown,
		})
	})

	go server.Run()

	log.Println("AetherBus Tachyon WS server running on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

func envOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func envIntOrDefault(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		parsed, err := strconv.Atoi(val)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
