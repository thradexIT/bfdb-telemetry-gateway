# Risks

| Risk | Impact | Mitigation / status |
|---|---|---|
| Incorrect physical identity mapping | High | Explicit configuration + field evidence; never infer `0_1_n` == physical circuit n without proof |
| Partial MQTT update treated as zero | High | Per-field merge contract + tests; explicit `0.00` distinguished from missing |
| Historical row falsely timestamps carried-forward metrics | High | Known v0.1 gap; change persistence to patch/observed semantics before field closure |
| Missing `sendtime_at` in TSDB | Medium | Add schema/migration and repository support |
| Modbus byte/word mismatch | Medium | Centralized codec + known test vector + Metasys commissioning |
| Restart presents zeros as valid | High | Start quality as MISSING until fresh telemetry |
| Duplicate MQTT delivery | Medium | Idempotent state merge + TSDB dedupe key |
| Out-of-order source data | Medium | Per-field timestamp ordering |
| Source clock error | Medium | Preserve `received_at`; add `sendtime_at`; compare clocks during commissioning |
| DB outage loses triggering observation | High for production | Add durable queue/replay or equivalent before production |
| Broker/network disconnect | Medium | Reconnect behavior exists at client level; failure-scenario certification still required |
| Remote reviewer can publish telemetry | High | Separate `bfdb-reviewer` ACL is read-only |
| Plain MQTT exposed through temporary tunnel | High if misused | PoC-only, short-lived endpoint, temporary credential; production requires approved encrypted design |
| Public Modbus exposure | High | Never tunnel/expose 1502/502 publicly |
| Anonymous lab broker promoted to production | High | Explicitly separate local anonymous and authenticated remote/production profiles |
| Emulator mistaken for vendor fidelity | Medium | Documentation labels synthetic mapping and unverified field semantics |
