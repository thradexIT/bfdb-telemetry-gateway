# Ingestion Policy

A TSDB row is written when at least one electrical metric changes in an accepted canonical patch.

The stored row contains source observation time, platform receive time, merged electrical snapshot, raw identity, quality label, MQTT msgid and changed_fields.

State-only patches update Latest State but do not generate an electrical row in v0.1.

QoS duplicate tolerance is provided by the unique key on observed_at + serial + msgid + raw point.
