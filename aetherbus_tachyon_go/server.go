package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type BackpressurePolicy string

const (
	DropSlowClient BackpressurePolicy = "drop_slow_client"
)

type ServerConfig struct {
	NodeID              string
	ShardCount          int
	ReplayBufferPerRoom int

	DefaultRoom        string
	RegisterBuffer     int
	UnregisterBuffer   int
	BroadcastBuffer    int
	PerClientQueue     int
	ReadLimitBytes     int64
	ReadTimeout        time.Duration
	WriteTimeout       time.Duration
	HeartbeatInterval  time.Duration
	BackpressurePolicy BackpressurePolicy
}

type Client struct {
	id        string
	sessionID string
	shardID   int
	room      string
	conn      *websocket.Conn
	send      chan []byte
	lastSeen  time.Time
}

type Message struct {
	room string
	data []byte
}

type RoomEvent struct {
	Version int64
	Data    []byte
}

type StickySessionContract struct {
	SessionID string
	RoomID    string
	ShardID   int
}

type ReconnectRequest struct {
	SessionID        string
	RoomID           string
	LastKnownVersion int64
}

type ReconnectPlan struct {
	ShardID           int
	ShouldResume      bool
	ReplayFromVersion int64
	LatestVersion     int64
}

type BusPublisher interface {
	Publish(room string, payload []byte) error
}

type BusConsumer interface {
	Start(ctx context.Context, handler func(room string, payload []byte)) error
}

type Server struct {
	clients    map[string]*Client
	rooms      map[string]map[string]*Client
	register   chan *Client
	unregister chan *Client
	broadcast  chan Message

	roomVersions   map[string]int64
	roomHistory    map[string][]RoomEvent
	stickySessions map[string]StickySessionContract

	cfg          ServerConfig
	busPublisher BusPublisher
	busConsumer  BusConsumer
	mu           sync.RWMutex
}

func NewServer(cfg ServerConfig) *Server {
	if cfg.NodeID == "" {
		cfg.NodeID = "node-1"
	}
	if cfg.ShardCount <= 0 {
		cfg.ShardCount = 1
	}
	if cfg.ReplayBufferPerRoom <= 0 {
		cfg.ReplayBufferPerRoom = 512
	}
	if cfg.DefaultRoom == "" {
		cfg.DefaultRoom = "default"
	}
	if cfg.RegisterBuffer <= 0 {
		cfg.RegisterBuffer = 1000
	}
	if cfg.UnregisterBuffer <= 0 {
		cfg.UnregisterBuffer = 1000
	}
	if cfg.BroadcastBuffer <= 0 {
		cfg.BroadcastBuffer = 10000
	}
	if cfg.PerClientQueue <= 0 {
		cfg.PerClientQueue = 256
	}
	if cfg.ReadLimitBytes <= 0 {
		cfg.ReadLimitBytes = 1024
	}
	if cfg.ReadTimeout <= 0 {
		cfg.ReadTimeout = 60 * time.Second
	}
	if cfg.WriteTimeout <= 0 {
		cfg.WriteTimeout = 10 * time.Second
	}
	if cfg.HeartbeatInterval <= 0 {
		cfg.HeartbeatInterval = 30 * time.Second
	}
	if cfg.BackpressurePolicy == "" {
		cfg.BackpressurePolicy = DropSlowClient
	}

	return &Server{
		clients:        make(map[string]*Client),
		rooms:          make(map[string]map[string]*Client),
		register:       make(chan *Client, cfg.RegisterBuffer),
		unregister:     make(chan *Client, cfg.UnregisterBuffer),
		broadcast:      make(chan Message, cfg.BroadcastBuffer),
		roomVersions:   make(map[string]int64),
		roomHistory:    make(map[string][]RoomEvent),
		stickySessions: make(map[string]StickySessionContract),
		cfg:            cfg,
	}
}

func (s *Server) WithBusPublisher(publisher BusPublisher) {
	s.busPublisher = publisher
}

func (s *Server) WithBusConsumer(consumer BusConsumer) {
	s.busConsumer = consumer
}

func (s *Server) StartBusConsumer(ctx context.Context) error {
	if s.busConsumer == nil {
		return nil
	}
	return s.busConsumer.Start(ctx, func(room string, payload []byte) {
		s.HandleAIEvent(payload, room)
	})
}

func (s *Server) Run() {
	for {
		select {
		case client := <-s.register:
			s.addClient(client)
		case client := <-s.unregister:
			s.removeClient(client)
		case msg := <-s.broadcast:
			s.broadcastToRoom(msg)
			s.PublishToBus(msg)
		}
	}
}

func (s *Server) HandleConnection(conn *websocket.Conn) {
	s.HandleConnectionWithContract(conn, ReconnectRequest{})
}

func (s *Server) HandleConnectionWithContract(conn *websocket.Conn, req ReconnectRequest) {
	roomID := req.RoomID
	if roomID == "" {
		roomID = s.cfg.DefaultRoom
	}
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = generateID()
	}

	sticky := s.AssignStickySession(sessionID, roomID)
	plan := s.PlanReconnect(ReconnectRequest{
		SessionID:        sessionID,
		RoomID:           roomID,
		LastKnownVersion: req.LastKnownVersion,
	})

	client := &Client{
		id:        generateID(),
		sessionID: sessionID,
		shardID:   sticky.ShardID,
		room:      roomID,
		conn:      conn,
		send:      make(chan []byte, s.cfg.PerClientQueue),
		lastSeen:  time.Now(),
	}

	s.register <- client
	if plan.ShouldResume {
		s.enqueueReplay(client, plan.ReplayFromVersion)
	}

	go s.readPump(client)
	go s.writePump(client)
}

