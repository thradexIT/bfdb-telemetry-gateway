import snmp from 'net-snmp';
import {pathToFileURL} from 'node:url';
// Notification and varbind OIDs from the supplied Eltek eNexus rev54 MIB.
// These are synthetic scenarios using vendor OID structure, not hardware certification.
const root = '1.3.6.1.4.1.12148.10';
export const NOTIFICATIONS = Object.freeze({
  alarmPowerSystemTrap:1,alarmBatteryTrap:2,alarmLoadGroupTrap:3,alarmMainsTrap:4,
  alarmRectifierTrap:5,alarmControlSystemTrap:6,alarmDcDcTrap:7,alarmInputsTrap:8,
  alarmOutputsTrap:9,alarmGeneratorTrap:10,alarmSolarChargerTrap:11,alarmWindChargerTrap:12,
  infoHeartBeatTrap:13,alarmInverterTrap:14,alarmGridInverterTrap:15,alarmRectiverterTrap:16,
});
export function trapScenario({name='alarmPowerSystemTrap',active=true,statusOid=`${root}.2.1.0`,condition=3,counter=1,unknown=false}) {
  if(!Object.hasOwn(NOTIFICATIONS,name)||typeof active!=='boolean'||!Number.isInteger(counter)||counter<0||
    !Number.isInteger(condition)||condition<0||condition>19||!/^1\.3\.6\.1\.[0-9.]+$/.test(statusOid))throw new Error('Invalid synthetic trap scenario');
  const oid=`${root}.1.2.${NOTIFICATIONS[name]}`;
  const varbinds=name==='infoHeartBeatTrap'?[]:[
    {oid:`${root}.1.1.1.0`,type:snmp.ObjectType.OctetString,value:'SYNTHETIC-LAB'},
    {oid:`${root}.1.1.2.0`,type:snmp.ObjectType.OID,value:statusOid},
    {oid:`${root}.1.1.3.0`,type:snmp.ObjectType.Integer,value:condition},
    {oid:`${root}.1.1.4.0`,type:snmp.ObjectType.Integer,value:active?1:0},
    {oid:`${root}.1.1.5.0`,type:snmp.ObjectType.OID,value:`${root}.2.9.0`},
    {oid:`${root}.1.1.6.0`,type:snmp.ObjectType.Integer,value:480},
    {oid:`${root}.1.1.7.0`,type:snmp.ObjectType.Integer,value:counter},
    {oid:`${root}.1.1.8.0`,type:snmp.ObjectType.OctetString,value:Buffer.from([0x07,0xea,10,23,17,0,0,0])},
  ];
  if(unknown)varbinds.push({oid:'1.3.6.1.4.1.99999.1.0',type:snmp.ObjectType.OctetString,value:Buffer.from([0,255,128])});
  return {oid,varbinds};
}
export async function sendEltekTrap(config, scenario) {
  if(!config.host||!Number.isInteger(config.port)||config.port<1||config.port>65535||!['1','2c','3'].includes(config.version))throw new Error('Invalid trap target');
  if(config.inform&&config.version==='1')throw new Error('SNMPv1 has no informs');
  const options={port:config.port,trapPort:config.port,version:config.version==='3'?snmp.Version3:config.version==='1'?snmp.Version1:snmp.Version2c,timeout:2000,retries:1};
  const session=config.version==='3'?snmp.createV3Session(config.host,{
    name:config.username,level:snmp.SecurityLevel.authPriv,authProtocol:snmp.AuthProtocols.sha,
    authKey:config.authKey,privProtocol:snmp.PrivProtocols.aes,privKey:config.privKey,
  },options):snmp.createSession(config.host,config.community,options);
  try {
    const {oid,varbinds}=trapScenario(scenario);
    await new Promise((resolve,reject)=>session[config.inform?'inform':'trap'](oid,varbinds,{upTime:scenario.counter??1},e=>e?reject(e):resolve()));
  } finally {session.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const config={host:process.env.SNMP_TRAP_TARGET_HOST||'127.0.0.1',port:Number(process.env.SNMP_TRAP_TARGET_PORT||1162),
  version:process.env.SNMP_VERSION||'3',community:process.env.SNMP_COMMUNITY,
  username:process.env.SNMP_V3_USERNAME,authKey:process.env.SNMP_V3_AUTH_KEY,privKey:process.env.SNMP_V3_PRIV_KEY,
  inform:process.env.SNMP_TRAP_INFORM==='true'};
 const names=process.env.SNMP_TRAP_NAME==='ALL'?Object.keys(NOTIFICATIONS):[process.env.SNMP_TRAP_NAME||'alarmPowerSystemTrap'];
 let counter=1;
 for(const name of names){await sendEltekTrap(config,{name,active:process.env.SNMP_TRAP_ACTIVE!=='false',counter:counter++,unknown:process.env.SNMP_TRAP_UNKNOWN==='true'});}
 console.info(JSON.stringify({event:'synthetic.eltek.traps.sent',count:names.length}));
}
