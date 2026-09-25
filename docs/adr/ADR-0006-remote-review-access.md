# ADR-0006 — Ephemeral Read-Only Remote MQTT Review

Status: ACCEPTED FOR POC / NOT PRODUCTION

Date: 2026-09-25

## Context

The PoC needs an external reviewer to use their own MQTT Explorer Desktop and receive the same MQTT telemetry published by the BFDB emulator.

Requirements:

- no Site Mapper UI dependency;
- no custom reviewer web UI required;
- direct MQTT client behavior;
- reviewer must not publish telemetry;
- avoid exposing Modbus or TimescaleDB;
- allow a full-free/no-card lab path.

Options evaluated during the 2026-09-25 session:

1. ngrok TCP;
2. Cloudflare Quick Tunnel;
3. private overlay network;
4. ephemeral reverse TCP tunnel via Pinggy.

## Decision

For short-lived PoC review, expose only Mosquitto TCP 1883 through an ephemeral reverse TCP tunnel and require the broker's read-only `bfdb-reviewer` credential.

Current demonstrated command:

```bash
ssh -p 443 -R0:127.0.0.1:1883 tcp@free.pinggy.io
```

The provider assigns a temporary public hostname and random TCP port.

## Why the random public port is acceptable

The external port is transport plumbing only.

Example:

```text
public-host:36771 -> local 127.0.0.1:1883
```

It does not change the broker's local MQTT port or any application contract.

## Consequences

Positive:

- reviewer uses native MQTT Explorer;
- exact broker traffic is observed;
- no additional application layer;
- read-only ACL limits reviewer actions;
- tunnel can be terminated immediately.

Negative:

- endpoint is ephemeral;
- tested free session reports a 60-minute expiration;
- native MQTT over this lab path is not the final encrypted production design;
- tunnel-provider behavior is external to the product.

## Rejected/alternative observations

### ngrok TCP

The tested free account required card verification for TCP endpoints, so it did not satisfy the no-card requirement for this session.

### Cloudflare Quick Tunnel

The tested quick tunnel exposed HTTP successfully but did not satisfy the direct native MQTT TCP Desktop-client requirement.

### Private overlay network

Valid alternative if both parties can install/join the private network, but it changes reviewer onboarding.

## Security constraints

Never expose through this pattern:

- Modbus TCP;
- TimescaleDB/PostgreSQL;
- Docker daemon;
- host administration endpoints.

Production remote connectivity requires a separately approved encrypted/segmented architecture.
