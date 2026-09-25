from dataclasses import dataclass
import re

@dataclass(frozen=True)
class Identity:
    bfdb_id: str
    unit_id: int
    circuit_id: int
    serial: str
    raw_point_id: str
    fields: dict

class IdentityError(ValueError): pass

class IdentityResolver:
    def __init__(self,devices):
        self.devices={d["serial"]:d for d in devices}
    def resolve(self,serial,raw_point_id):
        d=self.devices.get(serial)
        if d is None: raise IdentityError(f"unknown serial: {serial}")
        ident=d["identity"]
        if ident["mode"]!="emulator_linear": raise IdentityError("unsupported identity mode")
        m=re.match(ident["pointRegex"],raw_point_id)
        if not m: raise IdentityError(f"unmapped point: {raw_point_id}")
        c=int(m.group(1))
        if not int(ident["minCircuit"])<=c<=int(ident["maxCircuit"]):
            raise IdentityError(f"circuit out of range: {c}")
        return Identity(d["bfdbId"],int(d["unitId"]),c,serial,raw_point_id,d["fields"])
