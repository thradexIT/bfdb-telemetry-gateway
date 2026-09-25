import json
import pytest
from parser.payload import parse_message,PayloadError

def payload(sn="EMU-BFDB-01"):
    return json.dumps({"msgid":"1","method":"update","sn":sn,"timestamp":1,"sendtime":1,"version":1,"reported":{"0_1_1":{"state":"ONLINE"}}}).encode()

def test_topic_and_sn_match():
    p=parse_message("data/dev/EMU-BFDB-01",payload())
    assert p.serial=="EMU-BFDB-01"

def test_topic_and_sn_mismatch_rejected():
    with pytest.raises(PayloadError):
        parse_message("data/dev/EMU-BFDB-02",payload())
