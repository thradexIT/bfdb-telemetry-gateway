import { createReadOnlyAgent } from './agent.mjs';
import { collectorCommissioning } from './oid-profile.mjs';

function required(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error('Missing required SNMP emulator configuration: ' + name);
  return value;
}
function integer(name, fallback) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(parsed)) throw new Error('Invalid integer configuration: ' + name);
  return parsed;
}

const config = {
  bfdbId: required('SNMP_EMULATOR_BFDB_ID'),
  sourceIdentity: required('SNMP_EMULATOR_SOURCE_ID'),
  scenario: process.env.SNMP_EMULATOR_SCENARIO || 'NORMAL',
  username: required('SNMP_V3_USERNAME'),
  authKey: required('SNMP_V3_AUTH_KEY'),
  privKey: required('SNMP_V3_PRIV_KEY'),
  port: integer('SNMP_AGENT_PORT', 1161),
  host: process.env.SNMP_AGENT_HOST || '0.0.0.0',
  intervalMs: integer('SNMP_AGENT_UPDATE_MS', 1000),
};
const instance = createReadOnlyAgent(config);
console.info(JSON.stringify({
  event:'snmp.emulator.ready',
  kind:'LAB_SYNTHETIC_NOT_DELTA',
  bfdbId:config.bfdbId,
  sourceIdentity:config.sourceIdentity,
  udpPort:config.port,
  scenario:config.scenario,
  points:collectorCommissioning(config.sourceIdentity).measurements.map(x=>({oid:x.oid,metric:x.metric,feed:x.feed})),
}));
for (const signal of ['SIGTERM','SIGINT']) {
  process.on(signal, () => { instance.stop(); process.exit(0); });
}
