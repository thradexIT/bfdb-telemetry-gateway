# SLO, Monitoring and Disaster Recovery Baseline

Status: **DOCUMENTED BASELINE / IMPLEMENTATION PENDING WHERE NOTED**

## Objective

Define measurable service expectations and the monitoring/DR controls required for a production BFDB Telemetry Gateway deployment.

## Service boundaries

The system has four operational surfaces:

```text
1. MQTT ingestion
2. Latest State / quality
3. historical persistence
4. Modbus TCP serving
```

Each surface must be monitored independently.

## Proposed SLOs

These are **baseline targets** to be reviewed against field cadence and Metasys requirements.

| SLO | Proposed target |
|---|---:|
| Gateway process availability | >= 99.9% monthly |
| Modbus TCP availability | >= 99.9% monthly |
| Fresh-source telemetry processing | >= 99.9% of accepted messages processed without decode failure |
| MQTT-to-Latest-State latency | p95 < 2 s under normal field cadence |
| MQTT-to-TSDB persistence latency | p95 < 5 s under normal conditions |
| Modbus read response | p95 < 500 ms on approved polling profile |
| Identity rejection for configured production devices | 0 sustained unmapped points |
| Backup restore verification | successful at least quarterly |
| Critical alert acknowledgement | operationally defined by deployment owner |

Targets remain subject to commissioning evidence.

## Core metrics

### MQTT ingestion

```text
mqtt_connected
mqtt_messages_received_total
mqtt_decode_errors_total
mqtt_identity_rejections_total
mqtt_last_message_age_seconds
mqtt_reconnects_total
mqtt_queue_depth
mqtt_queue_dropped_total
```

### Latest State / quality

```text
latest_state_points
fresh_points
stale_points
missing_points
invalid_points
oldest_freshness_age_seconds
```

### TimescaleDB

```text
db_connected
db_write_success_total
db_write_error_total
db_write_latency_seconds
db_last_success_age_seconds
db_disk_usage_percent
db_connection_retries_total
```

### Modbus

```text
modbus_listener_up
modbus_requests_total
modbus_errors_total
modbus_response_latency_seconds
modbus_requests_by_unit_id
```

## Alert baseline

### Critical

- gateway process down;
- Modbus listener unavailable;
- all MQTT sources stale beyond agreed threshold;
- database unavailable beyond agreed buffer window;
- queue dropping telemetry;
- disk critically full.

### Warning

- one BFDB stale;
- repeated identity rejection;
- sustained decode errors;
- high DB latency;
- high Modbus latency;
- repeated broker reconnects;
- backup overdue.

## Dashboards

Minimum dashboard:

```text
SYSTEM
- uptime
- version/commit
- process restarts

MQTT
- connected
- messages/sec
- last message age
- reconnects
- decode/identity errors

BFDB
- freshness by BFDB
- stale/missing counts
- latest observed timestamp

TSDB
- write rate
- write errors
- latency
- disk

MODBUS
- listener status
- requests/sec
- errors
- latency
- Unit IDs
```

## Health model

A production health endpoint should distinguish:

```text
LIVENESS
process is running

READINESS
broker reachable/appropriate
DB reachable or supported degraded mode
Modbus listener active
configuration valid

DATA HEALTH
last source age
fresh/stale counts
identity errors
```

Do not collapse all three into one boolean.

## Disaster recovery

### Recovery objectives

Proposed baseline:

```text
RTO: <= 4 hours
RPO: <= 15 minutes
```

These values are provisional until business/site requirements are approved.

### Required backups

Production TimescaleDB:
- scheduled backup;
- off-host storage;
- retention policy;
- encryption at rest according to environment;
- restore test.

Configuration:
- version-controlled non-secret config;
- secured backup of deployment secrets;
- documented identity mapping.

### Restore sequence

1. provision compatible runtime;
2. restore configuration;
3. restore secrets;
4. restore database;
5. start broker/connectivity;
6. start gateway;
7. verify MQTT ingestion;
8. verify Latest State freshness;
9. verify Modbus read;
10. compare one known circuit;
11. declare recovery complete.

## Degraded modes

### MQTT unavailable

```text
Modbus remains responsive
last-known values retained
quality becomes stale/invalid
no fake zeros
```

### DB unavailable

Target production behavior:
- preserve live Latest State;
- continue Modbus serving;
- buffer historical observations durably;
- replay after recovery.

The durable buffering requirement is not yet fully implemented in the current PoC.

### Metasys unavailable

Gateway continues ingestion and persistence. No upstream telemetry should depend on a connected Modbus client.

## DR test record

For every exercise record:

```text
date
scenario
release commit
backup used
RPO achieved
RTO achieved
data validation result
known-circuit check
issues
owner
approver
```

## Exit criterion

SLO/monitoring/DR implementation is production-ready only after:
- metrics endpoint exists;
- alerts are wired to an owner;
- dashboard exists;
- backup job runs;
- restore test passes;
- RTO/RPO are approved;
- degraded-mode tests pass.
