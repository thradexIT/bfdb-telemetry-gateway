class NormalizeError(ValueError): pass

def _float(raw,name):
    try: return float(raw)
    except (TypeError,ValueError) as exc: raise NormalizeError(f"invalid {name}: {raw!r}") from exc

def normalize_patch(raw_patch,fields):
    out={}
    if "state" in raw_patch: out["state"]=str(raw_patch["state"])
    for canonical,raw_name in fields.items():
        if raw_name in raw_patch: out[canonical]=_float(raw_patch[raw_name],raw_name)
    return out
