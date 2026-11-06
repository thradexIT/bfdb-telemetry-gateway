from types import SimpleNamespace

from modbus.registers import (
    circuit_base,
    float32_to_registers,
    point_registers,
    quality_address,
    registers_to_float32,
)

def test_float32_roundtrip():
    assert abs(registers_to_float32(float32_to_registers(12.23))-12.23)<1e-5

def test_boundaries():
    assert circuit_base(1)==0
    assert circuit_base(96)==760
    assert quality_address(1)==896
    assert quality_address(96)==991

def test_modbus_projection_uses_rfp_engineering_units():
    point=SimpleNamespace(metrics={
        "voltage": SimpleNamespace(value=52.3),
        "current": SimpleNamespace(value=10.0),
        "power": SimpleNamespace(value=523.0),
        "energy": SimpleNamespace(value=2.4),
    })

    registers=point_registers(point)

    voltage=registers_to_float32(registers[0:2])
    current=registers_to_float32(registers[2:4])
    power_kw=registers_to_float32(registers[4:6])
    energy_kwh=registers_to_float32(registers[6:8])

    assert abs(voltage-52.3)<1e-5
    assert abs(current-10.0)<1e-5
    assert abs(power_kw-0.523)<1e-6
    assert abs(energy_kwh-2.4)<1e-5
