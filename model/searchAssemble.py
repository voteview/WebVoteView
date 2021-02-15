from searchVotes import query
from searchMembers import memberLookup, nicknameHelper
from bioData import congressToYear
from searchParties import partyLookup
from slugify import slugify
import traceback
import os
import json
import datetime
from fuzzywuzzy import fuzz

def defaultValue(x,value = None):
    return x is not "" and x or value

def current_congress():
	try:
		congress = json.load(open("static/config.json", "r"))["maxCongress"]
	except:
		try:
			congress = json.load(open("../static/config.json", "r"))["maxCongress"]
		except:
			congress = 117

	return congress


def assembleSearch(q, nextId, bottle):
	# First, get the current congress
	max_congress = current_congress()

	#Party search
	resultParties = []
	if q is not None and not nextId and not ":" in q and len(q.split())<4 and len(q):
		try:
			testQ = int(q)
			if testQ>0 and testQ<10000:
				partySearch = partyLookup({"id": q}, api="Web_FP_Search")
			else:
				partySearch = {}
		except:
			partySearch = partyLookup({"name": q}, api="Web_FP_Search")
		if "results" in partySearch:
			for party in partySearch["results"]:
				party["scoreMatch"] = fuzz.token_set_ratio(party["fullName"].lower().replace(" party",""), q.lower().replace(" party",""))
				if party["count"] > 1000:
					party["scoreMatch"] += 25
				elif party["count"] > 100:
					party["scoreMatch"] += 10
				party["seo_name"] = slugify(party["fullName"])
				party["min_year"] = congressToYear(party["minCongress"], 0)
				party["max_year"] = congressToYear(party["maxCongress"], 1)

				resultParties.append(party)
			resultParties.sort(key=lambda x: (-x["scoreMatch"], -x["maxCongress"]))

	# Member search
	resultMembers = []
	count_members = 0
	needScore=1
	redirFlag=0
	expandResults=0
	suppressRollcalls=0
	currentYear = str(datetime.datetime.now().year)
	memberSearch = {}

	# Building state delegation queries
	jobs = ["representatives", "reps", "senators", "members", "senate", "house", "house delegation", "senate delegation", "congressmen", "congresspersons", "congressional delegation", "congress delegation", "delegation"]
	prepositions = ["of", "in", "from"]
	stateMap = {}
	abbrevStateName = []
	fullStateName = []
	stateQueries = []
	# Load the abbrev to full name map.
	stateSet = json.load(open("./model/states.json","r"))
	for stateLabel in stateSet:
		abbrevStateName.append(stateLabel["state_abbrev"])
		fullStateName.append(stateLabel["name"])
		stateMap[stateLabel["name"]] = stateLabel["state_abbrev"]
		# First, add to the query list the exact names of states/abbrevs
		if stateLabel["name"].lower()!="washington":
			stateQueries.append(stateLabel["name"].lower())

		for job in jobs:
			for preposition in prepositions:
				# Then both current-prefixed and non-current prefixed versions of each combination for names and abbrevs.
				stateQueries.append("current "+job+" "+preposition+" "+stateLabel["state_abbrev"].lower())
				stateQueries.append("current "+job+" "+preposition+" "+stateLabel["name"].lower())
				stateQueries.append(job+" "+preposition+" "+stateLabel["state_abbrev"].lower())
				stateQueries.append(job+" "+preposition+" "+stateLabel["name"].lower())
	# Time period capture:
	rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
	timePeriods = []
	for i in xrange(max_congress, 0, -1):
		timePeriods.append(str(i) + " congress")
		timePeriods.append("congress " + str(i))
		timePeriods.append(rcSuffix(i) + " congress")
		timePeriods.append("congress: " + str(i))

	stateQueries = list(set(stateQueries))
	if q is not None and not nextId and not ":" in q and len(q):
		try:
			# Search overrides for custom search use cases.
			# Vote by known ID
			if len(q.split())==1 and (q.upper().startswith("MH") or q.upper().startswith("MS")):
				memberSearch = memberLookup({"id": q}, 8, distinct=1, api="Web_FP_Search")
			# List all speakers
			elif q.strip().lower() in ["speaker of the house","speakers of the house","speaker: 1", "speaker:1","house speaker"]:
				memberSearch = memberLookup({"speaker": 1, "chamber": "house"}, 60, distinct=1, api="Web_FP_Search")
				needScore=0
				expandResults=1
			# List all presidents
			elif q.strip().lower() in ["potus", "president of the united states", "president", "the president", "president:1", "president: 1","presidents","presidents of the united states","presidents of the united states of america","president of the united states of america"]:
				memberSearch = memberLookup({"chamber": "President"}, 50, distinct=1, api="Web_FP_Search")
				needScore=0
				expandResults=1
			# List all freshmen
			elif q.strip().lower() in ["freshmen", "freshman", "new hires", "first-years", "just elected", "tenderfoot", "newly elected", "class of "+currentYear]:
				memberSearch = memberLookup({"freshman": 1}, 75, distinct=1, api="Web_FP_Search")
				needScore=0
				expandResults=1
			# List state delegation
			elif len([s for s in stateQueries if s in q.strip().lower()]) or len([s for s in abbrevStateName if s.lower()==q.strip().lower()]):
				# A priori assume that any query that hits here is a members-only query unless it's the exact state name.
				foundExact = 0

				# Which chamber do we think they're asking for?
				chamberFind=""
				if "senators" in q.strip().lower() or "senate" in q.strip().lower():
					chamberFind="Senate"
				elif "representatives" in q.strip().lower() or "reps" in q.strip().lower() or "house" in q.strip().lower():
					chamberFind="House"

				# Which state do we think they're asking for?
				stateName = ""
				for state in fullStateName:
					if state.lower() in q.strip().lower():
						stateName = stateMap[state]
						if state.lower()==q.strip().lower():
							foundExact=1
						break
				if not stateName:
					for state in abbrevStateName:
						if any([qs == state.lower() for qs in q.strip().lower().split()]):
							stateName = state
							if state.lower()==q.strip().lower():
								foundExact=1
							break

				# Which congress do we think they're asking for?
				congress = 0
				if "current" in q.strip().lower():
					congress = max_congress
				else:
					for timeP in timePeriods:
						if timeP in q.strip().lower():
							suppressRollcalls=1
							numeral = 0
							for numeralTime in timeP.split(" "):
								numeral = numeralTime.replace("th","").replace("nd","").replace("rd","")
								if numeral.isdigit():
									numeral = int(numeral)
									break
							if numeral:
								congress = numeral
								break
				if not congress:
					congress = max_congress

				if chamberFind and stateName and congress:
					memberSearch = memberLookup({"state_abbrev": stateName, "congress": congress, "chamber": chamberFind}, 100, distinct=1, api="Web_FP_Search") 
					suppressRollcalls = -1*(foundExact-1) # Switch 1 to 0 or vice versa
					needScore=0
					expandResults=1
				elif stateName and congress:
					memberSearch = memberLookup({"state_abbrev": stateName, "congress": congress}, 100, distinct=1, api="Web_FP_Search") 
					suppressRollcalls = -1*(foundExact-1) # Switch 1 to 0 or vice versa
					needScore=0
					expandResults=1
				else:
					print "Something failed in state delegation lookup."

			# ICPSR of user
			elif len(q.split())==1 and type(q)==type(0) and int(q):
				memberSearch = memberLookup({"icpsr": int(q)}, 5, distinct=1, api="Web_FP_Search")
				redirFlag=1
			# Okay, probably a normal search then.
			elif len(q.split())<=5:
				memberSearch = memberLookup({"name": q}, 200, distinct=1, api="Web_FP_Search")
		except:
			print traceback.format_exc()
			memberSearch = memberLookup({"name": q}, 200, distinct=1, api="Web_FP_Search")

	# Biography search
	if q is not None and len(q) and len(q.split())>1 and q.lower().split()[0]=="biography:":
		bioSearch = " ".join(q.strip().lower().split()[1:])
		memberSearch = memberLookup({"biography": bioSearch}, 50, distinct=1, api="Web_FP_Search")
		suppressRollcalls = 1
		expandResults = 1

	if "results" in memberSearch:
		seen_bioguide_ids = []
		for member in memberSearch["results"]:
			if "bioguide_id" in member:
				if member["bioguide_id"] in seen_bioguide_ids:
					continue
				if member["chamber"] != "President":
					seen_bioguide_ids.append(member["bioguide_id"])

			memName = ""
			if "bioname" in member and member["bioname"] is not None:
				memName = member["bioname"]
			else:
				memName = "Error, Invalid Name."

			try:
				memName = memName.replace(",","").lower()
			except:
				memName = memName.lower()

			searchNameToScore = q.replace(",","").lower()
			scoreBasic = fuzz.token_set_ratio(memName, q.replace(",","").lower()) # Score base search
			scoreNick = fuzz.token_set_ratio(nicknameHelper(memName, searchNameToScore), nicknameHelper(searchNameToScore)) # Come up with a best nickname match
			member["scoreMatch"] = max(scoreBasic, scoreNick)
			member["bonusMatch"] = 0

			# Exact last name bonus
			try:
				if len(q.split())==1 and "," in member["bioname"] and q.lower().strip()==member["bioname"].lower().split(",")[0]:
					member["bonusMatch"] += 25
			except:
				pass

			# Recency bonus
			if member["congress"]>=114:
				member["bonusMatch"] += 15
			elif member["congress"]>=100:
				member["bonusMatch"] += 10
			elif member["congress"]>=50:
				member["bonusMatch"] += 5

			# Chamber bonus
			if member["chamber"]=="President":
				if member["scoreMatch"] >= 95:
					member["bonusMatch"] += 100
				member["bonusMatch"] += 50
			if member["chamber"]=="Senate":
				member["bonusMatch"] += 10

			# Duration of service bonus
			if "congresses" in member:
				duration = sum((cong[1] - cong[0] for cong in member["congresses"]))
				if duration >= 5:
					member["bonusMatch"] += 12

			if not os.path.isfile("static/img/bios/"+str(member["icpsr"]).zfill(6)+".jpg"):
				member["bioImg"] = "silhouette.png"
			else:
				member["bioImg"] = str(member["icpsr"]).zfill(6)+".jpg"
			member["minElected"] = congressToYear(member["congresses"][0][0], 0)
			member["seo_name"] = slugify(member["bioname"])

			if "bioname" in member and len(member["bioname"]) > 20 and "(" in member["bioname"]:
				member["bioname"] = member["bioname"].split(",")[0] + ", " + member["bioname"].split("(")[1].split(")")[0]

			member["state"] = member["state"].replace("(", "").replace(")", "")

			resultMembers.append(member)

		if needScore:
			if len(resultMembers) and resultMembers[0]["scoreMatch"]>=100:
				resultMembers = [x for x in resultMembers if x["scoreMatch"]>=100]
			resultMembers.sort(key=lambda x: -(x["scoreMatch"] + x["bonusMatch"]))
		else:
			resultMembers.sort(key=lambda x: -x["congress"])

		if len(resultMembers)>8 and not expandResults:
			count_members = len(resultMembers)
			if count_members == 200:
				count_members = "200+"

			resultMembers=resultMembers[0:8]
		else:
			count_members = len(resultMembers)

	if suppressRollcalls:
		bottle.response.headers["rollcall_number"] = 0
		bottle.response.headers["member_number"] = count_members
		bottle.response.headers["party_number"] = 0

		if len(resultMembers) > 50:
			resultMembers = resultMembers[:50]

		out = bottle.template("views/search_results", rollcalls = [], errormessage="", resultMembers=resultMembers, resultParties=[])
		return out

	# Date facet
	startdate = defaultValue(bottle.request.params.fromDate)
	enddate = defaultValue(bottle.request.params.toDate)

	# Chamber facet
	try:
		chamber = bottle.request.params.getall("chamber")
		if len(chamber)>1:
			chamber = None
		elif type(chamber)==type([]):
			chamber = chamber[0]
	except:
		chamber = None

	# Congress facet
	try:
		fromCongress = int(defaultValue(bottle.request.params["fromCongress"],0))
		toCongress = int(defaultValue(bottle.request.params["toCongress"],0))
		if (q is None or q=="") and (fromCongress or toCongress):
			q = ""

		if fromCongress or toCongress:
			if fromCongress == toCongress:
				q = q + " congress:"+str(fromCongress)
			elif fromCongress and not toCongress:
				q = q + " congress:["+str(fromCongress)+" to ]"
			elif toCongress and not fromCongress:
				q = q + " congress:[ to "+str(toCongress)+"]"
			else:
				q = q + " congress:["+str(fromCongress)+" to "+str(toCongress)+"]"
	except:
		pass

	# Support facet
	try:
		support = bottle.request.params["support"]
		if (q is None or q=="") and (support):
			q = ""

		if "," in support:
			try:
				valMin, valMax = [int(x) for x in support.split(",")]
				if valMin!=0 or valMax!=100:
					q = q + " support:["+str(valMin)+" to "+str(valMax)+"]"
			except:
				pass
		else:
			try:
				support = int(support)
				q = q + " support:["+str(support-1)+" to "+str(support+1)+"]"
			except:
				pass
	except:
		pass

	# Code facet
	try:
		clausen = bottle.request.params.getall("clausen")
	except:
		clausen = []

	try:
		keyvote = bottle.request.params.getall("keyvote")
		if len(keyvote):
			if q is None or q=="":
				q = "keyvote: 1"
			else:
				q += " keyvote: 1"
		else:
			pass
	except:
		pass

	try:
		peltzman = bottle.request.params.getall("peltzman")
	except:
		peltzman = []
	codeString = ""
	if len(clausen):
		for cCode in clausen:
			codeString += "codes.Clausen: "+cCode+" OR "
	if len(peltzman):
		for pCode in peltzman:
			codeString += "codes.Peltzman: "+pCode+" OR "
	if len(codeString):
		codeString = codeString[0:-4]
		if q is None or q=="":
			q = codeString
		else:
			q += " ("+codeString+")"

	# Sort facet
	sortD = int(defaultValue(bottle.request.params.sortD,-1))
	try:
		if sortD!=-1 and sortD!=1:
			sortD = -1
	except:
		sortD = -1

	sortScore = int(defaultValue(bottle.request.params.sortScore,1))
	icpsr = defaultValue(bottle.request.params.icpsr)
	jsapi = 1
	rowLimit = 50
	res = query(q, startdate, enddate, chamber, icpsr=icpsr, rowLimit=rowLimit, jsapi=jsapi, sortDir=sortD, sortSkip=nextId, sortScore=sortScore, request=bottle.request)

	if "errormessage" in res:
		bottle.response.headers["rollcall_number"] = -999
		bottle.response.headers["member_number"] = 0
		bottle.response.headers["nextId"] = 0

		remainder = 50
		if len(resultParties) > 4:
			resultParties = resultParties[:4]
			remainder -= len(resultParties)

		if len(resultMembers) > remainder:
			resultMembers = resultMembers[:remainder]

		out = bottle.template("views/search_results", rollcalls = [], errormessage=res["errormessage"], resultMembers=resultMembers, resultParties=resultParties)
	else:
		if "fulltextSearch" in res:
			highlighter = res["fulltextSearch"]
		else:
			highlighter = ""

		if redirFlag==1 and len(resultParties)==0 and len(resultMembers)==1 and (not "rollcalls" in res or len(res["rollcalls"])==0):
			bottle.response.headers["redirect_url"] = "/person/"+str(resultMembers[0]["icpsr"])+"/"+resultMembers[0]["seo_name"]
		bottle.response.headers["rollcall_number"] = res["recordcountTotal"]
		bottle.response.headers["member_number"] = count_members
		bottle.response.headers["party_number"] = len(resultParties)
		bottle.response.headers["nextId"] = res["nextId"]
		bottle.response.headers["need_score"] = res["needScore"]
		if not "rollcalls" in res:
			out = bottle.template("views/search_results", rollcalls = [], errormessage="", resultMembers=resultMembers, resultParties=resultParties)
		else:
			out = bottle.template("views/search_results", rollcalls = res["rollcalls"], highlighter=highlighter, errormessage="", resultMembers=resultMembers, resultParties=resultParties) 

	return(out)
