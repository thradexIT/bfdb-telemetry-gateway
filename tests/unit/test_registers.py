from modbus.registers import float32_to_registers,registers_to_float32,circuit_base,quality_address

def test_float32_roundtrip():
    assert abs(registers_to_float32(float32_to_registers(12.23))-12.23)<1e-5

def test_boundaries():
    assert circuit_base(1)==0
    assert circuit_base(96)==760
    assert quality_address(1)==896
    assert quality_address(96)==991
