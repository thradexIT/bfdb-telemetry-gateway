# Security Baseline

## Lab
The included broker allows anonymous MQTT to accelerate local PoC testing.

## Production principles
- broker authentication;
- TLS where supported by the field chain and broker;
- secrets outside Git;
- segmented OT/IT network;
- firewall only required flows;
- bind Modbus only to intended interfaces;
- never expose TCP/502 to the public Internet;
- read-only Modbus surface;
- restrict database network exposure.

The lab broker configuration must not be promoted unchanged to production.
