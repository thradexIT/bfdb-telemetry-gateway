import fs from 'node:fs';
import path from 'node:path';
import snmp from 'net-snmp';

const file = process.env.SMARTPACK2_PROFILE_FILE || '/app/config/telxius-smartpack2-walk.json';
const profile = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const version = process.env.SNMP_VERSION || profile.transport?.defaultVersion || '2c';
const host = process.env.SNMP_AGENT_HOST || '0.0.0.0';
const port = Number(process.env.SNMP_AGENT_PORT || 1161);

if (!['2c', '3'].includes(version)) throw new Error('SNMP_VERSION must be 2c or 3');
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('SNMP_AGENT_PORT must be 1024..65535');

const agent = snmp.createAgent(
  {
    port,
    address: host,
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
  if (!community || /[\r\n]/.test(community))
    throw new Error('SNMP_COMMUNITY required for v2c laboratory agent');
  authorizer.addCommunity(community);
  authorizer.getAccessControlModel().setCommunityAccess(
    community,
    snmp.AccessLevel.ReadOnly,
  );
} else {
  const username = process.env.SNMP_V3_USERNAME || '';
  const authKey = process.env.SNMP_V3_AUTH_KEY || '';
  const privKey = process.env.SNMP_V3_PRIV_KEY || '';
  if (!username || authKey.length < 8 || privKey.length < 8)
    throw new Error('SNMPv3 authPriv credentials incomplete');
  authorizer.addUser({
    name: username,
    level: snmp.SecurityLevel.authPriv,
    authProtocol: snmp.AuthProtocols.sha,
    authKey,
    privProtocol: snmp.PrivProtocols.aes,
    privKey,
  });
  authorizer.getAccessControlModel().setUserAccess(
    username,
    snmp.AccessLevel.ReadOnly,
  );
}

const mib = agent.getMib();
const objectType = (name) => {
  if (name === 'Integer') return snmp.ObjectType.Integer;
  if (name === 'OctetString') return snmp.ObjectType.OctetString;
  throw new Error('Unsupported profile type: ' + name);
};
const scalarValue = (item) => {
  const value = item.valueFromEnv
    ? (process.env[item.valueFromEnv] || item.fallback || '')
    : item.value;
  return item.type === 'OctetString' ? Buffer.from(String(value)) : Number(value);
};

for (const item of profile.scalars || []) {
  mib.registerProvider({
    name: item.name,
    type: snmp.MibProviderType.Scalar,
    oid: item.oid,
    scalarType: objectType(item.type),
    maxAccess: snmp.MaxAccess['read-only'],
  });
  mib.setScalarValue(item.name, scalarValue(item));
}

mib.registerProvider({
  name: 'telxiusLoadGroupEntry',
  type: snmp.MibProviderType.Table,
  oid: '1.3.6.1.4.1.12148.10.9.5.1',
  maxAccess: snmp.MaxAccess['not-accessible'],
  tableColumns: [
    { number: 1, name: 'loadGroupIndex', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['not-accessible'] },
    { number: 2, name: 'loadGroupStatus', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
    { number: 3, name: 'loadNumberOfLVLDs', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
    { number: 4, name: 'loadNumberOfVoltages', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
  ],
  tableIndex: [{ columnName: 'loadGroupIndex' }],
});
for (const row of profile.loadGroups || []) {
  mib.addTableRow('telxiusLoadGroupEntry', [
    row.index, row.status, row.numberOfLvlds, row.numberOfVoltages,
  ]);
}

mib.registerProvider({
  name: 'telxiusInputIoUnitsEntry',
  type: snmp.MibProviderType.Table,
  oid: '1.3.6.1.4.1.12148.10.11.3.1',
  maxAccess: snmp.MaxAccess['not-accessible'],
  tableColumns: [
    { number: 1, name: 'inputIoUnitIndex', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['not-accessible'] },
    { number: 2, name: 'inputIoUnitNumberOfInputs', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
  ],
  tableIndex: [{ columnName: 'inputIoUnitIndex' }],
});
mib.addTableRow('telxiusInputIoUnitsEntry', [
  profile.ioUnit.index,
  profile.ioUnit.numberOfInputs,
]);

mib.registerProvider({
  name: 'telxiusInputIoUnitProgInputEntry',
  type: snmp.MibProviderType.Table,
  oid: '1.3.6.1.4.1.12148.10.11.4.1',
  maxAccess: snmp.MaxAccess['not-accessible'],
  tableColumns: [
    { number: 1, name: 'inputIoUnitProgInputIndex', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['not-accessible'] },
    { number: 2, name: 'inputIoUnitProgInputStatus', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
    { number: 3, name: 'inputIoUnitProgInputDescription', type: snmp.ObjectType.OctetString,
      maxAccess: snmp.MaxAccess['read-only'] },
    { number: 4, name: 'inputIoUnitProgInputTrapRepeatCounter', type: snmp.ObjectType.Counter,
      maxAccess: snmp.MaxAccess['read-only'] },
    { number: 5, name: 'inputIoUnitProgInputAlarmEnable', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
    { number: 6, name: 'inputIoUnitProgInputValue', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
    { number: 7, name: 'inputIoUnitProgInputConfiguration', type: snmp.ObjectType.Integer,
      maxAccess: snmp.MaxAccess['read-only'] },
  ],
  tableIndex: [
    { columnName: 'inputIoUnitIndex', foreign: 'telxiusInputIoUnitsEntry' },
    { columnName: 'inputIoUnitProgInputIndex' },
  ],
});
for (const row of profile.programmableInputs || []) {
  mib.addTableRow('telxiusInputIoUnitProgInputEntry', [
    profile.ioUnit.index,
    row.index,
    row.status,
    row.description,
    0,
    row.alarmEnable,
    row.value,
    row.configuration,
  ]);
}

console.info(JSON.stringify({
  event: 'telxius.smartpack2.agent.ready',
  profile: profile.schema,
  version,
  host,
  port,
  sourceSerial: process.env.TELXIUS_SMARTPACK2_SN || 'EMU-SMARTPACK2-LURIN',
  evidence: profile.evidence,
}));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    agent.close();
    process.exit(0);
  });
}
