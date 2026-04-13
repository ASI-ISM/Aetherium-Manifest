package main

import (
	"fmt"
	"sync/atomic"
	"time"
)

var idCounter atomic.Uint64

func generateID() string {
	next := idCounter.Add(1)
	return fmt.Sprintf("c-%d-%d", time.Now().UnixNano(), next)
}
