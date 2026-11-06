import struct

MODBUS_METRIC_FACTORS = {
    "voltage": 1.0,
    "current": 1.0,
    "power": 0.001,  # canonical W -> Metasys/RFP kW
    "energy": 1.0,   # canonical kWh -> Metasys/RFP kWh
}

def float32_to_registers(value):
    return list(struct.unpack(">HH",struct.pack(">f",float(value))))

def registers_to_float32(registers):
    return struct.unpack(">f",struct.pack(">HH",*registers))[0]

def circuit_base(circuit_id):
    if not 1<=circuit_id<=96:
        raise ValueError("circuit_id must be 1..96")
    return (circuit_id-1)*8

def _modbus_metric_value(metric, point):
    value = point.metrics[metric].value if metric in point.metrics else 0.0
    return value * MODBUS_METRIC_FACTORS[metric]

def point_registers(point):
    out=[]
    for metric in ("voltage","current","power","energy"):
        out.extend(float32_to_registers(_modbus_metric_value(metric,point)))
    return out

def quality_address(circuit_id):
    if not 1<=circuit_id<=96:
        raise ValueError("circuit_id must be 1..96")
    return 896+(circuit_id-1)
