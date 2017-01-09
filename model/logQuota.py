import pymongo
import json
import traceback
import os
import datetime
import hashlib
import time
client = pymongo.MongoClient()

try:
	dbConf = json.load(open("./model/db.json","r"))
	nicknames = json.load(open("./model/nicknames.json","r"))
except:
	try:
		dbConf = json.load(open("./db.json","r"))
	except:
		dbConf = {'dbname':'voteview'}
		nicknames = []

db = client[dbConf["dbname"]]

def getIP(request):
	return request.environ.get('HTTP_X_FORWARDED_FOR') or request.environ.get('REMOTE_ADDR')

def getUserAgent(request):
	return request.get_header("User-Agent")

def generateSessionID(request):
	ipAddress = getIP(request)
	userAgent = getUserAgent(request)
	staticSalt = authData = json.load(open("./model/auth.json","r"))["quotaLogSalt"]
	dynamicSalt = str(datetime.datetime.now().timetuple().tm_yday)
	finalHash = str(hashlib.sha256(ipAddress+"/"+userAgent+"/"+staticSalt+"/"+dynamicSalt).hexdigest())[0:16]
	return finalHash

def logSearch(request, search):
	doc = {"session": generateSessionID(request), "time": int(time.time())}
	doc.update(search)

	db.search_log.insert(doc)
