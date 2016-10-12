import json
try:
	states = json.load(open("./model/states.json","r"))
except:
	try:
		states = json.load(open("./states.json","r"))
	except:
		states = []

def stateLookup(shortName):
	results = [x for x in states if x["state_abbrev"].lower()==shortName.lower()]
	if not len(results):
		return {"name": "Error", "icpsr": 0, "fips": 0, "vns": 0, "state_abbrev": shortName}
	else:
		return results[0]

def stateName(shortName):
	return stateLookup(shortName)["name"]

if __name__=="__main__":
	print stateLookup("AK")
	print stateLookup("DC")
	print stateName("SD")
	print stateLookup("QQ")
