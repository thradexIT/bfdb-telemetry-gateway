# MQTT Explorer Runbook

## Purpose

Verify the **RAW MQTT path independently** of the telemetry gateway, TimescaleDB, and Modbus.

MQTT Explorer must connect to the broker path, not to the telemetry gateway process.

## Local anonymous lab

Settings:

```text
Host: Docker host / localhost as appropriate
Port: 1883
Protocol: mqtt://
TLS: OFF
Username: none
Password: none
```

Expected tree:

```text
data
└── dev
    ├── EMU-BFDB-01
    ├── EMU-BFDB-02
    └── EMU-BFDB-03
```

## Authenticated remote-review profile

Start with:

```bash
bash scripts/setup-ngrok-review.sh

docker compose --env-file .env.remote \
  -f docker-compose.yml \
  -f docker-compose.remote.yml \
  up -d --build
```

Reviewer credentials:

```text
Username: bfdb-reviewer
Password: value of MQTT_REVIEWER_PASSWORD in .env.remote
```

The reviewer account is read-only for:

```text
data/dev/#
```

## Direct remote MQTT TCP

If using the documented ephemeral Pinggy tunnel, the service returns an endpoint similar to:

```text
tcp://example.run.pinggy-free.link:36771
```

MQTT Explorer:

```text
Protocol: mqtt://
Host: example.run.pinggy-free.link
Port: 36771
Username: bfdb-reviewer
Password: <reviewer password>
SSL/TLS: OFF
Path: empty
```

Do not select `wss://` or `/mqtt` for a raw TCP tunnel.

See [Remote MQTT Access](remote-mqtt-access.md).

## What to inspect

For each topic verify:

- `msgid` changes over time;
- `method=update`;
- payload `sn` matches the serial in the topic;
- `timestamp` and `sendtime` are present;
- `reported` is an object;
- values such as U1/I1/P1/EP1 arrive as strings;
- partial batches are possible;
- a point can be state-only.

The exact MQTT wire form is:

```text
TOPIC
data/dev/EMU-BFDB-03

PAYLOAD
{"msgid":"...","method":"update","sn":"EMU-BFDB-03",...}
```

The topic is not a field inside a synthetic JSON wrapper.

## Pass condition

RAW MQTT inspection passes when an independent subscriber can observe changing live payloads on all three expected topic families without relying on TimescaleDB or Modbus.
