import {test} from 'node:test';
import assert from 'node:assert/strict';
import snmp from 'net-snmp';
import dgram from 'node:dgram';
import {once} from 'node:events';
import {NOTIFICATIONS,sendEltekTrap,trapScenario} from './eltek-traps.mjs';
test('all rev54 notifications cross UDP with distinguishable alarm and binary unknown fields',async()=>{
 const probe=dgram.createSocket('udp4');probe.bind(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;probe.close();
 const received=[];
 const receiver=snmp.createReceiver({port,address:'127.0.0.1',disableAuthorization:false},(error,packet)=>{
  assert.ifError(error);received.push(packet);
 });
 receiver.getAuthorizer().addCommunity('synthetic-test-only');
 await new Promise(r=>setTimeout(r,20));
 try {
  let counter=1;
  for(const name of Object.keys(NOTIFICATIONS))await sendEltekTrap({host:'127.0.0.1',port,version:'2c',community:'synthetic-test-only'},
   {name,active:true,counter:counter++,unknown:true});
  for(let i=0;i<100&&received.length<16;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(received.length,16);
  const oids=received.map(p=>p.pdu.varbinds.find(v=>v.oid==='1.3.6.1.6.3.1.1.4.1.0').value);
  assert.equal(new Set(oids).size,16);
  for(const packet of received){const raw=packet.pdu.varbinds.find(v=>v.oid==='1.3.6.1.4.1.99999.1.0');assert.deepEqual(raw.value,Buffer.from([0,255,128]));}
  const active=received[0].pdu.varbinds.find(v=>v.oid==='1.3.6.1.4.1.12148.10.1.1.4.0');assert.equal(active.value,1);
  const clear=trapScenario({name:'alarmPowerSystemTrap',active:false}).varbinds.find(v=>v.oid==='1.3.6.1.4.1.12148.10.1.1.4.0');assert.equal(clear.value,0);
 }finally{receiver.close();}
});
test('rejects invented notifications and impossible version/function combinations',async()=>{
 assert.throws(()=>trapScenario({name:'not-in-rev54'}));
 await assert.rejects(sendEltekTrap({host:'127.0.0.1',port:1162,version:'1',inform:true},{}));
});


test('builds the field-shaped SmartPack2 CtrlUnitPower major ON/OFF trap',()=>{
 const base={
  name:'alarmControlSystemTrap',
  sourceDescription:'CtrlUnitPower',
  statusOid:'1.3.6.1.4.1.12148.10.13.12.1.1.0',
  condition:3,
  metric:'voltage',
  measuredOid:'1.3.6.1.4.1.12148.10.13.12.1.5.0',
  measuredValue:1,
  alarmCounter:0,
  upTimeTicks:173850700,
 };
 const active=trapScenario({...base,active:true,counter:21});
 const clear=trapScenario({...base,active:false,counter:22,upTimeTicks:173862700});
 const byOid=(scenario,oid)=>scenario.varbinds.find(v=>v.oid===oid)?.value;
 assert.equal(active.oid,'1.3.6.1.4.1.12148.10.1.2.6');
 assert.equal(byOid(active,'1.3.6.1.4.1.12148.10.1.1.1.0'),'CtrlUnitPower');
 assert.equal(byOid(active,'1.3.6.1.4.1.12148.10.1.1.2.0'),'1.3.6.1.4.1.12148.10.13.12.1.1.0');
 assert.equal(byOid(active,'1.3.6.1.4.1.12148.10.1.1.3.0'),3);
 assert.equal(byOid(active,'1.3.6.1.4.1.12148.10.1.1.4.0'),1);
 assert.equal(byOid(active,'1.3.6.1.4.1.12148.10.1.1.5.0'),'1.3.6.1.4.1.12148.10.13.12.1.5.0');
 assert.equal(byOid(active,'1.3.6.1.4.1.12148.10.1.1.6.0'),1);
 assert.equal(byOid(active,'1.3.6.1.4.1.12148.10.1.1.7.0'),0);
 assert.equal(byOid(clear,'1.3.6.1.4.1.12148.10.1.1.4.0'),0);
 assert.equal(byOid(clear,'1.3.6.1.4.1.12148.10.1.1.7.0'),0);
});
