import pymongo
import json
import traceback
import os
from stateHelper import stateNameToAbbrev, stateName, stateIcpsr
from searchParties import partyName, noun, partyColor, shortName
#from searchMeta import metaLookup
client = pymongo.MongoClient()
try:
	dbConf = json.load(open("./model/db.json","r"))
	nicknames = json.load(open("./model/nicknames.json","r"))
except:
        try:
                dbConf = json.load(open("./db.json","r"))
		nicknames = json.load(open("./nicknames.json", "r"))
        except:
                dbConf = {'dbname':'voteview'}
		nicknames = []
db = client[dbConf["dbname"]]

#m = metaLookup()
#dimWeight = m['nominate']['second_dimweight']

def cqlabel(state_abbrev, district_code):
        if state_abbrev =="USA":
                cqlabel = "(POTUS)"
        elif district_code > 70:
                cqlabel = "(" + ("%s-00" % state_abbrev) + ")"
        elif district_code and district_code <= 70:
                cqlabel = "(" + ("%s-%02d" % (state_abbrev, district_code)) + ")"
        elif district_code == 0:
                cqlabel = "(" + state_abbrev + ")"
        else:
                cqlabel = ""
        return cqlabel
        

def memberLookup(qDict, maxResults=50, distinct=0, api="Web"):
	# Setup so that the bottle call to this API doesn't need to know parameters we accept explicitly
	name = qDict["name"] if "name" in qDict else ""
	icpsr = qDict["icpsr"] if "icpsr" in qDict else ""
	state_abbrev = qDict["state_abbrev"] if "state_abbrev" in qDict else ""
	congress = qDict["congress"] if "congress" in qDict else ""
	chamber = qDict["chamber"] if "chamber" in qDict else ""
	party_code = qDict["party_code"] if "party_code" in qDict else ""
	district_code = qDict["district_code"] if "district_code" in qDict else ""
	id = qDict["id"] if "id" in qDict else ""
	speaker = qDict["speaker"] if "speaker" in qDict else ""
	freshman = qDict["freshman"] if "freshman" in qDict else ""
	idIn = qDict["idIn"] if "idIn" in qDict else []
	biography = qDict["biography"] if "biography" in qDict else ""

	if api == "R":
		maxResults = 5000

	# Check to make sure there's a query
	if not name and not icpsr and not state_abbrev and not congress and not district_code and not chamber and not id and not party_code and not speaker and not idIn and not freshman and not biography:
		return({'errormessage': 'No search terms provided'})

	# Fold search query into dict
	searchQuery = {}
	if api=="districtLookup":
		searchQuery["id"] = {"$in": qDict["idIn"]}

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

	if id:
		try:
			if id.upper().startswith("MH") or id.upper().startswith("MS"):
				searchQuery["id"] = id
			else:
				return({"errormessage": "Invalid ID supplied1."})
		except:
			return({"errormessage": "Invalid ID supplied2."})

	if state_abbrev:		
		state = str(state_abbrev)
		if len(state) == 2 or state.upper() == "USA":
			searchQuery["state_abbrev"] = state.upper() # States are all stored upper-case
		else:
			searchQuery["state_abbrev"] = stateNameToAbbrev(state.upper())

	if biography:
		print "i'm in here"
		searchQuery["biography"] = {"$regex": biography, "$options": "i"}

	if congress:
		try:
			print type(congress), type(0), type(congress)==type(0)
			if type(congress) == type(0): # congrss is already a number
				searchQuery["congress"] = congress
			elif not " " in congress: # congress is just a number
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
		except:
			print traceback.format_exc()
			return({"errormessage": "Invalid congress ID supplied."})

	if name:
		if not " " in name: # Last name only
			searchQuery["bioname"] = {'$regex': name, '$options': 'i'}
		elif ", " in name: # Last, First
			last, rest = name.split(", ",1)
			searchQuery["bioname"] = {'$regex': last+", "+rest, '$options': 'i'}
		else:
			searchQuery["$text"] = {"$search": name}

	if speaker:
		searchQuery["served_as_speaker"] = 1

	if freshman:
		try:
			maxCongress = json.load(open("static/config.json","r"))["maxCongress"]
		except:
			try:
				maxCongress = json.load(open("../static/config.json","r"))["maxCongress"]
			except:
				maxCongress = 115
	
		searchQuery["congresses.0.0"] = maxCongress

	if party_code:
		searchQuery["party_code"] = int(party_code)
			
	if district_code and state_abbrev:
		searchQuery["district_code"] = district_code

	if chamber:
		chamber = chamber.capitalize()
		if chamber=="Senate" or chamber=="House" or chamber=="President":
			searchQuery["chamber"] = chamber
		else:
			return({"errormessage": "Invalid chamber provided. Please select House or Senate."})			

	response = []
	errormessage = ""
	i = 0

	# Field return specifications, allows us to return less than all our data to searches.
	if api=="Web_PI":
		fieldSet = {"nominate.dim1": 1, "party_code": 1, "icpsr": 1, "chamber":1, "_id": 0}
	elif api=="Web_FP_Search":
		print searchQuery
		fieldSet = {"bioname": 1, "party_code": 1, "icpsr": 1, "state_abbrev": 1, "congress": 1, "_id": 0, "congresses": 1, "chamber": 1}
	elif api=="Web_Congress":
		if chamber:
			fieldName = "elected_"+chamber.lower()
			fieldSet = {"bioname": 1, "party_code": 1, "icpsr": 1, "state_abbrev": 1, "congress": 1, "_id": 0, "bioImgURL": 1, "minElected": 1, "nominate.dim1": 1, "nominate.dim2": 1, "congresses": 1, fieldName: 1}
		else:
			fieldSet = {"bioname": 1, "party_code": 1, "icpsr": 1, "state_abbrev": 1, "congress": 1, "_id": 0, "bioImgURL": 1, "minElected": 1, "nominate.dim1": 1, "nominate.dim2": 1, "congresses": 1, "state_abbrev": 1, "elected_senate": 1, "elected_house": 1}
	elif api=="Web_Party":
		fieldSet = {"bioname": 1, "party_code": 1, "icpsr": 1, "state_abbrev": 1, "congress": 1, "_id": 0, "bioImgURL": 1, "minElected": 1, "nominate.dim1": 1, "nominate.dim2": 1, "congresses": 1}
	elif api=="R":
		fieldSet = {"bioname": 1, "party_code": 1, "icpsr": 1, "state_abbrev": 1, "congress": 1, "id": 1, "_id": 0, "nominate.dim1": 1, "nominate.dim2": 1, "nominate.geo_mean_probability": 1, "cqlabel": 1, "district_code": 1, "chamber": 1, "congresses": 1}
        elif api=="exportCSV" or api == "exportORD":
                fieldSet = {"bioname": 1, "party_code": 1, "icpsr": 1, "state_abbrev": 1, "congress": 1, "id": 1, "_id": 0, "nominate": 1, "district_code": 1, "chamber": 1}
	elif api=="districtLookup":
		fieldSet = {"bioname": 1, "party_code": 1, "icpsr": 1, "state_abbrev": 1, "congress": 1, "id": 1, "nominate.dim1": 1, "district_code": 1, "_id": 0, "chamber": 1, "congresses": 1}
        else:
		fieldSet = {"_id": 0, "personid": 0}
	if "$text" in searchQuery:
		fieldSet["score"] = {"$meta": "textScore"}

        print(api)
	res = db.voteview_members.find(searchQuery, fieldSet)

	if "$text" in searchQuery:
		sortedRes = res.sort([('score', {'$meta': 'textScore'})])
	elif api=="exportORD":
                db.voteview_members.ensure_index([('state_abbrev', 1), ('district_code', 1), ('icpsr', 1)], name="ordIndex")
                sortedRes = res.sort([('state_abbrev', 1), ('district_code', 1), ('icpsr', 1)])
        else:
		sortedRes = res.sort('congress', -1)
		if sortedRes.count()>1000 and api != "R" and api!= "Web_Party":
			return({"errormessage": "Too many results found."})
		elif sortedRes.count()>5000 and api!= "Web_Party":
			return({"errormessage": "Too many results found."})

	currentICPSRs = []
	for m in sortedRes:
		if m["icpsr"] in currentICPSRs and distinct==1:
			continue
		else:
			currentICPSRs.append(m["icpsr"])

		newM = m

		if "state_abbrev" in newM:
			newM["state"] = stateName(newM["state_abbrev"])
                        if api=="exportORD":
                                newM["state_icpsr"] = stateIcpsr(newM["state_abbrev"])
		if "district_code" in newM and "state_abbrev" in newM:
                        newM["cqlabel"] = cqlabel(newM["state_abbrev"], newM["district_code"])
		if "party_code" in newM and api not in ["exportORD", "exportCSV", "R"]:
			newM["party_noun"] = noun(newM["party_code"])
			newM["party_name"] = partyName(newM["party_code"])
			newM["party_color"] = partyColor(newM["party_code"])
			newM["party_short_name"] = shortName(newM["party_code"])
		
		# Check if an image exists.
		if os.path.isfile("/var/www/voteview/static/img/bios/"+str(newM["icpsr"]).zfill(6)+".jpg"):
			newM["bioImgURL"] = str(newM["icpsr"]).zfill(6)+".jpg"
		else:
			newM["bioImgURL"] = "silhouette.png"

                if api in ["exportCSV", "exportORD"]:
                        if 'bioname' in newM:
                                newM['bioname'] = newM['bioname'].encode('utf-8')
                        if "nominate" in newM:
                                for k,v in newM["nominate"].iteritems():
                                        newM[k] = v
                                del newM["nominate"]

		response.append(newM)
		i=i+1
		if i>=maxResults:
			break

	if len(response)>maxResults and maxResults>1: # For regular searches get mad if we have more than max results.
		errormessage = "Capping number of responses at "+str(maxResults)+"."

	if len(response)==0:
		return({'errormessage': 'No members found matching your search query.', 'query': qDict})
	elif errormessage:
		return({'errormessage': errormessage, 'results': response})
	else:
		return({'results': response})

