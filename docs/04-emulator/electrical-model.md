# Electrical Model

Per synthetic circuit:

```text
Voltage(t) = nominal + small bounded noise
Current(t) = bounded random walk + occasional load step
Power(t)   = Voltage(t) * Current(t)
Energy(t) += max(Power(t),0) * dt / 3,600,000
```

Units: V, A, W, kWh.

Configured nominal values are lab profiles informed by observed sample magnitudes, not verified AMC16Z operating specifications.
