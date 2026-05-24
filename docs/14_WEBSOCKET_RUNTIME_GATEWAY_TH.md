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

## Runtime Frame Envelope Contract

ทั้ง Go runtime gateway (`ws_gateway/server.go`) และ Python gateway (`ws_gateway/main.py`) ใช้ frame envelope เดียวกันก่อน fanout/persist:

```json
{
  "type": "FULL_STATE | DELTA_UPDATE | HEARTBEAT | SYNC_REQUEST | SYNC_RESPONSE | PREDICTIVE_STATE | ROLLBACK",
  "tick": 42,
  "payload": {}
}
```

Mandatory fields:
- `type` (string, required): ต้องเป็นค่าใน allowlist เท่านั้น
- `tick` (integer, required): ต้องเป็นเลขจำนวนเต็ม `>= 0`
- `payload` (object, required): ต้องเป็น JSON object และผ่าน required field ตาม type

Optional fields:
- อนุญาต extra fields เพิ่มเติมได้ (เช่น metadata, trace_id) แต่ห้ามขาด mandatory fields

หาก `type` ไม่รู้จัก หรือ field บังคับผิดรูปแบบ/ขาด จะถูก reject ทันที (ไม่ fanout และไม่ persist)

### Frame types และ payload contract

1) `FULL_STATE`  
   - Required payload fields: `state`  
   - Example:
   ```json
   {"type":"FULL_STATE","tick":100,"payload":{"state":{"layers":[]}}}
   ```

2) `DELTA_UPDATE`  
   - Required payload fields: `delta`  
   - Example:
   ```json
   {"type":"DELTA_UPDATE","tick":101,"payload":{"delta":[{"op":"replace","path":"/layers/0","value":"#fff"}]}}
   ```

3) `HEARTBEAT`  
   - Required payload fields: `source`  
   - Example:
   ```json
   {"type":"HEARTBEAT","tick":102,"payload":{"source":"client"}}
   ```

4) `SYNC_REQUEST`  
   - Required payload fields: `request_id`  
   - Example:
   ```json
   {"type":"SYNC_REQUEST","tick":103,"payload":{"request_id":"req-1"}}
   ```

5) `SYNC_RESPONSE`  
   - Required payload fields: `request_id`, `state`  
   - Example:
   ```json
   {"type":"SYNC_RESPONSE","tick":104,"payload":{"request_id":"req-1","state":{"layers":[]}}}
   ```

6) `PREDICTIVE_STATE`  
   - Required payload fields: `prediction`  
   - Example:
   ```json
   {"type":"PREDICTIVE_STATE","tick":105,"payload":{"prediction":{"next":"scene_b"}}}
   ```

7) `ROLLBACK`  
   - Required payload fields: `target_tick`  
   - Example:
   ```json
   {"type":"ROLLBACK","tick":106,"payload":{"target_tick":90}}
   ```
