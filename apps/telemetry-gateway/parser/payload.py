from dataclasses import dataclass
import json

@dataclass(frozen=True)
class ParsedMessage:
    serial: str
    msgid: str
    observed_at_epoch: int
    sendtime_epoch: int
    reported: dict

class PayloadError(ValueError): pass

def parse_message(topic,raw_payload):
    parts=topic.split("/")
    if len(parts)<3 or parts[-2]!="dev":
        raise PayloadError(f"unexpected topic: {topic}")
    topic_serial=parts[-1]
    try:
        payload=json.loads(raw_payload.decode("utf-8"))
    except (UnicodeDecodeError,json.JSONDecodeError) as exc:
        raise PayloadError(f"invalid JSON: {exc}") from exc
    if payload.get("method")!="update":
        raise PayloadError("unsupported method")
    if not isinstance(payload.get("reported"),dict):
        raise PayloadError("reported must be an object")
    serial=str(payload.get("sn",""))
    if not serial or serial!=topic_serial:
        raise PayloadError("topic serial and payload sn do not match")
    try:
        observed=int(payload["timestamp"]); sendtime=int(payload.get("sendtime",observed))
    except (KeyError,TypeError,ValueError) as exc:
        raise PayloadError("invalid timestamp") from exc
    return ParsedMessage(serial,str(payload.get("msgid","")),observed,sendtime,payload["reported"])
