from dataclasses import dataclass,field

METRICS=("voltage","current","power","energy")

@dataclass
class MetricValue:
    value: float
    observed_at: object

@dataclass
class PointState:
    metrics: dict=field(default_factory=dict)
    state: str|None=None
    state_observed_at: object|None=None

class LatestStateStore:
    def __init__(self): self._points={}
    def get(self,bfdb_id,circuit_id): return self._points.get((bfdb_id,circuit_id))
    def all_points(self): return self._points.items()
    def merge(self,bfdb_id,circuit_id,observed_at,patch):
        p=self._points.setdefault((bfdb_id,circuit_id),PointState()); changed=[]
        for metric in METRICS:
            if metric not in patch: continue
            old=p.metrics.get(metric)
            if old is None or observed_at>=old.observed_at:
                p.metrics[metric]=MetricValue(float(patch[metric]),observed_at); changed.append(metric)
        if "state" in patch and (p.state_observed_at is None or observed_at>=p.state_observed_at):
            p.state=str(patch["state"]); p.state_observed_at=observed_at; changed.append("state")
        return p,changed