func (s *Server) AssignStickySession(sessionID, roomID string) StickySessionContract {
	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.stickySessions[sessionID]; ok && existing.RoomID == roomID {
		return existing
	}

	assignment := StickySessionContract{
		SessionID: sessionID,
		RoomID:    roomID,
		ShardID:   shardForRoom(roomID, s.cfg.ShardCount),
	}
	s.stickySessions[sessionID] = assignment
	return assignment
}

func (s *Server) PlanReconnect(req ReconnectRequest) ReconnectPlan {
	roomID := req.RoomID
	if roomID == "" {
		roomID = s.cfg.DefaultRoom
	}
	shardID := shardForRoom(roomID, s.cfg.ShardCount)

	s.mu.RLock()
	latest := s.roomVersions[roomID]
	s.mu.RUnlock()

	if req.LastKnownVersion <= 0 || req.LastKnownVersion >= latest {
		return ReconnectPlan{ShardID: shardID, LatestVersion: latest}
	}

	return ReconnectPlan{
		ShardID:           shardID,
		ShouldResume:      true,
		ReplayFromVersion: req.LastKnownVersion,
		LatestVersion:     latest,
	}
}

func (s *Server) enqueueReplay(client *Client, replayFromVersion int64) {
	events := s.getReplayEvents(client.room, replayFromVersion)
	for _, event := range events {
		select {
		case client.send <- event.Data:
		default:
			return
		}
	}
}

func (s *Server) getReplayEvents(room string, replayFromVersion int64) []RoomEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := s.roomHistory[room]
	if len(events) == 0 {
		return nil
	}

	out := make([]RoomEvent, 0, len(events))
	for _, event := range events {
		if event.Version > replayFromVersion {
			out = append(out, event)
		}
	}
	return out
}

func (s *Server) readPump(c *Client) {
	defer func() {
		s.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(s.cfg.ReadLimitBytes)
	_ = c.conn.SetReadDeadline(time.Now().Add(s.cfg.ReadTimeout))
	c.conn.SetPongHandler(func(_ string) error {
		c.lastSeen = time.Now()
		return c.conn.SetReadDeadline(time.Now().Add(s.cfg.ReadTimeout))
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		c.lastSeen = time.Now()
		s.broadcast <- Message{room: c.room, data: message}
	}
}

func (s *Server) writePump(c *Client) {
	ticker := time.NewTicker(s.cfg.HeartbeatInterval)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(s.cfg.WriteTimeout))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(s.cfg.WriteTimeout))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (s *Server) addClient(c *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.clients[c.id] = c
	if _, ok := s.rooms[c.room]; !ok {
		s.rooms[c.room] = make(map[string]*Client)
	}
	s.rooms[c.room][c.id] = c
}

func (s *Server) removeClient(c *Client) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.clients[c.id]; ok {
		delete(s.clients, c.id)
		if room, ok := s.rooms[existing.room]; ok {
			delete(room, c.id)
			if len(room) == 0 {
				delete(s.rooms, existing.room)
			}
		}
		close(existing.send)
	}
}

func (s *Server) broadcastToRoom(msg Message) {
	version := s.recordRoomEvent(msg.room, msg.data)
	_ = version

	s.mu.RLock()
	clients := s.rooms[msg.room]
	targets := make([]*Client, 0, len(clients))
	for _, c := range clients {
		targets = append(targets, c)
	}
	s.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- msg.data:
		default:
			if s.cfg.BackpressurePolicy == DropSlowClient {
				select {
				case s.unregister <- c:
				default:
				}
			}
		}
	}
}

func (s *Server) recordRoomEvent(room string, payload []byte) int64 {
	s.mu.Lock()
	defer s.mu.Unlock()

	nextVersion := s.roomVersions[room] + 1
	s.roomVersions[room] = nextVersion

	copied := make([]byte, len(payload))
	copy(copied, payload)
	s.roomHistory[room] = append(s.roomHistory[room], RoomEvent{Version: nextVersion, Data: copied})

	if len(s.roomHistory[room]) > s.cfg.ReplayBufferPerRoom {
		s.roomHistory[room] = s.roomHistory[room][len(s.roomHistory[room])-s.cfg.ReplayBufferPerRoom:]
	}
	return nextVersion
}

func (s *Server) PublishToBus(msg Message) {
	if s.busPublisher == nil {
		return
	}
	_ = s.busPublisher.Publish(msg.room, msg.data)
}

func (s *Server) HandleAIEvent(event []byte, room string) {
	if room == "" {
		room = s.cfg.DefaultRoom
	}
	s.broadcast <- Message{room: room, data: event}
}

func shardForRoom(room string, shardCount int) int {
	if shardCount <= 0 {
		return 0
	}
	digest := sha256.Sum256([]byte(room))
	value, _ := strconv.ParseUint(hex.EncodeToString(digest[:8]), 16, 64)
	return int(value % uint64(shardCount))
}

func roomIDFromSubject(subject string) string {
	tokens := strings.Split(subject, ".")
	if len(tokens) == 0 {
		return ""
	}
	return tokens[len(tokens)-1]
}

func generateID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(buf)
}
