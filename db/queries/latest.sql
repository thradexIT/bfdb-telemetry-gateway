SELECT observed_at,received_at,bfdb_id,circuit_id,voltage_v,current_a,power_w,energy_kwh,state,quality,mqtt_msgid
FROM telemetry_samples
ORDER BY observed_at DESC
LIMIT 100;
