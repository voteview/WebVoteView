import pymongo
import uuid
import time
client = pymongo.MongoClient()
db = client["voteview"]

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

def updateExpiry():
	# Current expiry: 7 days.
	return int(time.time())+(7*24*60*60)

def addVotes(id, votes):
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

	if type(votes) == type(0):
		votes = [votes]
	elif type(votes) != type([]):
		errorMessages.append("Invalid votes received from user to add.")

	# Pull it
	res = db.stash.find_one({'id': id})
	if res is None:
		# We don't have one.
		errorMessages.append("Unknown or expired stash ID sent from user.")
		id = initializeCart()["id"]
		nVotes = votes
	else:
		r = res
		if not "votes" in r:
			nVotes = votes
		else:
			nVotes = list(set(r["votes"] + votes))

	db.stash.update({'id': id}, {'$set': {'votes': nVotes, 'expiry': expires}}, upsert=False, multi=False)

	return {'id': id, 'votes': votes, 'errors': errorMessages}

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

	db.stash.update({'id': id}, {'$set': {'votes': nVotes, 'expiry': expires}}, upsert=False, multi=False)

	return {'id': id, 'votes': votes, 'errors': errorMessages}

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
		return {'id': id, 'votes': [], 'errors': errorMessages}
	else:
		r = res
		if "votes" in r:
			return {'id': id, 'votes': r["votes"], 'errors': errorMessages}
		else:
			return {'id': id, 'votes': [], 'errors': errorMessages}

def verb(verb, id, votes):
	if verb=="get":
		return getVotes(id)
	elif verb=="del":
		return delVotes(id, votes)
	elif verb=="add":
		return addVotes(id, votes)
	elif verb=="init":
		return initializeCart()

if __name__ == "__main__":
	id = initializeCart()["id"]
	print id
	print addVotes(id, [10, 20, 30, 40, 50, 60])
	print delVotes(id, [40])
	print getVotes(id)
	addVotes(id, 14)
	addVotes(id, [44, 48, 408, 418])
	print getVotes(id)
