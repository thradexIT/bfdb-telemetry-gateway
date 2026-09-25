import json,time
import paho.mqtt.client as mqtt

class MqttPublisher:
    def __init__(self,host,port,qos,retain):
        self.host=host; self.port=port; self.qos=qos; self.retain=retain
        self.client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,client_id="bfdb-field-emulator")
    def connect(self):
        while True:
            try:
                self.client.connect(self.host,self.port,keepalive=30)
                self.client.loop_start()
                return
            except OSError as exc:
                print(f"MQTT_CONNECT_RETRY error={exc}",flush=True)
                time.sleep(2)
    def publish(self,topic,payload):
        body=json.dumps(payload,separators=(",",":"))
        info=self.client.publish(topic,body,qos=self.qos,retain=self.retain)
        if info.rc!=mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"MQTT publish failed rc={info.rc}")