def getMembersByCongress(congress, chamber, api="Web"):
	if not chamber:
		return(memberLookup({"congress": congress}, maxResults=600, distinct=0, api=api))
	elif chamber and congress:
		return(memberLookup({"congress": congress, "chamber": chamber}, maxResults=600, distinct=0, api=api))
	else:
		return({'errormessage': 'You must provide a chamber or congress.'})

def getMembersByParty(id, congress, api="Web"):
	if id and congress:
		return(memberLookup({"party_code": id, "congress": congress}, maxResults=500, distinct=1, api=api))
	elif id:
		return(memberLookup({"party_code": id}, maxResults=500, distinct=1, api=api))
	else:
		return({'errormessage': 'You must provide a party ID.'})

def nicknameHelper(text, ref=""):
	if len(ref):
		refNames = ref.split()
	else:
		refNames = []

	name = ""
	text = text.replace(",","")
	for word in text.split():
		if word in refNames:
			name = name+word+" "
		else:
			name=name+singleNicknameSub(word)+" "

	name = name.strip()
	#print "Nickname tester: ", text, name
	return name

def singleNicknameSub(name):
	done=0
	steps=0
	while done==0 and steps<20:
		candidates = []
		candidates = candidates + [x["nickname"] for x in nicknames if x["name"].lower()==name.lower()]
		candidates = candidates + [x["name"] for x in nicknames if x["nickname"].lower()==name.lower()]
		if len(candidates):
			candidates.append(name)
			candidates = sorted(list(set(candidates)), key=lambda x: (len(x), x))
			newName = candidates[0]
			if newName!=name:
				#print "Map from ", name, "to ", newName
				name = newName
				steps=steps+1
			else:
				#print "No map from here."
				done=1
		done=1
	return name

def getMembersByPrivate(query):
	idIn = []
	for r in db.voteview_members.find(query, {"id": 1, "_id": 0}):
		idIn.append(r["id"])

	return memberLookup({"idIn": idIn}, maxResults=200, distinct=0, api="districtLookup")

if __name__ == "__main__":
	#print memberLookup({"speaker": 1}, maxResults=50, distinct=1)
	#print getMembersByParty(29, 28, "Web_Party")
	#print getMembersByParty(200, 0, "Web_Party")
	#print memberLookup({"icpsr": 29137}, maxResults=10, distinct=1)
	#print [x["bioname"] for x in memberLookup({"state_abbrev": "CA", "district_code": 37},114,1,api="Web")["results"]]
	pass
