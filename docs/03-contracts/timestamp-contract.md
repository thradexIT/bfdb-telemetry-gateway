# Timestamp Contract

Three clocks are distinct:
1. source observed time = payload `timestamp`;
2. source send time = payload `sendtime`;
3. platform receive time = DB `received_at`.

v0.1 orders each metric by source observed time and stores receive time separately.

Field commissioning must verify source clock reliability before production freeze.
