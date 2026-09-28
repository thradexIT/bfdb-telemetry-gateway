# Metasys Commissioning Runbook

Status: **DOCUMENTED / READY TO EXECUTE**

Actual field commissioning: **PENDING**

## Objective

Commission BFDB Telemetry Gateway as a **read-only Modbus TCP Server** consumed by Johnson Controls Metasys.

The runbook is designed so commissioning can be executed without inventing protocol assumptions.

## Preconditions

Before field execution, collect:

```text
Metasys version
Metasys engine/controller type
Gateway production IP
Network/VLAN
Firewall path
Approved TCP port
Supported Unit IDs
FC03 vs FC04 requirement
FLOAT32 byte order
FLOAT32 word order
Polling interval
Timeout
Retry count
Stale/invalid expectation
```

Unknown items remain TBD until confirmed by the integrator.

## Baseline proposed by this repository

```text
Role:        BFDB Gateway = Modbus TCP Server
Client:      Metasys
Lab port:    1502
Prod port:   502 proposed
Unit IDs:    1 / 2 / 3 proposed
Data type:   IEEE-754 FLOAT32
Registers:   2 × 16-bit per metric
Function:    FC04 baseline, pending Metasys confirmation
Word order:  high-word-first baseline, pending confirmation
```

## Circuit register map

For circuit `c`:

```text
base = (c - 1) * 8

base+0..1 Voltage
base+2..3 Current
base+4..5 Power
base+6..7 Energy
```

Quality register:

```text
896 + (c - 1)
```

## Commissioning sequence

### 1. Network reachability

From the Metasys-side network:

```text
Gateway IP reachable
TCP port reachable
No public Internet exposure
Firewall rule restricted to intended client/network
```

PASS evidence:
- ping if allowed;
- TCP connectivity check;
- firewall/routing record.

### 2. Unit ID discovery/confirmation

Test:

```text
Unit 1 -> BFDB-01
Unit 2 -> BFDB-02
Unit 3 -> BFDB-03
```

PASS:
- Metasys can address each Unit independently;
- no cross-device register contamination.

### 3. Function code confirmation

Try FC04 first.

If Metasys integration requires FC03, record that explicitly and implement/configure only after confirmation.

PASS:
- agreed function reads the expected register block.

### 4. FLOAT32 test vector

Use one controlled known value, for example:

```text
Voltage = 12.50 V
```

Confirm the exact register pair and decoded Metasys value.

If value is numerically wrong but bytes are present, test word/byte order variants systematically.

PASS:
- agreed encoding reproduces the known value exactly within FLOAT32 tolerance.

### 5. Known circuit trace

Select one physically identified circuit.

Capture:

```text
physical panel/circuit
AWT serial
raw MQTT point id
source timestamp
V/I/P/E
Timescale row
logical circuit id
Modbus Unit ID
Modbus registers
Metasys displayed value
```

PASS:
- all layers refer to the same physical circuit;
- values agree within source/float tolerances.

### 6. Partial-update behavior

Generate or observe a partial MQTT update.

PASS:
- omitted metrics are not zeroed;
- Metasys retains the last-known numeric value;
- quality/freshness changes according to the agreed policy.

### 7. Stale/offline behavior

Stop source updates long enough to exceed the configured freshness threshold.

PASS:
- numeric last-known value behavior matches the signed-off policy;
- quality indicates stale/invalid as agreed;
- Metasys does not interpret stale data as a new measurement.

### 8. Polling/load behavior

Set the proposed polling interval and observe:
- gateway CPU/memory;
- request latency;
- error rate;
- broker and DB remain decoupled from Modbus request latency.

PASS:
- no timeouts under agreed polling load;
- no request-driven MQTT/DB reads occur.

## Commissioning acceptance record

Fill:

```text
Date:
Site:
Engineer:
Metasys version:
Engine/controller:
Gateway version/commit:
Gateway IP:
Port:
FC:
Unit IDs:
Byte order:
Word order:
Polling interval:
Timeout:
Retries:
Stale policy:
Known-circuit test:
Result:
Open deviations:
Approver:
```

## Exit criteria

Metasys commissioning is CLOSED only when:
- one known physical circuit is traced end-to-end;
- function code is signed off;
- word/byte order is signed off;
- Unit IDs are signed off;
- stale behavior is signed off;
- polling/timeout/retry parameters are recorded;
- evidence is attached to a release validation receipt.
