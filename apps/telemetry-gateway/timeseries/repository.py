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


    def query_history(self,*,serial,interval,bucket,raw_point_ids):
        params=[bucket,serial,interval]
        raw_filter=""
        if raw_point_ids:
            raw_filter=" AND raw_point_id = ANY(%s)"
            params.append(raw_point_ids)
        sql=f"""
        WITH per_point AS (
          SELECT
            time_bucket(%s::interval, observed_at) AS bucket,
            raw_point_id,
            AVG(voltage_v) AS voltage_v,
            AVG(current_a) AS current_a,
            AVG(power_w) AS power_w,
            AVG(energy_kwh) AS energy_kwh
          FROM telemetry_samples
          WHERE gateway_serial=%s
            AND observed_at >= NOW() - %s::interval
            {raw_filter}
          GROUP BY bucket, raw_point_id
        )
        SELECT
          bucket,
          AVG(voltage_v) AS voltage_v,
          AVG(current_a) AS current_a,
          AVG(power_w) AS power_w,
          AVG(energy_kwh) AS energy_kwh,
          COUNT(*) AS active_points
        FROM per_point
        GROUP BY bucket
        ORDER BY bucket ASC
        """
        with psycopg.connect(self.dsn,autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(sql,params)
                return [
                    {
                        "observedAt": row[0].isoformat(),
                        "voltageV": None if row[1] is None else float(row[1]),
                        "currentA": None if row[2] is None else float(row[2]),
                        "powerW": None if row[3] is None else float(row[3]),
                        "energyKwh": None if row[4] is None else float(row[4]),
                        "activeBreakers": int(row[5]),
                    }
                    for row in cur.fetchall()
                ]
