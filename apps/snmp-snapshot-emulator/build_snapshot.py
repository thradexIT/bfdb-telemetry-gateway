#!/usr/bin/env python3
"""Build a private Smartpack2 SNMP snapshot from a textual SNMPWalk + Eltek MIBs.

The raw customer walk and vendor MIB files are runtime inputs and are never
required to be committed to the repository. Output is a numeric-OID snapshot
for lab replay plus a manifest describing where ASN.1 type was inferred.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Iterable

ROOT_OIDS = {
    "iso": "1",
    "org": "1.3",
    "dod": "1.3.6",
    "internet": "1.3.6.1",
    "private": "1.3.6.1.4",
    "enterprises": "1.3.6.1.4.1",
}
NUMERIC_OID = re.compile(r"^\.?\d+(?:\.\d+)+$")
IDENT = re.compile(r"^[A-Za-z][A-Za-z0-9_-]*$")
ENUM_VALUE = re.compile(r"^.*\((-?\d+)\)$")
INTEGER_VALUE = re.compile(r"^[+-]?\d+$")
IP_VALUE = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$")

TAG_TO_TYPE = {
    2: "Integer",
    4: "OctetString",
    6: "OID",
    64: "IpAddress",
    65: "Counter",
    66: "Gauge",
    67: "TimeTicks",
    68: "Opaque",
    70: "Counter64",
}


class SnapshotError(ValueError):
    pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_walk(path: Path) -> list[tuple[str, str]]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    pairs: list[tuple[str, str]] = []
    index = 0
    while index < len(lines):
        key = lines[index].strip()
        if not key or key.startswith("Sent GET request"):
            index += 1
            continue
        if key.startswith("Request Failed:"):
            break
        if index + 1 >= len(lines):
            raise SnapshotError(f"walk key without value at line {index + 1}")
        value = lines[index + 1].strip()
        if value.startswith("Request Failed:"):
            raise SnapshotError(f"walk key without value at line {index + 1}")
        pairs.append((re.sub(r"\s+", "", key), value))
        index += 2
    if not pairs:
        raise SnapshotError("walk contains no SNMP objects")
    return pairs


def parse_mibs(paths: Iterable[Path]) -> dict[str, dict[str, object]]:
    definitions: dict[str, dict[str, object]] = {
        name: {"oid": oid, "kind": "root", "syntax": None}
        for name, oid in ROOT_OIDS.items()
    }
    text = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in paths)

    module_or_oid_patterns = (
        re.compile(
            r"^([A-Za-z][A-Za-z0-9_-]*)\s+MODULE-IDENTITY\b[\s\S]*?"
            r"::=\s*\{\s*([A-Za-z][A-Za-z0-9_-]*)\s+(\d+)\s*\}",
            re.MULTILINE,
        ),
        re.compile(
            r"^([A-Za-z][A-Za-z0-9_-]*)\s+OBJECT IDENTIFIER\s*"
            r"::=\s*\{\s*([A-Za-z][A-Za-z0-9_-]*)\s+(\d+)\s*\}",
            re.MULTILINE,
        ),
    )
    for pattern in module_or_oid_patterns:
        for match in pattern.finditer(text):
            definitions[match.group(1)] = {
                "parent": match.group(2),
                "sub": int(match.group(3)),
                "kind": "oid",
                "syntax": None,
            }

    object_pattern = re.compile(
        r"^([A-Za-z][A-Za-z0-9_-]*)\s+OBJECT-TYPE\b([\s\S]*?)"
        r"::=\s*\{\s*([A-Za-z][A-Za-z0-9_-]*)\s+(\d+)\s*\}",
        re.MULTILINE,
    )
    for match in object_pattern.finditer(text):
        syntax_match = re.search(
            r"^\s*SYNTAX\s+([^\r\n]+)", match.group(2), re.MULTILINE
        )
        definitions[match.group(1)] = {
            "parent": match.group(3),
            "sub": int(match.group(4)),
            "kind": "object",
            "syntax": syntax_match.group(1).strip() if syntax_match else None,
        }

    while True:
        resolved = 0
        for definition in definitions.values():
            if "oid" in definition or "parent" not in definition:
                continue
            parent = definitions.get(str(definition["parent"]))
            if parent and "oid" in parent:
                definition["oid"] = f'{parent["oid"]}.{definition["sub"]}'
                resolved += 1
        if not resolved:
            break
    return definitions


def syntax_tag(syntax: str | None) -> int | None:
    if not syntax:
        return None
    normalized = syntax.strip().upper()
    if normalized.startswith(("INTEGER", "INTEGER32")):
        return 2
    if normalized.startswith(("DISPLAYSTRING", "DATEANDTIME", "OCTET STRING")):
        return 4
    if normalized.startswith("OBJECT IDENTIFIER"):
        return 6
    if normalized.startswith("IPADDRESS"):
        return 64
    if normalized.startswith(("COUNTER32", "COUNTER ")):
        return 65
    if normalized.startswith(("GAUGE32", "UNSIGNED32")):
        return 66
    if normalized.startswith("TIMETICKS"):
        return 67
    if normalized.startswith("OPAQUE"):
        return 68
    if normalized.startswith("COUNTER64"):
        return 70
    return None


def infer_tag(value: str) -> int:
    if ENUM_VALUE.fullmatch(value) or INTEGER_VALUE.fullmatch(value):
        return 2
    if IP_VALUE.fullmatch(value):
        octets = [int(part) for part in value.split(".")]
        if all(0 <= part <= 255 for part in octets):
            return 64
    # Preserve decimal strings as text when their numeric OID has no symbolic
    # MIB definition. Converting them to INTEGER would invent ASN.1 typing.
    return 4


def typed_value(tag: int, value: str) -> object:
    if tag in {2, 65, 66, 67, 70}:
        enum_match = ENUM_VALUE.fullmatch(value)
        raw = enum_match.group(1) if enum_match else value
        if not INTEGER_VALUE.fullmatch(raw):
            raise SnapshotError(f"non-integer value {value!r} for numeric ASN.1 tag {tag}")
        return int(raw)
    if tag == 64:
        if not IP_VALUE.fullmatch(value):
            raise SnapshotError(f"invalid IpAddress value {value!r}")
        octets = [int(part) for part in value.split(".")]
        if not all(0 <= part <= 255 for part in octets):
            raise SnapshotError(f"invalid IpAddress value {value!r}")
        return value
    if tag == 6:
        candidate = value.lstrip(".")
        if not NUMERIC_OID.fullmatch(candidate):
            raise SnapshotError(f"invalid OBJECT IDENTIFIER value {value!r}")
        return candidate
    return value


def snmprec_value(tag: int, value: object) -> tuple[str, str]:
    if tag == 4:
        # Hex form is robust to pipes, control characters and empty strings.
        return "4x", str(value).encode("utf-8").hex()
    if tag == 68:
        return "68x", str(value).encode("utf-8").hex()
    return str(tag), str(value)


def oid_sort_key(oid: str) -> tuple[int, ...]:
    return tuple(int(part) for part in oid.split("."))


def build_snapshot(
    walk_path: Path,
    mib_paths: list[Path],
    serial_override: str | None = None,
) -> tuple[list[dict[str, object]], dict[str, object]]:
    pairs = parse_walk(walk_path)
    definitions = parse_mibs(mib_paths)
    items: list[dict[str, object]] = []
    seen: set[str] = set()
    symbolic_resolved = 0
    original_numeric = 0
    inferred_types = 0
    displayed_textual_conventions = 0

    for raw_key, observed in pairs:
        syntax = None
        source_name = None
        type_evidence = "MIB"

        if NUMERIC_OID.fullmatch(raw_key):
            oid = raw_key.lstrip(".")
            original_numeric += 1
            tag = infer_tag(observed)
            inferred_types += 1
            type_evidence = "INFERRED_FROM_WALK_TEXT"
        else:
            parts = raw_key.split(".")
            source_name = parts[0]
            if not IDENT.fullmatch(source_name):
                raise SnapshotError(f"invalid symbolic object {source_name!r}")
            definition = definitions.get(source_name)
            if not definition or "oid" not in definition:
                raise SnapshotError(f"unresolved symbolic object {source_name}")
            suffix = ".".join(parts[1:])
            oid = str(definition["oid"]) + (f".{suffix}" if suffix else "")
            syntax = definition.get("syntax")
            tag = syntax_tag(str(syntax) if syntax is not None else None)
            if tag is None:
                tag = infer_tag(observed)
                inferred_types += 1
                type_evidence = "INFERRED_UNSUPPORTED_MIB_SYNTAX"
            else:
                symbolic_resolved += 1
            if syntax and str(syntax).upper().startswith("DATEANDTIME"):
                # The walk exported a display rendering, not original BER bytes.
                displayed_textual_conventions += 1
                type_evidence = "MIB_TEXTUAL_CONVENTION_WALK_RENDERING"

        if oid in seen:
            raise SnapshotError(f"duplicate resolved OID {oid}")
        seen.add(oid)

        if source_name == "powerSystemSerialNumber" and serial_override:
            observed = serial_override

        value = typed_value(tag, observed)
        items.append(
            {
                "oid": oid,
                "tag": tag,
                "type": TAG_TO_TYPE.get(tag, "OctetString"),
                "value": value,
                "sourceName": source_name,
                "syntax": syntax,
                "typeEvidence": type_evidence,
            }
        )

    items.sort(key=lambda item: oid_sort_key(str(item["oid"])))
    manifest = {
        "schema": "telxius.smartpack2.snapshot-manifest.v1",
        "objectCount": len(items),
        "originalNumericOidCount": original_numeric,
        "symbolicResolvedCount": symbolic_resolved,
        "inferredTypeCount": inferred_types,
        "walkRenderedTextualConventionCount": displayed_textual_conventions,
        "unresolvedSymbolicCount": 0,
        "serialOverridden": bool(serial_override),
        "evidence": {
            "walkSha256": sha256(walk_path),
            "mibSha256": {path.name: sha256(path) for path in mib_paths},
        },
        "truthBoundary": [
            "numeric OIDs are resolved from the supplied walk and MIB files",
            "values reproduce the supplied walk snapshot",
            "ASN.1 type is inferred only where the walk exposed a numeric OID without a MIB symbol",
            "textual conventions rendered by the walk are replayed as their displayed text, not claimed byte-identical BER",
            "this snapshot is laboratory evidence replay, not live field commissioning",
        ],
    }
    return items, manifest


def write_outputs(
    items: list[dict[str, object]],
    manifest: dict[str, object],
    snmprec_path: Path,
    json_path: Path,
    manifest_path: Path,
) -> None:
    snmprec_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    records = []
    for item in items:
        tag, value = snmprec_value(int(item["tag"]), item["value"])
        records.append(f'{item["oid"]}|{tag}|{value}')
    snmprec_path.write_text("\n".join(records) + "\n", encoding="utf-8")
    json_path.write_text(
        json.dumps(
            {"schema": "telxius.smartpack2.snapshot.v1", "items": items},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--walk", type=Path, required=True)
    parser.add_argument(
        "--mib-list",
        required=True,
        help="Colon-separated list of private MIB file paths",
    )
    parser.add_argument("--out-snmprec", type=Path, required=True)
    parser.add_argument("--out-json", type=Path, required=True)
    parser.add_argument("--out-manifest", type=Path, required=True)
    parser.add_argument(
        "--serial-override",
        default=os.getenv("TELXIUS_SMARTPACK2_SN_OVERRIDE", "").strip(),
    )
    args = parser.parse_args()

    mib_paths = [Path(value) for value in args.mib_list.split(":") if value.strip()]
    if not mib_paths:
        raise SnapshotError("at least one MIB file is required")
    for path in [args.walk, *mib_paths]:
        if not path.is_file():
            raise SnapshotError(f"evidence file not found: {path}")

    items, manifest = build_snapshot(
        args.walk,
        mib_paths,
        serial_override=args.serial_override or None,
    )
    write_outputs(
        items,
        manifest,
        args.out_snmprec,
        args.out_json,
        args.out_manifest,
    )
    print(
        json.dumps(
            {
                "event": "telxius.smartpack2.snapshot.built",
                "objectCount": manifest["objectCount"],
                "symbolicResolvedCount": manifest["symbolicResolvedCount"],
                "originalNumericOidCount": manifest["originalNumericOidCount"],
                "inferredTypeCount": manifest["inferredTypeCount"],
                "serialOverridden": manifest["serialOverridden"],
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
