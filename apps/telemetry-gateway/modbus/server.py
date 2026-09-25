from pymodbus.datastore import ModbusSequentialDataBlock,ModbusSlaveContext,ModbusServerContext
from pymodbus.server import StartAsyncTcpServer
from modbus.registers import circuit_base,point_registers,quality_address

class ModbusProjection:
    def __init__(self,unit_ids):
        stores={}
        for uid in unit_ids:
            # PyModbus 3.8.x no longer accepts zero_mode on ModbusSlaveContext.
            # Both our writes and protocol reads use the same context addressing,
            # so zero-based protocol offsets remain consistent through the context.
            stores[uid]=ModbusSlaveContext(
                ir=ModbusSequentialDataBlock(0,[0]*1024)
            )
        self.context=ModbusServerContext(slaves=stores,single=False)

    def write_point(self,unit_id,circuit_id,point):
        self.context[unit_id].setValues(4,circuit_base(circuit_id),point_registers(point))

    def write_quality(self,unit_id,circuit_id,word):
        self.context[unit_id].setValues(4,quality_address(circuit_id),[word])

    async def serve(self,host,port):
        print(f"MODBUS_LISTEN host={host} port={port}",flush=True)
        await StartAsyncTcpServer(context=self.context,address=(host,port))
