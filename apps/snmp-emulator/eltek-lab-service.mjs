// Optional synthetic rev54 laboratory agent + configured notification sequence.
// Existing Delta/generic agent and MQTT emulator remain unchanged.
import snmp from "net-snmp";
import { SYNTHETIC_MEASUREMENTS } from "./eltek-traps.mjs";
import { emitSyntheticInventory, RICH_ENGINEERING_RAW } from "./eltek-rich-sweep.mjs";
import {
  loadSequence,
  parseSequence,
  runSequence,
  sequenceTarget,
} from "./eltek-sequence.mjs";
const sweepCount = Number(process.env.SNMP_LAB_SWEEP_COUNT || 0);
if (!Number.isInteger(sweepCount) || sweepCount < 0 || sweepCount > 10000)
  throw new Error('SNMP_LAB_SWEEP_COUNT must be 0..10000');
const rich = sweepCount > 0;
const loaded = await loadSequence();
const input = rich ? {
  ...loaded,
  steps: loaded.steps.map(step =>
    step.measuredValue !== undefined ? step :
    { ...step, measuredValue: RICH_ENGINEERING_RAW[step.metric || 'voltage'] }),
} : loaded;
parseSequence(input);
const config = sequenceTarget();
if (
  config.version !== "3" ||
  !config.username ||
  config.authKey?.length < 8 ||
  config.privKey?.length < 8
)
  throw new Error("Unified laboratory requires SNMPv3 authPriv credentials");
const agent = snmp.createAgent(
  {
    port: Number(process.env.SNMP_AGENT_PORT || 1161),
    address: "0.0.0.0",
    transport: "udp4",
    disableAuthorization: false,
    accessControlModelType: snmp.AccessControlModelType.Simple,
  },
  (error) => {
    if (error)
      console.warn(JSON.stringify({ event: "synthetic.eltek.agent.error" }));
  },
);
const auth = agent.getAuthorizer();
auth.addUser({
  name: config.username,
  level: snmp.SecurityLevel.authPriv,
  authProtocol: snmp.AuthProtocols.sha,
  authKey: config.authKey,
  privProtocol: snmp.PrivProtocols.aes,
  privKey: config.privKey,
});
auth
  .getAccessControlModel()
  .setUserAccess(config.username, snmp.AccessLevel.ReadOnly);
const mib = agent.getMib();
for (const [name, m] of Object.entries(SYNTHETIC_MEASUREMENTS)) {
  mib.registerProvider({
    name,
    type: snmp.MibProviderType.Scalar,
    oid: m.oid.slice(0, -2),
    scalarType: snmp.ObjectType.Integer,
    maxAccess: snmp.MaxAccess["read-only"],
  });
  mib.setScalarValue(name, rich ? RICH_ENGINEERING_RAW[name] : m.raw);
}
mib.registerProvider({
  name: "powerSystemStatus",
  type: snmp.MibProviderType.Scalar,
  oid: "1.3.6.1.4.1.12148.10.2.1",
  scalarType: snmp.ObjectType.Integer,
  maxAccess: snmp.MaxAccess["read-only"],
});
mib.setScalarValue("powerSystemStatus", 0);
const controller = new AbortController();
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => controller.abort());
try {
  if (rich) {
    const sweep = await emitSyntheticInventory(config, {
      count: sweepCount,
      batchSize: Number(process.env.SNMP_LAB_SWEEP_BATCH || 16),
      intervalMs: Number(process.env.SNMP_LAB_SWEEP_INTERVAL_MS || 40),
      signal: controller.signal,
    });
    console.info(JSON.stringify({ event: 'synthetic.eltek.sweep.sent', ...sweep }));
    if (!sweep.complete && !controller.signal.aborted)
      throw new Error('SNMP synthetic inventory incomplete');
  }
  await runSequence(config, input, {
    signal: controller.signal,
    onScenario: (scenario) => {
      const metric = scenario.metric || "voltage";
      mib.setScalarValue(
        metric,
        scenario.measuredValue ?? (rich ? RICH_ENGINEERING_RAW[metric] : SYNTHETIC_MEASUREMENTS[metric].raw),
      );
      if (scenario.name !== "infoHeartBeatTrap")
        mib.setScalarValue(
          "powerSystemStatus",
          scenario.active === false ? 0 : 3,
        );
    },
  });
} finally {
  agent.close();
}
