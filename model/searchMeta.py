import pymongo
import json

cache = {}

client = pymongo.MongoClient()
try:
	dbConf = json.load(open("./model/db.json","r"))
except:
	try:
		dbConf = json.load(open("./db.json","r"))
	except:
		dbConf = {"dbname": "voteview"}

db = client[dbConf["dbname"]]

def metaLookup():
    for m in db.voteview_metadata.find().sort('time', -1).limit(1):
        meta = m
    return meta
