# MQTT Wire Contract

Observed family: `data/dev/<serial>`.

Payload fields observed: `msgid`, `method`, `sn`, `timestamp`, `sendtime`, `version`, `reported`.

Rules:
- topic and payload are separate;
- topic serial must match payload `sn`;
- method `update` is accepted by this ingestion path;
- `reported` must be an object;
- numeric values are parsed only when present;
- an omitted field is not synthesized;
- unknown physical identities are rejected until mapped.

Lab profile: QoS 1, retain=false. Production session/auth/TLS settings remain TBD.
