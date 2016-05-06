import pymongo

client = pymongo.MongoClient()
db = client["voteview"]

def memberLookup(qDict, maxResults=50):
	# Setup so that the bottle call to this API doesn't need to know parameters we accept explicitly
	name = qDict["name"] if "name" in qDict else ""
	icpsr = qDict["icpsr"] if "icpsr" in qDict else ""
	state = qDict["state"] if "state" in qDict else ""
	session = qDict["session"] if "session" in qDict else ""
	cqlabel = qDict["cqlabel"] if "cqlabel" in qDict else ""

	# Check to make sure there's a query
	if not name and not icpsr and not state and not session and not cqlabel:
		return({'errormessage': 'No search terms provided'})

	# Fold search query into dict
	searchQuery = {}
	if icpsr:
		try:
			icpsr = int(icpsr)
		except:
			return({"errormessage": "Invalid ICPSR number supplied."})

		searchQuery["icpsr"] = icpsr
	if state:
		state = str(state)
		searchQuery["stateAbbr"] = state.upper() # States are all stored upper-case
	if session:
		try:
			session = int(session)
		except:
			return({"errormessage": "Invalid Session ID supplied."})

		if not " " in session: # Session is just a number
			session = int(session)
			searchQuery["session"] = session
		elif "[" in session and "]" in session and "to" in session: # Session is a range
			valText = session[1:-1]
			min, max = valText.split(" to ")
			searchQuery["session"] = {}
			if len(min):
				searchQuery["session"]["$gte"] = int(min) # From min
			if len(max):
				searchQuery["session"]["$lte"] = int(max) # To max
		else: # Session is a series of integers, use $in
			vals = [int(val) for val in session.split(" ")]
			searchQuery["session"] = {}
			searchQuery["session"]["$in"] = vals
	if name:
		name = str(name)
		if not " " in name: # Last name only
			searchQuery["name"] = {'$regex': name, '$options': 'i'}
		elif ", " in name: # Last, First
			last, rest = name.split(", ")
			searchQuery["fname"] = {'$regex': last+", "+rest, '$options': 'i'}
	if cqlabel:
		if cqlabel[0]=="(" and cqlabel[-1]==")": # Ensure beginning/end () to match
			searchQuery["cqlabel"] = cqlabel
		else:
			searchQuery["cqlabel"] = "("+cqlabel+")"

	response = []
	errormessage = ""
	i = 0
	for m in db.voteview_members.find(searchQuery,{'_id': 0}):
		response.append(m)
		i=i+1
		if i>maxResults:
			break

	if len(response)>maxResults:
		errormessage = "Capping number of responses at 50."

	if len(response)==0:
		return({'errormessage': 'No results'})
	elif errormessage:
		return({'errormessage': errormessage, 'results': response})
	else:
		return({'results': response})

def getMembersBySession(session):
	return(memberLookup({"session": session}, 1000))

if __name__ == "__main__":
	print memberLookup({"name": "Cruz, Ted"})
	print getMembersBySession(110)
