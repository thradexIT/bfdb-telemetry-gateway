import importlib.util
from pathlib import Path
import sys

import yaml
from electrical.model import ElectricalSample

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "field-emulator"))
SPEC = importlib.util.spec_from_file_location(
    "telxius_field_emulator_main",
    ROOT / "apps" / "field-emulator" / "main.py",
)
field_emulator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(field_emulator)


class Fleet:
    def get(self, _bfdb_id, _circuit):
        return ElectricalSample(12.23, 9.57, 117.18, 1.50)


def profile():
    with (ROOT / "config" / "devices.telxius-seed-01.yaml").open(
        "r", encoding="utf-8"
    ) as handle:
        return yaml.safe_load(handle)["devices"]


def test_telxius_inventory_counts_are_explicit():
    devices = profile()
    counts = {}
    for device in devices:
        mapped = device["identity"]["measuredPositionsByPanel"]
        counts[device["bfdbId"]] = sum(len(points) for points in mapped.values())
        assert counts[device["bfdbId"]] == device["identity"]["inventoryBreakerCount"]
    assert counts == {"QDF-2": 26, "QDF-4": 12, "QDF-5": 36}


def test_qdf4_emits_full_measurements_only_for_documented_positions():
    device = next(item for item in profile() if item["bfdbId"] == "QDF-4")
    reported = field_emulator.build_reported(
        device,
        Fleet(),
        panel_index=1,
        positions=list(range(1, 11)),
        positions_per_panel=24,
    )

    for position in range(1, 7):
        point = reported[f"0_1_{position}"]
        assert point["state"] == "ONLINE"
        assert point["U1"] == "12.23"
        assert point["I1"] == "9.57"
        assert point["P1"] == "117.18"
        assert point["EP1"] == "1.5000"

    for position in range(7, 11):
        assert reported[f"0_1_{position}"] == {"state": "ONLINE"}


def test_serial_override_is_opt_in_and_does_not_change_tracked_profile(monkeypatch):
    devices = profile()
    monkeypatch.setenv("TELXIUS_QDF_4_SN", "25110703400009")
    overridden = field_emulator.apply_serial_overrides(devices)

    qdf4 = next(item for item in overridden if item["bfdbId"] == "QDF-4")
    tracked = next(item for item in devices if item["bfdbId"] == "QDF-4")
    assert qdf4["serial"] == "25110703400009"
    assert tracked["serial"] == "EMU-TELXIUS-QDF-4"


def test_panel_labels_are_inventory_metadata_not_rtu_slave_inference():
    devices = profile()
    qdf2 = next(item for item in devices if item["bfdbId"] == "QDF-2")
    qdf4 = next(item for item in devices if item["bfdbId"] == "QDF-4")

    assert [field_emulator.panel_label(qdf2, index) for index in range(1, 5)] == [
        "A1", "A2", "B1", "B2"
    ]
    assert [field_emulator.panel_label(qdf4, index) for index in range(1, 5)] == [
        "A3", "A2", "B3", "B2"
    ]
    assert qdf4["fieldInventory"]["rtuSlaves"] == {"A3": 1, "A2": 3, "B3": 5, "B2": 7}
