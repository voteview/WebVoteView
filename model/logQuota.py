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
	authFile = json.load(open("./model/auth.json","r"))
except:
	try:
		dbConf = json.load(open("./db.json","r"))
		authFile = json.load(open("./auth.json","r"))
	except:
		dbConf = {'dbname':'voteview'}
		nicknames = []

db = client[dbConf["dbname"]]

# Wrapper for getting user IP
def getIP(request):
	if request is None:
		return "127.0.0.1"
	return request.environ.get('HTTP_X_FORWARDED_FOR') or request.environ.get('REMOTE_ADDR')

# Wrapper for getting user agent
def getUserAgent(request):
	if request is None:
		return "Local Python"
	return request.get_header("User-Agent")

# Wrapper to load the salt and generate the user session ID
def generateSessionID(request):
	ipAddress = getIP(request)
	userAgent = getUserAgent(request)
	staticSalt = authFile["quotaLogSalt"]
	dynamicSalt = str(datetime.datetime.now().timetuple().tm_yday)
	finalHash = str(hashlib.sha256(ipAddress+"/"+userAgent+"/"+staticSalt+"/"+dynamicSalt).hexdigest())[0:16]
	return finalHash

# Given a search query and number of results, log the search
def logSearch(request, search):
	doc = {"session": generateSessionID(request), "time": int(time.time())}
	doc.update(search)
	if "query" in doc and type(doc["query"])==type({}):
		doc["query"] = json.dumps(doc["query"])
	if "query_extra" in doc and type(doc["query_extra"])==type({}):
		doc["query_extra"] = json.dumps(doc["query_extra"])
	db.search_log.insert(doc)

# Return remaining credits
def getCredits(request):
	if request is None:
		return 0

	session = generateSessionID(request)

	r = db.api_quota.find_one({"session": session}, {"score": 1, "_id": 0})
	if not r:
		return authFile["quotaLimit"]
	else:
		return authFile["quotaLimit"] - r["score"]

# Check user's quota status
def checkQuota(request):
	if request is None: # Local execution.
		return {"status": 0}

	session = generateSessionID(request)
	r = db.api_quota.find_one({"session": session}, {"score": 1, "_id": 0})
	if not r or r["score"] <= authFile["quotaLimit"]:
		return {"status": 0}
	else:
		whitelisted = 0
		blacklisted = 0
		ipAddress = getIP(request)
		for ip in authFile["blacklistIPs"]:
			if ipAddress.startswith(ip):
				blacklisted=1
				break

		if blacklisted:
			return {"status": 1, "error_message": "You have been blocked from completing this request due to abuse. For more information, go to https://voteview.com/quota"}

		for ip in authFile["whitelistIPs"]:
			if ipAddress.startswith(ip):
				whitelisted=1
				break
		if not whitelisted:
			return {"status": 1, "error_message": "You have been blocked from completing this request because you are over quota. To prevent abuse of our systems, users are limited from excessive numbers of search queries. For more information, go to https://voteview.com/quota"}
		else:
			return {"status": 0}

# Add a cost to user's quota
def addQuota(request, score):
	session = generateSessionID(request)
	r = db.api_quota.find_one({"session": session}, {"score": 1, "_id": 0})
	if r:
		db.api_quota.update_one({"session": session}, {"$set": {"score": r["score"]+score}})
	else:
		db.api_quota.insert({"session": session, "score": score})

