import json
import pymongo
import re
import uuid
import time
from searchVotes import query

client = pymongo.MongoClient()

# Swear filter is a combination of:
# https://gist.github.com/jamiew/1112488
# https://gist.github.com/tjrobinson/2366772
try:
	swearData = json.load(open("swearFilter.json","r"))["swears"]
	dbConf = json.load(open("db.json","r"))
	db = client[dbConf["dbname"]]
except:
	try:
		swearData = json.load(open("./model/swearFilter.json","r"))["swears"]
		dbConf = json.load(open("./model/db.json","r"))
		db = client[dbConf["dbname"]]
	except:
		print "nope"
		swearData = []

def initializeCart():
	# What's going on here? UUID is a hash function. It generates a long unique identifier.
	# To save storage and because we're not Facebook sized, I truncate it to the first 8 digits.
	# This gives us ~4 billion possible ids and sparsity as a security mechanism.
	uniqueUUID = str(uuid.uuid4())[0:8] 
	
	# Get an expiration date
	expires = updateExpiry()

	# Create a stash document.
	db.stash.insert_one({'id': uniqueUUID, 'expiry': expires})

	
	# Expires
	return({'id': uniqueUUID})

def addAll(id, search):
	results = query(qtext=search, jsapi=0, rowLimit=2000, idsOnly=1)
	if "rollcalls" in results:
		rcSet = []
		for rc in results["rollcalls"]:
			rcSet.append(rc["id"])
		return addVotes(id, rcSet)
	else:
		return {"errors": ["Can't add votes; no results from search."]}

def delAll(id, search):
	results = query(qtext=search, jsapi=0, rowLimit=2000, idsOnly=1)
	if "rollcalls" in results:
		rcSet = []
		for rc in results["rollcalls"]:
			rcSet.append(rc["id"])
		return delVotes(id, rcSet)
	else:
		return {"errors": ["Can't remove votes; no results from search."]}

def updateExpiry():
	print "Updating expiry to new time tag"
	# Current expiry: 7 days.
	return int(time.time())+(7*24*60*60)

def indefExpiry():
	return int(time.time())+(10*365*24*60*60)

def checkExists(id):
	res = db.stash.find_one({'id': id})
	if res is None:
		return {"status": 1}
	else:
		return {"status": 0}

def addVotes(id, votes):
	print "Beginning new add"
	errorMessages = []

	# User supplied invalid ID, generate a new one
	try:
		if len(id)!=8:
			id = initializeCart()["id"]
			errorMessages.append("Invalid stash ID sent from user.")
	except:
		id = initializeCart()["id"]
		errorMessages.append("Invalid stash ID sent from user.")

	print "Past the initial hurdle"
	expires = updateExpiry()

	print "Did I get some votes?"
	if type(votes) == type(0):
		votes = [votes]
	elif type(votes) != type([]):
		errorMessages.append("Invalid votes received from user to add.")

	print "Now checking"
	# Pull it
	res = db.stash.find_one({'id': id})
	if res is None:
		print "Did not find."
		# We don't have one.
		errorMessages.append("Unknown or expired stash ID sent from user.")
		id = initializeCart()["id"]
		nVotes = votes
		old = []
		search = ""
	else:
		r = res
		if not "votes" in r:
			nVotes = votes
		else:
			# Remove votes we already have in the old set
			if "old" in r:
				votes = [v for v in votes if v not in r["old"]]

			# Make sure we have the union of current votes and added votes.
			nVotes = list(set(r["votes"] + votes))

		# Get old and search to return with votes.
		if not "old" in r:
			old = []
		else:
			old = r["old"]
	
		if not "search" in r:
			search = ""
		else:
			search = r["search"]

	# Do the update as necessary.
	db.stash.update_one({'id': id}, {'$set': {'votes': nVotes, 'expiry': expires}}, upsert=False, multi=False)

	# Return everything.
	return {'id': id, 'votes': nVotes, 'old': old, 'search': search, 'errors': errorMessages}

def delVotes(id, votes):
	errorMessages = []

	# User supplied invalid ID, generate a new one
	try:
		if len(id)!=8:
			id = initializeCart()["id"]
			errorMessages.append("Invalid stash ID sent from user.")
	except:
		id = initializeCart()["id"]
		errorMessages.append("Invalid stash ID sent from user.")

	expires = updateExpiry()

	# Pull it
	res = db.stash.find_one({'id': id})
	if res is None:
		# We don't have one.
		errorMessages.append("Unknown or expired stash ID sent from user.")
		id = initializeCart()["id"]
		votes = []
	else:
		r = res
		if not "votes" in r:
			nVotes = []
		else:
			nVotes = [v for v in r["votes"] if v not in votes]

		if not "old" in r:
			old = []
		else:
			old = [v for v in r["old"] if v not in votes]

		if not "search" in r:
			search = ""
		else:
			search = r["search"]

	db.stash.update_one({'id': id}, {'$set': {'votes': nVotes, 'old': old, 'expiry': expires}}, upsert=False, multi=False)

	return {'id': id, 'votes': nVotes, 'errors': errorMessages, 'search': search, 'old': old}

