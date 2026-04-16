package main

import (
	"errors"
	"hash/fnv"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 30 * time.Second
	maxMessageSize = 1024
	sendBufferSize = 256
)

type Message struct {
	Room string
	Data []byte
}

type Client struct {
	id   string
	room string
	conn *websocket.Conn
	send chan []byte

	lastSeen atomic.Int64
}

type BusPublisher interface {
	Publish(msg Message) error
}

type RoomShard struct {
	mu    sync.RWMutex
	rooms map[string]map[string]*Client
}

type Server struct {
	clientsMu sync.RWMutex
	clients   map[string]*Client

	shards []RoomShard

	register   chan *Client
	unregister chan *Client
	broadcast  chan Message

	quit      chan struct{}
	closeOnce sync.Once

	publisher BusPublisher
}

func NewServer(cfg Config) *Server {
	if cfg.Shards <= 0 {
		cfg.Shards = 32
	}
	shards := make([]RoomShard, cfg.Shards)

	return &Server{
		clients:    make(map[string]*Client),
		shards:     shards,
		register:   make(chan *Client, 1_000),
		unregister: make(chan *Client, 1_000),
		broadcast:  make(chan Message, 10_000),
		quit:       make(chan struct{}),
	}
}

func (s *Server) SetPublisher(publisher BusPublisher) {
	s.publisher = publisher
}

func (s *Server) Run() {
	for {
		select {
		case <-s.quit:
			return
		case client := <-s.register:
			s.addClient(client)
		case client := <-s.unregister:
			s.removeClient(client)
		case msg := <-s.broadcast:
			s.broadcastToRoom(msg)
			if err := s.PublishToBus(msg); err != nil {
				log.Printf("event bus publish error: %v", err)
			}
		}
	}
}

func (s *Server) Stop() {
	s.closeOnce.Do(func() {
		close(s.quit)
		s.clientsMu.Lock()
		defer s.clientsMu.Unlock()
		for _, client := range s.clients {
			close(client.send)
			_ = client.conn.Close()
		}
	})
}

func (s *Server) HandleConnection(conn *websocket.Conn, room string) {
	client := &Client{
		id:   generateID(),
		room: room,
		conn: conn,
		send: make(chan []byte, sendBufferSize),
	}
	client.lastSeen.Store(time.Now().Unix())

	s.register <- client

	go s.readPump(client)
	go s.writePump(client)
}

func (s *Server) readPump(c *Client) {
	defer func() {
		s.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(_ string) error {
		c.lastSeen.Store(time.Now().Unix())
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		c.lastSeen.Store(time.Now().Unix())
		s.broadcast <- Message{Room: c.room, Data: message}
	}
}

func (s *Server) writePump(c *Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (s *Server) addClient(c *Client) {
	s.clientsMu.Lock()
	s.clients[c.id] = c
	s.clientsMu.Unlock()

	shard := s.shardForRoom(c.room)
	shard.mu.Lock()
	if _, ok := shard.rooms[c.room]; !ok {
		shard.rooms[c.room] = make(map[string]*Client)
	}
	shard.rooms[c.room][c.id] = c
	shard.mu.Unlock()
}

func (s *Server) removeClient(c *Client) {
	s.clientsMu.Lock()
	if _, exists := s.clients[c.id]; !exists {
		s.clientsMu.Unlock()
		return
	}
	delete(s.clients, c.id)
	s.clientsMu.Unlock()

	shard := s.shardForRoom(c.room)
	shard.mu.Lock()
	if roomClients, ok := shard.rooms[c.room]; ok {
		delete(roomClients, c.id)
		if len(roomClients) == 0 {
			delete(shard.rooms, c.room)
		}
	}
	shard.mu.Unlock()

	c.close()
}

func (s *Server) broadcastToRoom(msg Message) {
	shard := s.shardForRoom(msg.Room)

	shard.mu.RLock()
	roomClients, ok := shard.rooms[msg.Room]
	if !ok || len(roomClients) == 0 {
		shard.mu.RUnlock()
		return
	}

	clients := make([]*Client, 0, len(roomClients))
	for _, client := range roomClients {
		clients = append(clients, client)
	}
	shard.mu.RUnlock()

	for _, client := range clients {
		select {
		case client.send <- msg.Data:
		default:
			// backpressure policy: disconnect slow consumer
			_ = client.conn.Close()
		}
	}
}

func (s *Server) PublishToBus(msg Message) error {
	if s.publisher == nil {
		return nil
	}
	return s.publisher.Publish(msg)
}

func (s *Server) HandleAIEvent(event []byte, room string) error {
	select {
	case s.broadcast <- Message{Room: room, Data: event}:
		return nil
	default:
		return errors.New("broadcast queue is saturated")
	}
}

func (s *Server) shardForRoom(room string) *RoomShard {
	h := fnv.New32a()
	_, _ = h.Write([]byte(room))
	index := h.Sum32() % uint32(len(s.shards))
	return &s.shards[index]
}
