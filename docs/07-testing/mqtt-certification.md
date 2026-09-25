# MQTT Certification

Mandatory manual lab proof:
1. connect MQTT Explorer directly to broker IP:1883;
2. inspect `data/dev/#`;
3. confirm the three emulator topics;
4. confirm the payload is raw JSON without a synthetic wrapper;
5. capture one circuit's U1/I1/P1/EP1;
6. compare the same canonical circuit against TSDB and Modbus.

Automated CI validates the broker-to-gateway path separately; MQTT Explorer remains the independent RAW certification surface.
