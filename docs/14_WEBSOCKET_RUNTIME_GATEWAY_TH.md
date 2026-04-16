# WebSocket Runtime Gateway (Go) สำหรับโหลดสูง

เอกสารนี้เพิ่ม utility สาธารณะ `ws_gateway/` สำหรับ real-time fanout โดยออกแบบให้รองรับระดับ ~50k connections ต่อ node (ขึ้นกับเครื่องและ tuning จริง)

## Design key

- ใช้ Go netpoll (epoll/kqueue ผ่าน Go runtime) + goroutine model
- 1 connection = 1 reader goroutine + 1 writer goroutine
- มี connection registry กลาง
- มี room sharding เพื่อลด lock contention
- มี message fanout ต่อ room
- มี backpressure control (drop/disconnect slow consumer)
- มี heartbeat (ping/pong + read deadline)
- รองรับ hook event bus ผ่าน interface (`BusPublisher`) เพื่อเชื่อม NATS/Kafka ได้

## โครงสร้างไฟล์

- `ws_gateway/main.go`:
  - bootstrap server
  - WebSocket upgrade (`/ws?room=<roomId>`)
  - graceful shutdown
  - env config (`WS_LISTEN_ADDR`, `WS_ROOM_SHARDS`)
- `ws_gateway/server.go`:
  - connection manager
  - shard registry
  - register/unregister/broadcast loop
  - read pump / write pump
  - event bus hooks (`PublishToBus`, `HandleAIEvent`)
- `ws_gateway/id.go`:
  - generator สำหรับ connection ID

## วิธีรัน

```bash
cd ws_gateway
go mod tidy
go run .
```

ค่า default:

- listen addr: `:8080`
- room shards: `32`
- endpoint: `ws://localhost:8080/ws?room=default`

## Event Bus integration

เชื่อม NATS/Kafka ด้วยการ implement interface:

```go
type BusPublisher interface {
    Publish(msg Message) error
}
```

จากนั้น inject ด้วย `server.SetPublisher(...)`

## OS/Runtime tuning (production baseline)

> ใช้ตาม policy infra ของทีมและทดสอบร่วมกับ load test ก่อนใช้จริง

```bash
ulimit -n 200000
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_tw_reuse=1
```

```bash
GOMAXPROCS=auto
GOGC=100
```

## Notes

- ตัวเลข 50k/node เป็น target เชิงสถาปัตยกรรม ไม่ใช่ SLA ตายตัว
- ควรทำ load test ตาม workload จริง (จำนวน rooms, fanout ratio, payload size, burst pattern)
- แนะนำเก็บ metrics เพิ่ม: queue depth, disconnect reason, p95/p99 write latency, dropped message count
