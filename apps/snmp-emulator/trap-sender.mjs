import { sendSnapshot, trapSettings } from './trap-emitter.mjs';
function required(name) {
  const value = process.env[name];
  if (!value) throw new Error('Missing ' + name);
  return value;
}
const settings = trapSettings();
const config = {
  bfdbId: required('SNMP_EMULATOR_BFDB_ID'),
  profile: process.env.SNMP_EMULATOR_PROFILE || 'GENERIC_2_FEED',
  scenario: process.env.SNMP_EMULATOR_SCENARIO || 'NORMAL',
  username: process.env.SNMP_V3_USERNAME,
  authKey: process.env.SNMP_V3_AUTH_KEY,
  privKey: process.env.SNMP_V3_PRIV_KEY,
  community: process.env.SNMP_COMMUNITY,
};
let stopped = false;
for (const name of ['SIGINT', 'SIGTERM']) process.on(name, () => { stopped = true; });
const once = process.env.SNMP_TRAP_ONCE === 'true';
for (let sequence = 0; !stopped; sequence++) {
  try {
    const receipt = await sendSnapshot(config, settings, sequence);
    console.info(JSON.stringify({event:'snmp.lab.traps.sent', kind:'SYNTHETIC_NOT_FIELD_ELTEK', ...receipt}));
  } catch (error) {
    console.error(JSON.stringify({event:'snmp.lab.traps.failed', reason:String(error?.message ?? error)}));
    if (once) process.exitCode = 1;
  }
  if (once || stopped) break;
  await new Promise(resolve => setTimeout(resolve, settings.intervalMs));
}
