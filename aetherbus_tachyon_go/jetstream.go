package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
)

type JetStreamPolicy struct {
	RoomEventsStream  string
	RoomEventsSubject string
	CommandStream     string
	CommandSubject    string
	DurableConsumer   string
	AckWait           time.Duration
	MaxAckPending     int
	Replicas          int
	ReplayWindow      time.Duration
}

type JetStreamBridge struct {
	urls   []string
	policy JetStreamPolicy

	nc *nats.Conn
	js nats.JetStreamContext
}

func DefaultJetStreamPolicy() JetStreamPolicy {
	return JetStreamPolicy{
		RoomEventsStream:  "ROOM_EVENTS",
		RoomEventsSubject: "room.events.>",
		CommandStream:     "VISUAL_COMMANDS",
		CommandSubject:    "visual.commands.>",
		DurableConsumer:   "WS_GATEWAY_FANOUT",
		AckWait:           30 * time.Second,
		MaxAckPending:     1024,
		Replicas:          1,
		ReplayWindow:      24 * time.Hour,
	}
}

func NewJetStreamBridge(urls []string, policy JetStreamPolicy) *JetStreamBridge {
	if policy.RoomEventsStream == "" {
		policy = DefaultJetStreamPolicy()
	}
	return &JetStreamBridge{urls: urls, policy: policy}
}

func (j *JetStreamBridge) Connect() error {
	nc, err := nats.Connect(strings.Join(j.urls, ","), nats.Name("aetherbus-tachyon-go"))
	if err != nil {
		return err
	}
	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		return err
	}
	j.nc = nc
	j.js = js
	return j.ensurePolicyObjects()
}

func (j *JetStreamBridge) ensurePolicyObjects() error {
	if j.js == nil {
		return fmt.Errorf("jetstream is not connected")
	}

	streamCfgs := []*nats.StreamConfig{
		{
			Name:      j.policy.RoomEventsStream,
			Subjects:  []string{j.policy.RoomEventsSubject},
			Retention: nats.LimitsPolicy,
			Storage:   nats.FileStorage,
			Replicas:  j.policy.Replicas,
			MaxAge:    j.policy.ReplayWindow,
		},
		{
			Name:      j.policy.CommandStream,
			Subjects:  []string{j.policy.CommandSubject},
			Retention: nats.LimitsPolicy,
			Storage:   nats.FileStorage,
			Replicas:  j.policy.Replicas,
			MaxAge:    j.policy.ReplayWindow,
		},
		}

	for _, cfg := range streamCfgs {
		if _, err := j.js.AddStream(cfg); err != nil && !strings.Contains(err.Error(), "stream name already in use") {
			return err
		}
	}

	consumerCfg := &nats.ConsumerConfig{
		Durable:       j.policy.DurableConsumer,
		AckPolicy:     nats.AckExplicitPolicy,
		AckWait:       j.policy.AckWait,
		MaxAckPending: j.policy.MaxAckPending,
		ReplayPolicy:  nats.ReplayInstantPolicy,
		DeliverPolicy: nats.DeliverAllPolicy,
		FilterSubject: j.policy.CommandSubject,
		DeliverGroup:  j.policy.DurableConsumer,
	}

	_, err := j.js.AddConsumer(j.policy.CommandStream, consumerCfg)
	if err != nil && !strings.Contains(err.Error(), "consumer name already in use") {
		return err
	}
	return nil
}

func (j *JetStreamBridge) Publish(room string, payload []byte) error {
	if j.js == nil {
		return fmt.Errorf("jetstream is not connected")
	}
	subject := fmt.Sprintf("room.events.%s", room)
	_, err := j.js.Publish(subject, payload)
	return err
}

func (j *JetStreamBridge) Start(ctx context.Context, handler func(room string, payload []byte)) error {
	if j.js == nil {
		return fmt.Errorf("jetstream is not connected")
	}

	sub, err := j.js.QueueSubscribeSync(
		j.policy.CommandSubject,
		j.policy.DurableConsumer,
		nats.BindStream(j.policy.CommandStream),
		nats.Durable(j.policy.DurableConsumer),
		nats.ManualAck(),
	)
	if err != nil {
		return err
	}

	go func() {
		defer sub.Unsubscribe()
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			msg, pullErr := sub.NextMsg(500 * time.Millisecond)
			if pullErr != nil {
				continue
			}

			room := roomIDFromSubject(msg.Subject)
			handler(room, msg.Data)
			_ = msg.Ack()
		}
	}()

	return nil
}

func (j *JetStreamBridge) Close() {
	if j.nc != nil {
		j.nc.Close()
	}
}
