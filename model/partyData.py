from pymongo import MongoClient

client = MongoClient()
db = client["voteview"]

def getPartyName(code):
	try:
		code = int(code)
	except:
		return {"error": "Invalid party code requested."}

	r = db.voteview_members.find_one({"party": code},{"partyname": 1, "_id": 0})
	if not r or r is None or not "partyname" in r:
		return {"error": "Party code not found.", "partyname": null}
	else:
		return {"partyname": r["partyname"]}

if __name__=="__main__":
	print getPartyName(200)
	print getPartyName("fart")
