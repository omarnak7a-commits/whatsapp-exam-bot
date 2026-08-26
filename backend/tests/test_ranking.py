def test_ranking_rule():
    rows=[{"score":10,"time":500},{"score":10,"time":600},{"score":9,"time":100}]
    ordered=sorted(rows,key=lambda x:(-x["score"],x["time"]))
    assert ordered[0]["time"]==500
