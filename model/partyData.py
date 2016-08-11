from pymongo import MongoClient

client = MongoClient()
db = client["voteview"]

def getPartyName(code):
	try:
		code = int(code)
	except:
		return {"error": "Invalid party code requested."}

	r = db.voteview_parties.find_one({"id": code},{"partyname": 1, "count": 1, "fullName": 1, "pluralNoun": 1, "noun": 1, "briefName": 1, "_id": 0})
	if not r or r is None or not "partyname" in r:
		return {"error": "Party code not found.", "partyname": null}
	else:
		retDict = {"partyname": r["partyname"], "fullName": r["fullName"], "pluralNoun": r["pluralNoun"], "noun": r["noun"]}
		if "briefName" in r:
			retDict["briefName"] = r["briefName"]
		return retDict

if __name__=="__main__":
	print getPartyName(13)
	print getPartyName("fart")
