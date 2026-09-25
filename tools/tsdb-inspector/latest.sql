SELECT observed_at,bfdb_id,circuit_id,voltage_v,current_a,power_w,energy_kwh,state,quality
FROM telemetry_samples
ORDER BY observed_at DESC
LIMIT 50;
