# Quality Registers

Circuit quality registers occupy protocol offsets 896..991.

```text
quality_address = 896 + (circuit - 1)
```

Bit layout:
- 0 voltage fresh/valid
- 1 current fresh/valid
- 2 power fresh/valid
- 3 energy fresh/valid
- 4 any stale
- 5 data seen
- 6 ONLINE
- 7 invalid/non-ONLINE state

A numeric register is never sufficient by itself to prove freshness.
