import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "telxius_snapshot_builder",
    ROOT / "apps" / "snmp-snapshot-emulator" / "build_snapshot.py",
)
snapshot = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(snapshot)


def write_fixture(tmp_path):
    mib = tmp_path / "TELXIUS-TEST.mib"
    mib.write_text(
        """TELXIUS-TEST DEFINITIONS ::= BEGIN
testRoot OBJECT IDENTIFIER ::= { enterprises 55555 }

powerSystemSerialNumber OBJECT-TYPE
    SYNTAX DisplayString (SIZE(0..32))
    MAX-ACCESS read-only
    STATUS current
    ::= { testRoot 1 }

testInteger OBJECT-TYPE
    SYNTAX INTEGER {
        normal(1),
        error(0)
    }
    MAX-ACCESS read-only
    STATUS current
    ::= { testRoot 2 }
END
""",
        encoding="utf-8",
    )
    walk = tmp_path / "walk.txt"
    walk.write_text(
        """Sent GET request to 127.0.0.1 : 161
powerSystemSerialNumber.0
FIELD-SERIAL-MUST-NOT-BE-COMMITTED
testInteger.0
normal(1)
.1.3.6.1.4.1.55555.99.0
12.34
Request Failed: end of Mib View
""",
        encoding="utf-8",
    )
    return walk, mib


def test_snapshot_resolves_symbolic_oids_and_tracks_inferred_numeric_types(tmp_path):
    walk, mib = write_fixture(tmp_path)
    items, manifest = snapshot.build_snapshot(
        walk,
        [mib],
        serial_override="EMU-SMARTPACK2-TEST",
    )

    assert [item["oid"] for item in items] == [
        "1.3.6.1.4.1.55555.1.0",
        "1.3.6.1.4.1.55555.2.0",
        "1.3.6.1.4.1.55555.99.0",
    ]
    assert items[0]["type"] == "OctetString"
    assert items[0]["value"] == "EMU-SMARTPACK2-TEST"
    assert items[1]["type"] == "Integer"
    assert items[1]["value"] == 1
    assert items[2]["type"] == "OctetString"
    assert items[2]["value"] == "12.34"
    assert items[2]["typeEvidence"] == "INFERRED_FROM_WALK_TEXT"

    assert manifest["objectCount"] == 3
    assert manifest["symbolicResolvedCount"] == 2
    assert manifest["originalNumericOidCount"] == 1
    assert manifest["inferredTypeCount"] == 1
    assert manifest["unresolvedSymbolicCount"] == 0
    assert manifest["serialOverridden"] is True


def test_snapshot_outputs_snmprec_and_machine_readable_inventory(tmp_path):
    walk, mib = write_fixture(tmp_path)
    items, manifest = snapshot.build_snapshot(walk, [mib])

    snmprec = tmp_path / "data" / "private.snmprec"
    inventory = tmp_path / "snapshot.json"
    receipt = tmp_path / "manifest.json"
    snapshot.write_outputs(items, manifest, snmprec, inventory, receipt)

    lines = snmprec.read_text(encoding="utf-8").splitlines()
    assert lines[0].startswith("1.3.6.1.4.1.55555.1.0|4x|")
    assert lines[1] == "1.3.6.1.4.1.55555.2.0|2|1"
    assert lines[2].startswith("1.3.6.1.4.1.55555.99.0|4x|")

    parsed = json.loads(inventory.read_text(encoding="utf-8"))
    assert parsed["schema"] == "telxius.smartpack2.snapshot.v1"
    assert len(parsed["items"]) == 3
    assert json.loads(receipt.read_text(encoding="utf-8"))["objectCount"] == 3
