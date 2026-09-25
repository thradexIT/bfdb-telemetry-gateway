CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE TABLE IF NOT EXISTS telemetry_samples (
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bfdb_id TEXT NOT NULL,
  gateway_serial TEXT NOT NULL,
  circuit_id SMALLINT NOT NULL CHECK (circuit_id BETWEEN 1 AND 96),
  raw_point_id TEXT NOT NULL,
  voltage_v DOUBLE PRECISION,
  current_a DOUBLE PRECISION,
  power_w DOUBLE PRECISION,
  energy_kwh DOUBLE PRECISION,
  state TEXT,
  quality TEXT NOT NULL,
  mqtt_msgid TEXT NOT NULL,
  changed_fields TEXT[] NOT NULL DEFAULT '{}'
);
SELECT create_hypertable('telemetry_samples','observed_at',if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS telemetry_samples_lookup_idx
ON telemetry_samples (bfdb_id,circuit_id,observed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS telemetry_samples_dedupe_idx
ON telemetry_samples (observed_at,gateway_serial,mqtt_msgid,raw_point_id);
