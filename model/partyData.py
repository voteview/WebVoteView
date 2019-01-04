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

	fields_return = {x: 1 for x in ["partyname", "count", "fullName", "pluralNoun", "noun", "briefName", "party_description", "loyalty_counts"]}
	fields_return["_id"] = 0
	r = db.voteview_parties.find_one({"id": code}, fields_return)

	if not r or r is None or not "partyname" in r:
		return {"error": "Party code not found.", "partyname": None}

	retDict = {"partyname": r["partyname"], "fullName": r["fullName"], "pluralNoun": r["pluralNoun"], "noun": r["noun"]}
	if "party_description" in r:
		retDict["party_description"] = r["party_description"]
	if "briefName" in r:
		retDict["briefName"] = r["briefName"]
	if api == "Web_Person":
		retDict["loyalty_counts"] = r["loyalty_counts"]

	return retDict

if __name__=="__main__":
	print getPartyData(22)
	print getPartyData("invalid")
