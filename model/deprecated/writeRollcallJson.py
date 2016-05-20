import json

def _toDataFrame(lol):
    df = {}
    for i in range(len(lol[0])):
        df[lol[0][i]] = [r[i] for r in lol[1:]]
    return df

def writeRollcall(rollcalls,votematrix):
    data = {}
    data['rollcalls']  = _toDataFrame(rollcalls)
    data['votematrix'] = _toDataFrame(votematrix)
    data['rcNames'] = rollcalls[0]
    data['vmNames'] = votematrix[0]
    return( json.dumps(data) )

if __name__== "__main__":
    print writeRollcall( [['a','b','c'],['1',2,3],['4',5,6],['7',8,9]],
                         [['a','b','c'],['1',2,3],['4',5,6],['7',8,9]] )
        
