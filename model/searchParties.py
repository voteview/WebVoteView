import pymongo
import json
import traceback

client = pymongo.MongoClient()
try:
	dbConf = json.load(open("./model/db.json","r"))
except:
	try:
		dbConf = json.load(open("./db.json","r"))
	except:
		dbConf = {"dbname": "voteview"}

db = client[dbConf["dbname"]]

def partyLookup(qDict, api):
	if api!="Web_FP_Search":
		return {}

	if not "id" in qDict and not "name" in qDict:
		return {}

	if "id" in qDict:
		party = db.voteview_parties.find_one({"id": qDict["id"]}, {"_id": 0, "id": 1, "count": 1, "fullName": 1, "colorScheme": 1, "minCongress": 1, "maxCongress": 1})
		if party and not "colorScheme" in party:
			party["colorScheme"] = "grey"

		if not party:
			return {}
		else:
			return {"results": [party]}

	elif "name" in qDict:
		parties = db.voteview_parties.find({"fullName": {"$regex": ".*"+qDict["name"]+".*", "$options": "i"}}, {"_id": 0, "id": 1, "count": 1, "fullName": 1, "colorScheme": 1, "minCongress": 1, "maxCongress": 1})
		partySet = []
		for party in parties:
			if party and not "colorScheme" in party:
				party["colorScheme"] = "grey"

			partySet.append(party)
		if len(partySet):
			return {"results": partySet}
		else:
			return {}

	return {}

if __name__ == "__main__":
	print partyLookup({"id": 347}, "Web_FP_Search")
	print partyLookup({"name": "democrat"}, "Web_FP_Search")
