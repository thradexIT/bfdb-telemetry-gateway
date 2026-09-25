# Telemetry Dataflow

```text
Field Emulator -> MQTT Broker -> MQTT Explorer (RAW)
                      |
                      v
               MQTT Subscriber
                      |
                      v
               Raw Validation
                      |
                      v
               Identity Resolver
                      |
                      v
                 Normalizer
                  /      \
                 v        v
          Latest State   TimescaleDB
               |
               v
         Quality Engine
               |
               v
         Register Image
               |
               v
        Modbus TCP Server
        /       |       \
     Unit 1   Unit 2   Unit 3
```

Hard rule: Modbus never triggers MQTT or TSDB reads.
