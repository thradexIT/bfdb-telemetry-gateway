from datetime import datetime,timedelta,timezone
from state.store import LatestStateStore

def test_state_only_preserves_values():
    s=LatestStateStore(); t=datetime.now(timezone.utc)
    s.merge("BFDB-01",1,t,{"state":"ONLINE","voltage":12.23,"current":11.41,"power":139.45,"energy":1.50})
    p,changed=s.merge("BFDB-01",1,t+timedelta(seconds=1),{"state":"ONLINE"})
    assert changed==["state"]
    assert p.metrics["voltage"].value==12.23
    assert p.metrics["current"].value==11.41
    assert p.metrics["power"].value==139.45
    assert p.metrics["energy"].value==1.50

def test_out_of_order_does_not_overwrite():
    s=LatestStateStore(); t=datetime.now(timezone.utc)
    s.merge("BFDB-01",1,t+timedelta(seconds=10),{"current":8.0})
    p,changed=s.merge("BFDB-01",1,t,{"current":1.0})
    assert changed==[]
    assert p.metrics["current"].value==8.0
