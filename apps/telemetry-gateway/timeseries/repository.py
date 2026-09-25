import time
import psycopg

class TimeSeriesRepository:
    def __init__(self,dsn):
        self.dsn=dsn; self.conn=self._connect()
    def _connect(self):
        while True:
            try:
                c=psycopg.connect(self.dsn,autocommit=True)
                print("TSDB_CONNECTED",flush=True)
                return c
            except psycopg.OperationalError as exc:
                print(f"TSDB_CONNECT_RETRY error={exc}",flush=True)
                time.sleep(2)
    def insert_sample(self,*,observed_at,bfdb_id,serial,circuit_id,raw_point_id,point,quality,msgid,changed_fields):
        vals={n:(point.metrics[n].value if n in point.metrics else None) for n in ("voltage","current","power","energy")}
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                INSERT INTO telemetry_samples
                (observed_at,received_at,bfdb_id,gateway_serial,circuit_id,raw_point_id,voltage_v,current_a,power_w,energy_kwh,state,quality,mqtt_msgid,changed_fields)
                VALUES (%s,NOW(),%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
                """,(observed_at,bfdb_id,serial,circuit_id,raw_point_id,vals["voltage"],vals["current"],vals["power"],vals["energy"],point.state,quality,msgid,changed_fields))
        except (psycopg.OperationalError,psycopg.InterfaceError):
            self.conn=self._connect()
            raise
