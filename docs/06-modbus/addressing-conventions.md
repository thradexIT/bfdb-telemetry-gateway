# Modbus Addressing Conventions

Current PoC baseline:
- Gateway role: Modbus TCP Server
- Metasys role: Modbus TCP Client
- Lab port: 1502
- Production target: 502
- Function: FC04 Input Registers
- Data type: IEEE-754 FLOAT32
- Byte order: big-endian
- Word order: high word first

Code and documentation use zero-based protocol offsets.

If a BMS UI uses 3xxxx/4xxxx notation, the ICD must show both the UI reference and protocol offset explicitly to avoid off-by-one errors.

FC04 and endian/word order remain commissioning TBDs.
