# Emulator Design

The emulator validates ingestion and projection contracts; it is not a claim of full vendor-device fidelity.

It creates:
- 3 synthetic BFDB identities;
- 96 circuit models per BFDB;
- rotating partial batches of 24 points;
- real MQTT topic/payload separation;
- observed field names U1/I1/P1/EP1;
- deterministic state-only partial patches.

Success criterion: replacing the emulator with field MQTT must not require redesign below the broker boundary.
