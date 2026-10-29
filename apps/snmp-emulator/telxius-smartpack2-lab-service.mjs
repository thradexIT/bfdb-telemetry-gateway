import snmp from 'net-snmp';

const ROOT = '1.3.6.1.4.1.8072.9999.2026.52';

const qdf = process.env.SNMP_LAB_QDF || 'QDF-UNKNOWN';
const sourceSerial = process.env.SNMP_LAB_SERIAL || `EMU-SMARTPACK2-${qdf}`;
const version = process.env.SNMP_VERSION || '2c';
const port = Number(process.env.SNMP_AGENT_PORT || 1161);
const scenario = process.env.SNMP_LAB_SCENARIO || 'NORMAL';

if (!['2c', '3'].includes(version)) throw new Error('SNMP_VERSION must be 2c or 3');
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('SNMP_AGENT_PORT must be 1024..65535');
if (!['NORMAL', 'FUSE_ALARM_CYCLE'].includes(scenario))
  throw new Error('SNMP_LAB_SCENARIO must be NORMAL or FUSE_ALARM_CYCLE');

const agent = snmp.createAgent(
  {
    port,
    address: '0.0.0.0',
    transport: 'udp4',
    disableAuthorization: false,
    accessControlModelType: snmp.AccessControlModelType.Simple,
  },
  (error) => {
    if (error) console.warn(JSON.stringify({ event: 'telxius.smartpack2.agent.error' }));
  },
);

const authorizer = agent.getAuthorizer();
if (version === '2c') {
  const community = process.env.SNMP_COMMUNITY || '';
  if (!community || /[\r\n]/.test(community)) throw new Error('SNMP_COMMUNITY required for v2c lab');
  authorizer.addCommunity(community);
  authorizer.getAccessControlModel().setCommunityAccess(community, snmp.AccessLevel.ReadOnly);
} else {
  const username = process.env.SNMP_V3_USERNAME || '';
  const authKey = process.env.SNMP_V3_AUTH_KEY || '';
  const privKey = process.env.SNMP_V3_PRIV_KEY || '';
  if (!username || authKey.length < 8 || privKey.length < 8)
    throw new Error('SNMPv3 authPriv credentials incomplete');
  const user = {
    name: username,
    level: snmp.SecurityLevel.authPriv,
    authProtocol: snmp.AuthProtocols.sha,
    authKey,
    privProtocol: snmp.PrivProtocols.aes,
    privKey,
  };
  authorizer.addUser(user);
  authorizer.getAccessControlModel().setUserAccess(username, snmp.AccessLevel.ReadOnly);
}

const mib = agent.getMib();
const scalar = (name, oid, type, value) => {
  mib.registerProvider({
    name,
    type: snmp.MibProviderType.Scalar,
    oid,
    scalarType: type,
    maxAccess: snmp.MaxAccess['read-only'],
  });
  mib.setScalarValue(name, value);
};

scalar('powerSystemStatus', `${ROOT}.1.1`, snmp.ObjectType.Integer, 1);
scalar('powerSystemType', `${ROOT}.1.2`, snmp.ObjectType.Integer, 4);
scalar('powerSystemNominalVoltage', `${ROOT}.1.3`, snmp.ObjectType.Integer, 48);
scalar('powerSystemLoadCurrentRaw', `${ROOT}.1.4`, snmp.ObjectType.Integer, 91);
scalar('powerSystemCompany', `${ROOT}.1.5`, snmp.ObjectType.OctetString, Buffer.from('TELXIUS CABLE PERU S.A.C.'));
scalar('powerSystemSite', `${ROOT}.1.6`, snmp.ObjectType.OctetString, Buffer.from('ESTACION LURIN'));
scalar('powerSystemModel', `${ROOT}.1.7`, snmp.ObjectType.OctetString, Buffer.from('SmartPack2 Touch'));
scalar('powerSystemSerialNumber', `${ROOT}.1.8`, snmp.ObjectType.OctetString, Buffer.from(sourceSerial));

const fuseOrder = ['A3', 'B3', 'A2', 'B2', 'A1', 'B1'];
for (const [index, panel] of fuseOrder.entries()) {
  scalar(`fuseAlarm-${panel}`, `${ROOT}.2.${index + 1}`, snmp.ObjectType.Integer, 0);
}

let cursor = 0;
let timer = null;
if (scenario === 'FUSE_ALARM_CYCLE') {
  timer = setInterval(() => {
    for (const panel of fuseOrder) mib.setScalarValue(`fuseAlarm-${panel}`, 0);
    const panel = fuseOrder[cursor % fuseOrder.length];
    mib.setScalarValue(`fuseAlarm-${panel}`, 1);
    cursor += 1;
  }, 15000);
}

console.info(JSON.stringify({
  event: 'telxius.smartpack2.agent.ready',
  qdf,
  sourceSerial,
  profile: 'SMARTPACK2_TELXIUS_SYNTHETIC',
  oidRoot: ROOT,
  evidence: 'Results SNMPWalk; numeric OIDs are synthetic lab-only',
}));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (timer) clearInterval(timer);
    agent.close();
    process.exit(0);
  });
}
