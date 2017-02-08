from pymongo import MongoClient
import json

client = MongoClient()
try:
	dbConf = json.load(open("./model/db.json","r"))
	db = client[dbConf["dbname"]]
except:
	dbConf = json.load(open("./db.json","r"))
	db = client[dbConf["dbname"]]


def getPartyData(code, api="Web_Name"):
	try:
		code = int(code)
	except:
		return {"error": "Invalid party code requested."}

	r = db.voteview_parties.find_one({"id": code},{"partyname": 1, "count": 1, "fullName": 1, "pluralNoun": 1, "noun": 1, "briefName": 1, "party_description": 1, "loyalty_counts": 1, "_id": 0})
	if not r or r is None or not "partyname" in r:
		return {"error": "Party code not found.", "partyname": None}
	else:
		retDict = {"partyname": r["partyname"], "fullName": r["fullName"], "pluralNoun": r["pluralNoun"], "noun": r["noun"]}
		if "party_description" in r:
			retDict["party_description"] = r["party_description"]
		if "briefName" in r:
			retDict["briefName"] = r["briefName"]
                if api=="Web_Person":
                        retDict["loyalty_counts"] = r["loyalty_counts"]
		return retDict

if __name__=="__main__":
	print getPartyData(22)
	print getPartyData("fart")
