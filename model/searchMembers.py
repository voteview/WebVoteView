import pymongo
import traceback

client = pymongo.MongoClient()
db = client["voteview"]

def memberLookup(qDict, maxResults=50, distinct=0, api="Web"):
	# Setup so that the bottle call to this API doesn't need to know parameters we accept explicitly
	name = qDict["name"] if "name" in qDict else ""
	icpsr = qDict["icpsr"] if "icpsr" in qDict else ""
	state = qDict["state"] if "state" in qDict else ""
	congress = qDict["congress"] if "congress" in qDict else ""
	cqlabel = qDict["cqlabel"] if "cqlabel" in qDict else ""

	# Check to make sure there's a query
	if not name and not icpsr and not state and not congress and not cqlabel:
		return({'errormessage': 'No search terms provided'})

	# Fold search query into dict
	searchQuery = {}
	if icpsr:
		try:
			icpsr = int(icpsr)
			searchQuery["icpsr"] = icpsr
			print searchQuery
			print "got this got this"
		except:
			try:
				if icpsr[0]=="M":
					for r in db.voteview_members.find({'id': icpsr}, {'icpsr': 1, '_id': 0}):
						searchQuery["icpsr"] = r["icpsr"]
						break
			except:
				return({"errormessage": "Invalid ICPSR number supplied."})

	if state:
		state = str(state)
		searchQuery["stateAbbr"] = state.upper() # States are all stored upper-case
	if congress:
		try:
			congress = str(int(congress))
		except:
			return({"errormessage": "Invalid congress ID supplied."})

		if not " " in congress: # congress is just a number
			congress = int(congress)
			searchQuery["congress"] = congress
		elif "[" in congress and "]" in congress and "to" in congress: # congress is a range
			valText = congress[1:-1]
			min, max = valText.split(" to ")
			searchQuery["congress"] = {}
			if len(min):
				searchQuery["congress"]["$gte"] = int(min) # From min
			if len(max):
				searchQuery["congress"]["$lte"] = int(max) # To max
		else: # congress is a series of integers, use $in
			vals = [int(val) for val in congress.split(" ")]
			searchQuery["congress"] = {}
			searchQuery["congress"]["$in"] = vals
	if name:
		if not " " in name: # Last name only
			searchQuery["name"] = {'$regex': name, '$options': 'i'}
		elif ", " in name: # Last, First
			last, rest = name.split(", ",1)
			searchQuery["fname"] = {'$regex': last+", "+rest, '$options': 'i'}
		else:
			searchQuery["$text"] = {"$search": name}
			
	if cqlabel:
		if cqlabel[0]=="(" and cqlabel[-1]==")": # Ensure beginning/end () to match
			searchQuery["cqlabel"] = cqlabel
		else:
			searchQuery["cqlabel"] = "("+cqlabel+")"

	response = []
	errormessage = ""
	i = 0
	print searchQuery

	# Field return specifications, allows us to return less than all our data to searches.
	if api=="Web_PI":
		fieldSet = {"nominate.oneDimNominate": 1, "partyname": 1, "icpsr": 1, "_id": 0}
	elif api=="Web_FP_Search":
		fieldSet = {"bioName": 1, "fname": 1, "name": 1, "partyname": 1, "icpsr": 1, "stateName": 1, "congress": 1, "_id": 0}
	else:
		fieldSet = {"_id": 0}
	if "$text" in searchQuery:
		fieldSet["score"] = {"$meta": "textScore"}

	res = db.voteview_members.find(searchQuery, fieldSet)

	if "$text" in searchQuery:
		sortedRes = res.sort([('score', {'$meta': 'textScore'})])
	else:
		sortedRes = res.sort('congress', -1)
		if sortedRes.count()>1000:
			return({"errormessage": "Too many results found."})

	currentICPSRs = []
	for m in sortedRes:
		if m["icpsr"] in currentICPSRs and distinct==1:
			continue
		else:
			currentICPSRs.append(m["icpsr"])

		response.append(m)
		i=i+1
		if i>=maxResults:
			break

	if len(response)>maxResults and maxResults>1: # For regular searches get mad if we have more than max results.
		errormessage = "Capping number of responses at "+str(maxResults)+"."

	if len(response)==0:
		return({'errormessage': 'No members found matching your search query.'})
	elif errormessage:
		return({'errormessage': errormessage, 'results': response})
	else:
		return({'results': response})

def getMembersByCongress(congress, api="Web"):
	return(memberLookup({"congress": congress}, maxResults=1000, distinct=0, api=api))

if __name__ == "__main__":
	print memberLookup({"name": "Ted Cruz"}, 5)
	print memberLookup({"name": "John Kerry"}, 5, 1)
	#print memberLookup({"name": "Cruz, Ted"})
	#print memberLookup({"name": "Ted Cruz"}, 5)
	#print memberLookup({"icpsr": "00001"}, 1)
	#print len(memberLookup({"icpsr": 99369}, 1)["results"])
	print getMembersByCongress(110,"Web_PI")
	pass
