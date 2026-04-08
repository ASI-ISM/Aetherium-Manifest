package main

import "testing"

func TestNewServerDefaults(t *testing.T) {
	s := NewServer(ServerConfig{})

	if s.cfg.DefaultRoom != "default" {
		t.Fatalf("expected default room")
	}
	if cap(s.broadcast) != 10000 {
		t.Fatalf("expected broadcast cap 10000, got %d", cap(s.broadcast))
	}
	if s.cfg.ShardCount != 1 {
		t.Fatalf("expected shard count default 1")
	}
}

func TestBroadcastBackpressureUnregistersSlowClient(t *testing.T) {
	s := NewServer(ServerConfig{UnregisterBuffer: 2, PerClientQueue: 1})
	c := &Client{id: "c1", room: "r1", send: make(chan []byte, 1)}
	s.addClient(c)

	c.send <- []byte("queue-full")
	s.broadcastToRoom(Message{room: "r1", data: []byte("next")})

	select {
	case got := <-s.unregister:
		if got.id != "c1" {
			t.Fatalf("unexpected client: %s", got.id)
		}
	default:
		t.Fatalf("expected slow client to be unregistered")
	}
}

func TestStickySessionContractIsDeterministic(t *testing.T) {
	s := NewServer(ServerConfig{ShardCount: 64})

	first := s.AssignStickySession("sess-1", "room-alpha")
	second := s.AssignStickySession("sess-1", "room-alpha")

	if first.ShardID != second.ShardID {
		t.Fatalf("expected stable shard assignment")
	}
}

func TestReconnectPlanAndReplay(t *testing.T) {
	s := NewServer(ServerConfig{ShardCount: 32, ReplayBufferPerRoom: 16})
	_ = s.recordRoomEvent("room-1", []byte("v1"))
	_ = s.recordRoomEvent("room-1", []byte("v2"))
	_ = s.recordRoomEvent("room-1", []byte("v3"))

	plan := s.PlanReconnect(ReconnectRequest{SessionID: "sess-1", RoomID: "room-1", LastKnownVersion: 1})
	if !plan.ShouldResume {
		t.Fatalf("expected reconnect resume plan")
	}
	if plan.ReplayFromVersion != 1 || plan.LatestVersion != 3 {
		t.Fatalf("unexpected replay plan: %+v", plan)
	}

	c := &Client{id: "c1", room: "room-1", send: make(chan []byte, 4)}
	s.enqueueReplay(c, plan.ReplayFromVersion)

	msg1 := <-c.send
	msg2 := <-c.send
	if string(msg1) != "v2" || string(msg2) != "v3" {
		t.Fatalf("unexpected replay order: %s %s", string(msg1), string(msg2))
	}
}

func TestRoomIDFromSubject(t *testing.T) {
	room := roomIDFromSubject("visual.commands.ap-southeast-1.room-42")
	if room != "room-42" {
		t.Fatalf("unexpected room id: %s", room)
	}
}
