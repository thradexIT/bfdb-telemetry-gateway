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

class IdentityError(ValueError):
    pass

class IdentityResolver:
    def __init__(self,devices):
        self.devices={d["serial"]:d for d in devices}

    def resolve(self,serial,raw_point_id):
        d=self.devices.get(serial)
        if d is None:
            raise IdentityError(f"unknown serial: {serial}")

        ident=d["identity"]
        mode=ident["mode"]

        if mode=="emulator_linear":
            return self._resolve_linear(d,serial,raw_point_id,ident)

        if mode=="emulator_panelized":
            return self._resolve_panelized(d,serial,raw_point_id,ident)

        raise IdentityError(f"unsupported identity mode: {mode}")

    def _resolve_linear(self,d,serial,raw_point_id,ident):
        m=re.fullmatch(ident["pointRegex"],raw_point_id)
        if not m:
            raise IdentityError(f"unmapped point: {raw_point_id}")

        circuit=int(m.group(1))
        if not int(ident["minCircuit"])<=circuit<=int(ident["maxCircuit"]):
            raise IdentityError(f"circuit out of range: {circuit}")

        return Identity(
            d["bfdbId"],
            int(d["unitId"]),
            circuit,
            serial,
            raw_point_id,
            d["fields"],
        )

    def _resolve_panelized(self,d,serial,raw_point_id,ident):
        m=re.fullmatch(ident["pointRegex"],raw_point_id)
        if not m or len(m.groups())<2:
            raise IdentityError(f"unmapped point: {raw_point_id}")

        panel=int(m.group(1))
        position=int(m.group(2))
        panels=int(ident["panelsPerBfdb"])
        positions=int(ident["positionsPerPanel"])

        if not 1<=panel<=panels:
            raise IdentityError(f"panel out of range: {panel}")

        if not 1<=position<=positions:
            raise IdentityError(f"panel position out of range: {position}")

        circuit=((panel-1)*positions)+position

        if not int(ident["minCircuit"])<=circuit<=int(ident["maxCircuit"]):
            raise IdentityError(f"circuit out of range: {circuit}")

        return Identity(
            d["bfdbId"],
            int(d["unitId"]),
            circuit,
            serial,
            raw_point_id,
            d["fields"],
        )