def emptyCart(id):
	errorMessages = []

	res = db.stash.find_one({'id': id})
	if res is None:
		return({'id': '', 'errorMessages': ["Invalid ID. Cart does not exist."]})
	else:
		db.stash.remove({'id': id}, 1)
		return initializeCart()

def getVotes(id):
	errorMessages = []

	# User supplied invalid ID, generate a new one
	try:
		if len(id)!=8:
			id = initializeCart()["id"]
			errorMessages.append("Invalid stash ID sent from user.")
	except:
		id = initializeCart()["id"]
		errorMessages.append("Invalid stash ID sent from user.")

	expires = updateExpiry()

	# Pull it
	res = db.stash.find_one({'id': id})
	if res is None:
		# We don't have one.
		errorMessages.append("Unknown or expired stash ID sent from user.")
		id = initializeCart()["id"]
		return {'id': id, 'votes': [], 'old': [], 'search': '', 'errors': errorMessages}
	else:
		r = res
		if "votes" in r:
			votes = r["votes"]
		else:
			votes = []

		if "old" in r:
			old = r["old"]
		else:
			old = []

		if "search" in r:
			search = r["search"]
		else:
			search = ""

		return({'id': id, 'votes': votes, 'old': old, 'search': search, 'errors': errorMessages})

def verb(verb, id, votes):
	if verb=="get":
		return getVotes(id)
	elif verb=="del":
		return delVotes(id, votes)
	elif verb=="add":
		return addVotes(id, votes)
	elif verb=="init":
		return initializeCart()
	elif verb=="empty":
		return emptyCart(id)

	return {"error": "Invalid verb."}

def setSearch(id, search):
	errorMessages = []

	# User supplied invalid ID, generate a new one
	try:
		if len(id)!=8:
			id = initializeCart()["id"]
			errorMessages.append("Invalid stash ID sent from user.")
	except:
		id = initializeCart()["id"]
		errorMessages.append("Invalid stash ID sent from user.")
	
	expires = updateExpiry()
	res = db.stash.find_one({'id': id})
	if res is None:
		# We don't have one.
		errorMessages.append("Unknown or expired stash ID sent from user.")
		id = initializeCart()["id"]
		savedVoteIDs = []
		votes = []
		old = []
	else:
		if "old" in res:
			old = res["old"]
		else:
			old = []
		if "votes" in res:
			votes = res["votes"]
		else:
			votes = []

		savedVoteIDs = list(set(votes+old))

	if len(search)>300:
		errorMessages.append("Search is too long and not authorized.")
		search = ""

	expires = updateExpiry()
	db.stash.update_one({'id': id}, {'$set': {'search': search, 'old': savedVoteIDs, 'votes': [], 'expiry': expires}}, upsert=False, multi=False)
	return {"id": id, "search": search, "errors": errorMessages, "old": savedVoteIDs, "votes": []}

def shareableLink(id, text, base_url):
	errorMessages = []

	#text = re.sub('[^a-zA-Z0-9_\- ]','',text)
	#text = text.replace(' ','-')
	#text = text.replace('_','-')
	#text = re.sub("\-$","",text)
	internalText = text.lower()

	if len(internalText)>30:
		errorMessages.append("Error: Invalid link name.")
	elif len(internalText)<4:
		errorMessages.append("Error: Link must be at least 4 characters long.")
	if any([x.lower() in internalText for x in swearData]):
		errorMessages.append("Error: Link name contains inappropriate term. Links are public-facing and must not contain swears or abusive words.")

        if db.stash.find_one({'id': internalText}):
                errorMessages.append("Error: Link name already exists.")

	link = ""
	if not len(errorMessages):
		res = db.stash.find_one({'id': id})
		if res is None:
			errorMessages.append("Error: Invalid stash ID sent.")
		elif not "votes" in res and not "old" in res:
			errorMessages.append("Error: No votes saved.")
		else:
			if "votes" in res:
				votes = res["votes"]
			else:
				votes = []

			if "old" in res:
				old = res["old"]
			else:
				old = []

			combVotes = list(set(votes + old))
			expires = indefExpiry()
			db.stash.insert_one({'id': internalText, 'old': combVotes, 'expiry': expires})
			link = base_url + "s/"+internalText
	else:
		pass

	return {"link": link, "errors": errorMessages}

if __name__ == "__main__":
	id = "3d94a6d6"
	print addVotes(id, ["RS1150001", "RS1150002"])
	#print delVotes(id, [40])
	#print getVotes(id)
	#addVotes(id, 14)
	#addVotes(id, [44, 48, 408, 418])
	#print getVotes(id)
