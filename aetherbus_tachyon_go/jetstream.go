package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
)

type JetStreamBridge struct {
	urls          []string
	publishPrefix string
	consumeFilter string

	nc *nats.Conn
	js nats.JetStreamContext
}

func NewJetStreamBridge(urls []string, publishPrefix, consumeFilter string) *JetStreamBridge {
	if publishPrefix == "" {
		publishPrefix = "room.events"
	}
	if consumeFilter == "" {
		consumeFilter = "visual.commands.>"
	}
	return &JetStreamBridge{urls: urls, publishPrefix: publishPrefix, consumeFilter: consumeFilter}
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
	return nil
}

func (j *JetStreamBridge) Publish(room string, payload []byte) error {
	if j.js == nil {
		return fmt.Errorf("jetstream is not connected")
	}
	subject := fmt.Sprintf("%s.%s", j.publishPrefix, room)
	_, err := j.js.Publish(subject, payload)
	return err
}

func (j *JetStreamBridge) Start(ctx context.Context, handler func(room string, payload []byte)) error {
	if j.js == nil {
		return fmt.Errorf("jetstream is not connected")
	}

	sub, err := j.js.SubscribeSync(j.consumeFilter, nats.Durable("WS_GATEWAY_FANOUT"), nats.ManualAck())
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
