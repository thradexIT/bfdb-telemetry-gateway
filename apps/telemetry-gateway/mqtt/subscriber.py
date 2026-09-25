import time
import paho.mqtt.client as mqtt

class MqttSubscriber:
    def __init__(self,host,port,topic,on_payload):
        self.host=host; self.port=port; self.topic=topic; self.on_payload=on_payload
        self.client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,client_id="bfdb-telemetry-gateway")
        self.client.on_connect=self._on_connect
        self.client.on_message=self._on_message
        self.client.on_disconnect=self._on_disconnect
    def _on_connect(self,client,userdata,flags,reason_code,properties):
        print(f"MQTT_CONNECTED reason={reason_code}",flush=True)
        client.subscribe(self.topic,qos=1)
    def _on_disconnect(self,client,userdata,disconnect_flags,reason_code,properties):
        print(f"MQTT_DISCONNECTED reason={reason_code}",flush=True)
    def _on_message(self,client,userdata,message):
        self.on_payload(message.topic,message.payload)
    def start(self):
        while True:
            try:
                self.client.connect(self.host,self.port,keepalive=30)
                self.client.loop_start()
                return
            except OSError as exc:
                print(f"MQTT_CONNECT_RETRY error={exc}",flush=True)
                time.sleep(2)
