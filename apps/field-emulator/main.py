import copy
import os
import re
import time
import yaml
from pathlib import Path

from electrical.model import ElectricalFleet
from mqtt.publisher import MqttPublisher
from electrical.point_id import encode_panelized_point_id

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config"
SERIAL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$")


def load_yaml(name):
    candidate = Path(name)
    if candidate.name != name or candidate.suffix not in {".yaml", ".yml"}:
        raise ValueError(f"invalid emulator config filename: {name}")
    with (CONFIG / candidate).open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def apply_serial_overrides(devices):
    result = []
    seen = set()
    for source in devices:
        device = copy.deepcopy(source)
        env_name = str(device.get("serialEnv", "")).strip()
        if env_name:
            override = os.getenv(env_name, "").strip()
            if override:
                device["serial"] = override
        serial = str(device.get("serial", "")).strip()
        if not SERIAL_RE.fullmatch(serial):
            raise ValueError(f"invalid emulator serial for {device.get('bfdbId')}: {serial!r}")
        if serial in seen:
            raise ValueError(f"duplicate emulator serial: {serial}")
        seen.add(serial)
        result.append(device)
    return result


def point_payload(sample):
    return {
        "state": "ONLINE",
        "U1": f"{sample.voltage_v:.2f}", "U2": "0.00",
        "I1": f"{sample.current_a:.2f}", "I2": "0.00",
        "P1": f"{sample.power_w:.2f}", "P2": "0.00",
        "EP1": f"{sample.energy_kwh:.4f}", "EP2": "0.00",
    }


def panel_label(device, panel_index):
    ident = device["identity"]
    labels = (\n        ident.get("labPanelOrder")\n        or ident.get("physicalPanelOrder")\n        or ident.get("syntheticPanelOrder")\n        or []\n    )
    if labels and len(labels) != int(ident["panelsPerBfdb"]):
        raise ValueError(
            f"panel order length mismatch for {device['serial']}: "
            f"labels={len(labels)} panels={ident['panelsPerBfdb']}"
        )
    return str(labels[panel_index - 1]) if labels else str(panel_index)


def measured_positions(device, panel_index):
    configured = device["identity"].get("measuredPositionsByPanel")
    if configured is None:
        return None
    raw = configured.get(str(panel_index), configured.get(panel_index, []))
    values = {int(value) for value in raw}
    positions = int(device["identity"]["positionsPerPanel"])
    invalid = sorted(value for value in values if value < 1 or value > positions)
    if invalid:
        raise ValueError(
            f"measured position out of range for {device['serial']} "
            f"panel={panel_index}: {invalid}"
        )
    return values


def build_reported(device, fleet, panel_index, positions, positions_per_panel):
    measured = measured_positions(device, panel_index)
    reported = {}
    for position in positions:
        circuit = ((panel_index - 1) * positions_per_panel) + position
        raw_id = encode_panelized_point_id(circuit, positions_per_panel)
        if measured is not None and position not in measured:
            reported[raw_id] = {"state": "ONLINE"}
        else:
            reported[raw_id] = point_payload(fleet.get(device["bfdbId"], circuit))
    return reported


def validate_devices(devices, circuits, positions_per_panel):
    if circuits % positions_per_panel != 0:
        raise ValueError(
            f"circuitsPerBfdb={circuits} must be divisible by "
            f"positionsPerPanel={positions_per_panel}"
        )
    panels_per_bfdb = circuits // positions_per_panel

    for device in devices:
        ident = device["identity"]
        if ident["mode"] != "emulator_panelized":
            raise ValueError(
                f"emulator requires emulator_panelized identity mode for {device['serial']}"
            )
        if int(ident["positionsPerPanel"]) != positions_per_panel:
            raise ValueError(
                f"positionsPerPanel mismatch for {device['serial']}: "
                f"devices={ident['positionsPerPanel']} emulator={positions_per_panel}"
            )
        if int(ident["panelsPerBfdb"]) != panels_per_bfdb:
            raise ValueError(
                f"panelsPerBfdb mismatch for {device['serial']}: "
                f"devices={ident['panelsPerBfdb']} emulator={panels_per_bfdb}"
            )
        for panel_index in range(1, panels_per_bfdb + 1):
            panel_label(device, panel_index)
            measured_positions(device, panel_index)

    return panels_per_bfdb


