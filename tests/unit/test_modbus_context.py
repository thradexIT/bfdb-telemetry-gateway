from modbus.server import ModbusProjection

def test_modbus_projection_constructs_and_uses_protocol_offsets():
    projection=ModbusProjection([1,2,3])
    projection.context[1].setValues(4,0,[1234])
    assert projection.context[1].getValues(4,0,1)==[1234]
