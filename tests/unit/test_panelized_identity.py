import pytest

from electrical.point_id import encode_panelized_point_id
from normalizer.identity import IdentityError, IdentityResolver


DEVICE = {
    "bfdbId": "BFDB-01",
    "serial": "EMU-BFDB-01",
    "unitId": 1,
    "identity": {
        "mode": "emulator_panelized",
        "pointRegex": r"^0_([0-9]+)_([0-9]+)$",
        "panelsPerBfdb": 4,
        "positionsPerPanel": 24,
        "minCircuit": 1,
        "maxCircuit": 96,
    },
    "fields": {
        "voltage": "U1",
        "current": "I1",
        "power": "P1",
        "energy": "EP1",
    },
}


@pytest.mark.parametrize(
    ("circuit", "raw_point_id"),
    [
        (1, "0_1_1"),
        (24, "0_1_24"),
        (25, "0_2_1"),
        (48, "0_2_24"),
        (49, "0_3_1"),
        (72, "0_3_24"),
        (73, "0_4_1"),
        (96, "0_4_24"),
    ],
)
def test_panelized_encoder_boundaries(circuit, raw_point_id):
    assert encode_panelized_point_id(circuit, 24) == raw_point_id


def test_all_96_circuits_have_24_position_suffix_maximum():
    ids=[encode_panelized_point_id(c,24) for c in range(1,97)]

    assert len(ids)==96
    assert len(set(ids))==96

    panels=set()
    positions=set()

    for raw_id in ids:
        root,panel,position=raw_id.split("_")
        assert root=="0"
        panels.add(int(panel))
        positions.add(int(position))
        assert 1<=int(position)<=24

    assert panels=={1,2,3,4}
    assert positions==set(range(1,25))
    assert "0_1_25" not in ids
    assert "0_1_96" not in ids


def test_panelized_resolver_maps_to_logical_circuits():
    resolver=IdentityResolver([DEVICE])

    assert resolver.resolve("EMU-BFDB-01","0_1_24").circuit_id==24
    assert resolver.resolve("EMU-BFDB-01","0_2_1").circuit_id==25
    assert resolver.resolve("EMU-BFDB-01","0_3_1").circuit_id==49
    assert resolver.resolve("EMU-BFDB-01","0_4_24").circuit_id==96


@pytest.mark.parametrize(
    "raw_point_id",
    ["0_1_25","0_1_96","0_5_1","0_0_1","0_2_0"],
)
def test_panelized_resolver_rejects_invalid_panel_or_position(raw_point_id):
    resolver=IdentityResolver([DEVICE])

    with pytest.raises(IdentityError):
        resolver.resolve("EMU-BFDB-01",raw_point_id)
