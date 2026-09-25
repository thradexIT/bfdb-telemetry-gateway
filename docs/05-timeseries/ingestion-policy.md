# Ingestion Policy

## Intent

Historical storage must represent **what was actually observed**, not merely the current merged state.

Latest State and TimescaleDB therefore have different semantics:

```text
Latest State  = best current known value, with carry-forward on missing fields
TimescaleDB   = historical observations, preserving what was actually present/accepted
```

## Current v0.1 behavior

A TSDB row is written when at least one electrical metric changes in an accepted canonical patch.

The current repository receives the merged Latest State point and writes:

- source observation time;
- platform receive time;
- merged electrical snapshot;
- raw identity;
- quality label;
- MQTT msgid;
- `changed_fields`.

State-only patches update Latest State but do not generate an electrical row.

QoS duplicate tolerance is provided by the unique key on:

```text
observed_at + gateway_serial + mqtt_msgid + raw_point_id
```

## Known semantic gap

For a **partial electrical patch**, the current implementation can persist carried-forward metrics from Latest State into the new wide row.

Example:

```text
Previous Latest State:
V=13.80, I=5.00, P=69.00, E=0.5000

New MQTT patch:
{"I1":"6.00"}

Current merged state:
V=13.80, I=6.00, P=69.00, E=0.5000
```

If the merged snapshot is stored as a new historical row, V/P/E can appear as though they were newly sampled at the new `observed_at`, even though only current was present in the patch.

`changed_fields` preserves some evidence of what changed, but that is not sufficient as the final historical semantics.

## Target correction

Persistence should consume the **accepted normalized patch**, not the merged Latest State snapshot.

Preferred v0.1 correction:

- nullable metric columns contain only values actually present/accepted in the current MQTT patch;
- `changed_fields` or an observed mask explicitly records present metrics;
- Latest State remains independently merged;
- state is persisted only when actually present if included in the observation row;
- add explicit `sendtime_at TIMESTAMPTZ` from MQTT `sendtime`;
- retain `received_at` as platform receipt time.

Alternative valid implementations include:

- metric-level long-form observation table;
- wide rows with per-metric observed flags/timestamps.

The invariant is the same:

> A carried-forward Latest State value must not be represented as a newly sampled historical observation.

## Timestamp roles

Target historical metadata:

| Field | Meaning |
|---|---|
| `observed_at` | source measurement/event timestamp |
| `sendtime_at` | gateway/device send timestamp |
| `received_at` | platform receive/persist timestamp |

The current schema has `observed_at` and `received_at`; `sendtime_at` is still open.

## Site Mapper implication

Future Site Mapper history queries must be built on observation-correct data. Historical charts should not infer a new sample for a metric merely because another metric or state field changed.