def publish_message(pub, pubcfg, device, reported, msgid, epoch, *, panel_index=None):
    payload = {
        "msgid": str(msgid),
        "method": "update",
        "sn": device["serial"],
        "timestamp": epoch,
        "sendtime": epoch,
        "version": 1,
        "reported": reported,
    }
    topic = pubcfg["topicTemplate"].format(serial=device["serial"])
    pub.publish(topic, payload)
    suffix = ""
    if panel_index is not None:
        suffix = f" panel={panel_index} physical_panel={panel_label(device, panel_index)}"
    print(
        f"MQTT_TX topic={topic} msgid={msgid} points={len(reported)}{suffix}",
        flush=True,
    )


def main():
    devices_file = os.getenv("EMULATOR_DEVICES_FILE", "devices.yaml")
    emulator_file = os.getenv("EMULATOR_CONFIG_FILE", "emulator.yaml")
    devices = apply_serial_overrides(load_yaml(devices_file)["devices"])
    cfg = load_yaml(emulator_file)
    pubcfg = cfg["publish"]

    pub = MqttPublisher(
        os.getenv("MQTT_HOST", "mosquitto"),
        int(os.getenv("MQTT_PORT", "1883")),
        int(pubcfg["qos"]),
        bool(pubcfg["retain"]),
        os.getenv("MQTT_USERNAME"),
        os.getenv("MQTT_PASSWORD"),
    )
    pub.connect()

    fleet = ElectricalFleet(cfg, devices)
    interval = float(pubcfg["intervalSeconds"])
    batch = int(pubcfg.get("batchSize", 24))
    circuits = int(cfg["electrical"]["circuitsPerBfdb"])
    positions_per_panel = int(cfg["electrical"].get("positionsPerPanel", 24))
    panels_per_bfdb = validate_devices(devices, circuits, positions_per_panel)

    mode = str(pubcfg.get("mode", "rolling")).strip().lower()
    if mode not in {"rolling", "panel_chunks"}:
        raise ValueError(f"unsupported publish mode: {mode}")

    chunk_size = int(pubcfg.get("chunkSize", batch))
    if chunk_size < 1 or chunk_size > positions_per_panel:
        raise ValueError(f"chunkSize must be 1..{positions_per_panel}; got {chunk_size}")

    cursors = {device["bfdbId"]: 1 for device in devices}
    panel_cursors = {device["bfdbId"]: 1 for device in devices}
    msgid = time.time_ns()
    cycle = 0
    last = time.monotonic()

    print(
        f"EMULATOR_READY devices={len(devices)} "
        f"circuits_per_bfdb={circuits} "
        f"positions_per_panel={positions_per_panel} "
        f"panels_per_bfdb={panels_per_bfdb} "
        f"mode={mode} devices_file={devices_file} emulator_file={emulator_file}",
        flush=True,
    )

    while True:
        now = time.monotonic()
        elapsed = max(0.001, now - last)
        last = now
        fleet.tick_all(elapsed)
        cycle += 1

        for device in devices:
            if mode == "panel_chunks":
                panel_index = panel_cursors[device["bfdbId"]]
                panel_cursors[device["bfdbId"]] = (panel_index % panels_per_bfdb) + 1
                epoch = int(time.time())
                positions = list(range(1, positions_per_panel + 1))
                for offset in range(0, positions_per_panel, chunk_size):
                    selected = positions[offset:offset + chunk_size]
                    reported = build_reported(
                        device, fleet, panel_index, selected, positions_per_panel
                    )
                    publish_message(
                        pub, pubcfg, device, reported, msgid, epoch, panel_index=panel_index
                    )
                    msgid += 1
                continue

            start = cursors[device["bfdbId"]]
            selected = [((start - 1 + i) % circuits) + 1 for i in range(batch)]
            cursors[device["bfdbId"]] = ((start - 1 + batch) % circuits) + 1

            reported = {
                encode_panelized_point_id(circuit, positions_per_panel):
                    point_payload(fleet.get(device["bfdbId"], circuit))
                for circuit in selected
            }

            if (
                cfg["partialUpdates"]["enabled"]
                and cycle > 4
                and msgid % int(cfg["partialUpdates"]["stateOnlyEveryMessages"]) == 0
            ):
                partial_id = encode_panelized_point_id(selected[0], positions_per_panel)
                reported[partial_id] = {"state": "ONLINE"}

            epoch = int(time.time())
            publish_message(pub, pubcfg, device, reported, msgid, epoch)
            msgid += 1

        time.sleep(interval)


if __name__ == "__main__":
    main()
