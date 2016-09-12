import pymongo
client = pymongo.MongoClient()
dbConf = json.load(open("./model/db.json","r"))
db = connection[dbConf["dbname"]]

def readStatus():
	res = db.voteview_members.find({"wikiStatus": 0},{"bioName": 1, "icpsr": 1, "stateName": 1, "cqlabel": 1, "born": 1, "died": 1, "bio": 1, "partyname": 1, "wiki": 1, "_id": 0}).sort('icpsr', pymongo.ASCENDING).limit(100)
	for r in res:
		if "wiki" in r:
			break
	
	if not r:
		return "All done!"

	return r

def writeStatus(id, status):
	db.voteview_members.update({"icpsr": int(id)}, {'$set': {"wikiStatus": int(status)}}, upsert=False, multi=True)
