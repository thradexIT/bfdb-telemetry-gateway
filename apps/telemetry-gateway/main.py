import asyncio
from datetime import datetime,timezone
import os
from pathlib import Path
import yaml

from modbus.server import ModbusProjection
from mqtt.subscriber import MqttSubscriber
from normalizer.identity import IdentityError,IdentityResolver
from normalizer.telemetry import NormalizeError,normalize_patch
from parser.payload import PayloadError,parse_message
from quality.engine import quality_label,quality_word
from state.store import LatestStateStore
from timeseries.repository import TimeSeriesRepository
from history_api import start_history_server

ROOT=Path(__file__).resolve().parents[2]
CONFIG=ROOT/"config"

def load_yaml(name):
    with (CONFIG/name).open("r",encoding="utf-8") as f:
        return yaml.safe_load(f)

def utc_from_epoch(epoch):
    return datetime.fromtimestamp(epoch,tz=timezone.utc)

async def main():
    devices=load_yaml("devices.yaml")["devices"]
    resolver=IdentityResolver(devices)
    state=LatestStateStore()

    dsn=(
        f"host={os.getenv('DB_HOST','timescaledb')} "
        f"port={os.getenv('DB_PORT','5432')} "
        f"dbname={os.getenv('DB_NAME','bfdb')} "
        f"user={os.getenv('DB_USER','bfdb')} "
        f"password={os.getenv('DB_PASSWORD','bfdb_dev')}"
    )
    tsdb=TimeSeriesRepository(dsn)
    history_server=start_history_server(
        tsdb,
        os.getenv("HISTORY_API_HOST","0.0.0.0"),
        int(os.getenv("HISTORY_API_PORT","8080"))
    )
    projection=ModbusProjection([int(d["unitId"]) for d in devices])
    stale_after=float(os.getenv("STALE_AFTER_SECONDS","15"))
    queue=asyncio.Queue(maxsize=20000)
    loop=asyncio.get_running_loop()

    def enqueue(topic,payload):
        def put():
            try:
                queue.put_nowait((topic,payload))
            except asyncio.QueueFull:
                print("MQTT_QUEUE_FULL dropped=1",flush=True)
        loop.call_soon_threadsafe(put)

    subscriber=MqttSubscriber(
        os.getenv("MQTT_HOST","mosquitto"),
        int(os.getenv("MQTT_PORT","1883")),
        os.getenv("MQTT_TOPIC","data/dev/#"),
        enqueue,
        os.getenv("MQTT_USERNAME"),
        os.getenv("MQTT_PASSWORD"),
    )
    subscriber.start()

    async def process():
        while True:
            topic,raw=await queue.get()
            try:
                parsed=parse_message(topic,raw)
                observed=utc_from_epoch(parsed.observed_at_epoch)

                for raw_id,raw_patch in parsed.reported.items():
                    ident=resolver.resolve(parsed.serial,raw_id)
                    patch=normalize_patch(raw_patch,ident.fields)
                    point,changed=state.merge(ident.bfdb_id,ident.circuit_id,observed,patch)

                    projection.write_point(ident.unit_id,ident.circuit_id,point)

                    qword=quality_word(point,datetime.now(timezone.utc),stale_after)
                    projection.write_quality(ident.unit_id,ident.circuit_id,qword)

                    if any(x in changed for x in ("voltage","current","power","energy")):
                        tsdb.insert_sample(
                            observed_at=observed,
                            bfdb_id=ident.bfdb_id,
                            serial=ident.serial,
                            circuit_id=ident.circuit_id,
                            raw_point_id=ident.raw_point_id,
                            point=point,
                            quality=quality_label(qword),
                            msgid=parsed.msgid,
                            changed_fields=changed,
                        )

                print(f"MQTT_RX topic={topic} msgid={parsed.msgid} points={len(parsed.reported)}",flush=True)

            except (PayloadError,IdentityError,NormalizeError,ValueError) as exc:
                print(f"DECODE_ERROR topic={topic} error={exc}",flush=True)
            except Exception as exc:
                print(f"GATEWAY_ERROR topic={topic} error={type(exc).__name__}:{exc}",flush=True)
            finally:
                queue.task_done()

    async def refresh_quality():
        uid_by_bfdb={d["bfdbId"]:int(d["unitId"]) for d in devices}
        while True:
            now=datetime.now(timezone.utc)
            for (bfdb,circuit),point in list(state.all_points()):
                projection.write_quality(
                    uid_by_bfdb[bfdb],
                    circuit,
                    quality_word(point,now,stale_after)
                )
            await asyncio.sleep(1)

    print(f"GATEWAY_READY devices={len(devices)}",flush=True)
    await asyncio.gather(
        process(),
        refresh_quality(),
        projection.serve(
            os.getenv("MODBUS_HOST","0.0.0.0"),
            int(os.getenv("MODBUS_PORT","1502"))
        )
    )

if __name__=="__main__":
    asyncio.run(main())
