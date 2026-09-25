from state.store import METRICS
BITS={"voltage":0,"current":1,"power":2,"energy":3}

def quality_word(point,now,stale_after_seconds):
    if point is None: return 0
    word=0; seen=False; stale=False
    for metric in METRICS:
        mv=point.metrics.get(metric)
        if mv is None: continue
        seen=True
        if (now-mv.observed_at).total_seconds()<=stale_after_seconds:
            word|=1<<BITS[metric]
        else:
            stale=True
    if stale: word|=1<<4
    if seen: word|=1<<5
    if point.state=="ONLINE": word|=1<<6
    elif point.state not in (None,"ONLINE"): word|=1<<7
    return word

def quality_label(word):
    if word==0: return "MISSING"
    if word&(1<<7): return "INVALID"
    if word&(1<<4): return "STALE"
    if (word&0b1111)==0b1111: return "GOOD"
    return "PARTIAL"
