# 01 — System Overview

## High-Level Architecture
1. **GunUI Client (Body):** ภาษาแสงและการเคลื่อนไหว
2. **Logenesis Engine (Cognition):** ตีความเจตจำนงและ orchestration
3. **AetherBus Tachyon (Nervous System):** low-latency deterministic fabric

## Problem Statement
สแต็กเดิมพึ่งพา Redis Streams + TCP/IP ทำให้เกิด:
- store-and-forward latency
- serialization overhead
- kernel crossing/context switching cost
- multi-agent reasoning drift
- copper wall bottlenecks ใน throughput สูง

## Design Goals
- perceived zero latency
- deterministic global state
- predictive orchestration แทน reactive only
- optical + kernel-bypass friendly runtime

## Core Principle
การแก้ปัญหา latency ทำสองทางพร้อมกัน:
1. ลดเวลาทางกายภาพ (RDMA/DPDK/Photonics)
2. ขยับเวลาการเริ่มคำนวณให้เร็วขึ้น (Negative Latency)
