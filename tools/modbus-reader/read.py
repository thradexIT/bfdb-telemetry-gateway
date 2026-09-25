import argparse,socket,struct,time

def recv_exact(sock,count):
    data=bytearray()
    while len(data)<count:
        chunk=sock.recv(count-len(data))
        if not chunk: raise ConnectionError("connection closed")
        data.extend(chunk)
    return bytes(data)

def read_input_registers(host,port,unit,address,count):
    tx=int(time.time()*1000)&0xFFFF
    pdu=struct.pack(">BHH",4,address,count)
    mbap=struct.pack(">HHHB",tx,0,len(pdu)+1,unit)
    with socket.create_connection((host,port),timeout=5) as s:
        s.sendall(mbap+pdu)
        header=recv_exact(s,7)
        rtx,protocol,length,runit=struct.unpack(">HHHB",header)
        if (rtx,protocol,runit)!=(tx,0,unit): raise RuntimeError("invalid MBAP")
        body=recv_exact(s,length-1)
        if body[0]&0x80: raise RuntimeError(f"Modbus exception={body[1]}")
        raw=body[2:2+body[1]]
        return list(struct.unpack(">"+("H"*(len(raw)//2)),raw))

def f32(r):
    return struct.unpack(">f",struct.pack(">HH",r[0],r[1]))[0]

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--host",default="127.0.0.1")
    p.add_argument("--port",type=int,default=1502)
    p.add_argument("--unit",type=int,choices=(1,2,3),default=1)
    p.add_argument("--circuit",type=int,choices=range(1,97),default=1)
    a=p.parse_args()
    base=(a.circuit-1)*8
    r=read_input_registers(a.host,a.port,a.unit,base,8)
    print(f"Unit ID {a.unit} Circuit {a.circuit:02d}")
    print(f"Voltage = {f32(r[0:2]):.4f} V")
    print(f"Current = {f32(r[2:4]):.4f} A")
    print(f"Power   = {f32(r[4:6]):.4f} W")
    print(f"Energy  = {f32(r[6:8]):.6f} kWh")

if __name__=="__main__":
    main()
