import json
try:
	states = json.load(open("./model/states.json","r"))
except:
	try:
		states = json.load(open("/var/www/voteview/model/states.json","r"))
	except:
		states = []

def stateLookup(shortName):
	results = next((x for x in states if x["state_abbrev"].lower()==shortName.lower()), None)
	if results is None:
		return {"name": "Error", "icpsr": 0, "fips": 0, "vns": 0, "state_abbrev": shortName}
	else:
		return results

def stateNameToAbbrev(stateName):
	results = next((x for x in states if x["name"].lower()==stateName.lower().strip()), None)
	if results is None:
		return {"name": "Error", "icpsr": 0, "fips": 0, "vns": 0, "state_abbrev": shortName}
	else:
		return results

def stateName(shortName):
	return stateLookup(shortName)["name"]

if __name__=="__main__":
	print stateLookup("AK")
	print stateLookup("DC")
	print stateName("SD")
	print stateLookup("QQ")
	print stateName(u"ND")
