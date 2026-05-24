package main

import "testing"

func TestValidateFrameEnvelopeAcceptsAllowedTypes(t *testing.T) {
	valid := []string{
		`{"type":"FULL_STATE","tick":1,"payload":{"state":"ok"}}`,
		`{"type":"DELTA_UPDATE","tick":2,"payload":{"ops":[]}}`,
		`{"type":"HEARTBEAT","tick":3,"payload":{"source":"client"}}`,
		`{"type":"SYNC_REQUEST","tick":4,"payload":{"request_id":"r1"}}`,
		`{"type":"SYNC_RESPONSE","tick":5,"payload":{"request_id":"r1","state":{}}}`,
		`{"type":"PREDICTIVE_STATE","tick":6,"payload":{"prediction":{}}}`,
		`{"type":"ROLLBACK","tick":7,"payload":{"target_tick":5}}`,
	}
	for _, msg := range valid {
		if err := validateFrameEnvelope([]byte(msg)); err != nil {
			t.Fatalf("expected valid message %s, got error: %v", msg, err)
		}
	}
}

func TestValidateFrameEnvelopeRejectsMalformedOrUnknown(t *testing.T) {
	invalid := []string{
		`{"type":"UNKNOWN","tick":1,"payload":{}}`,
		`{"type":"FULL_STATE","tick":-1,"payload":{}}`,
		`{"type":"FULL_STATE","tick":1}`,
		`{"type":"FULL_STATE","tick":1,"payload":null}`,
		`not-json`,
	}
	for _, msg := range invalid {
		if err := validateFrameEnvelope([]byte(msg)); err == nil {
			t.Fatalf("expected invalid message %s to fail validation", msg)
		}
	}
}

