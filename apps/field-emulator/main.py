import os,time,yaml
from pathlib import Path
from electrical.model import ElectricalFleet
from mqtt.publisher import MqttPublisher
from mqtt.point_id import encode_panelized_point_id

ROOT=Path(__file__).resolve().parents[2]
CONFIG=ROOT/"config"

def load_yaml(name):
    with (CONFIG/name).open("r",encoding="utf-8") as f:
        return yaml.safe_load(f)

def point_payload(s):
    return {
        "state":"ONLINE",
        "U1":f"{s.voltage_v:.2f}","U2":"0.00",
        "I1":f"{s.current_a:.2f}","I2":"0.00",
        "P1":f"{s.power_w:.2f}","P2":"0.00",
        "EP1":f"{s.energy_kwh:.4f}","EP2":"0.00"
    }

def main():
    devices=load_yaml("devices.yaml")["devices"]
    cfg=load_yaml("emulator.yaml")
    pubcfg=cfg["publish"]

    pub=MqttPublisher(
        os.getenv("MQTT_HOST","mosquitto"),
        int(os.getenv("MQTT_PORT","1883")),
        int(pubcfg["qos"]),
        bool(pubcfg["retain"]),
        os.getenv("MQTT_USERNAME"),
        os.getenv("MQTT_PASSWORD"),
    )
    pub.connect()

    fleet=ElectricalFleet(cfg,devices)
    interval=float(pubcfg["intervalSeconds"])
    batch=int(pubcfg["batchSize"])
    circuits=int(cfg["electrical"]["circuitsPerBfdb"])
    positions_per_panel=int(cfg["electrical"].get("positionsPerPanel",24))

    if circuits % positions_per_panel != 0:
        raise ValueError(
            f"circuitsPerBfdb={circuits} must be divisible by positionsPerPanel={positions_per_panel}"
        )

    cursors={d["bfdbId"]:1 for d in devices}
    msgid=1000
    cycle=0
    last=time.monotonic()

    print(
        f"EMULATOR_READY devices={len(devices)} "
        f"circuits_per_bfdb={circuits} "
        f"positions_per_panel={positions_per_panel} "
        f"panels_per_bfdb={circuits//positions_per_panel}",
        flush=True,
    )

    while True:
        now=time.monotonic()
        elapsed=max(0.001,now-last)
        last=now
        fleet.tick_all(elapsed)
        cycle+=1

        for d in devices:
            start=cursors[d["bfdbId"]]
            selected=[((start-1+i)%circuits)+1 for i in range(batch)]
            cursors[d["bfdbId"]]=((start-1+batch)%circuits)+1

            reported={
                encode_panelized_point_id(c,positions_per_panel):
                    point_payload(fleet.get(d["bfdbId"],c))
                for c in selected
            }

            if (
                cfg["partialUpdates"]["enabled"]
                and cycle>4
                and msgid%int(cfg["partialUpdates"]["stateOnlyEveryMessages"])==0
            ):
                partial_id=encode_panelized_point_id(selected[0],positions_per_panel)
                reported[partial_id]={"state":"ONLINE"}

            epoch=int(time.time())
            payload={
                "msgid":str(msgid),
                "method":"update",
                "sn":d["serial"],
                "timestamp":epoch,
                "sendtime":epoch,
                "version":1,
                "reported":reported
            }
            topic=pubcfg["topicTemplate"].format(serial=d["serial"])
            pub.publish(topic,payload)
            print(
                f"MQTT_TX topic={topic} msgid={msgid} "
                f"points={len(reported)}",
                flush=True,
            )
            msgid+=1

        time.sleep(interval)

if __name__=="__main__":
    main()
