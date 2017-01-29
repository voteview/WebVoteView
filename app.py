import urllib
import re
import traceback
import os
import datetime
import time
import json
import bottle
import unidecode
from fuzzywuzzy import fuzz

from model.searchVotes import query
import model.downloadVotes # Namespace issue
from model.emailContact import sendEmail
from model.searchMembers import memberLookup, getMembersByCongress, getMembersByParty, nicknameHelper, getMembersByPrivate
from model.searchParties import partyLookup
from model.searchMeta import metaLookup
from model.bioData import yearsOfService, checkForPartySwitch, congressesOfService, congressToYear
from model.prepVotes import prepVotes
from model.geoLookup import addressToLatLong, latLongToDistrictCodes
from model.slugify import slugify
import model.downloadXLS
import model.stashCart
import model.partyData
import model.logQuota

# Turn this off on production:
devserver = int(open("server.txt","r").read().strip())
if devserver:
	bottle.debug(True)
else:
	bottle.debug(False)

# Setup
app = application = bottle.Bottle()

# Debug timing to improve speed
timeLabels = []
timeNums = []
def clearTime():
    timeLabels = []
    timeNums = []


def timeIt(label):
    timeLabels.append(label)
    timeNums.append(time.time())

def zipTimes():
    tN = []
    for i in xrange(0,len(timeNums)):
        if i==0:
            tN.append(0)
        else:
            tN.append(round(timeNums[i] - timeNums[i-1],3))
    return zip(timeLabels, tN)


def getBase(urlparts):
    domain = urlparts.scheme + "://" + urlparts.netloc + "/"
    return domain

# Helper function for handling bottle arguments and setting defaults:
def defaultValue(x,value = None):
    return x is not "" and x or value


#
# Web pages
#
# Pass through static content -- nginx should handle this, but if it doesn't, bottle will
@app.route('/static/<path:path>')
def callback(path):
    return bottle.static_file(path,"./static")


# Index
@app.route("/")
@app.route("/search/")
def index():
    clearTime()
    timeIt("begin")

    BASE_URL = getBase(bottle.request.urlparts)

    try:
        argDict = {}
        for k,v in bottle.request.params.iteritems():
            argDict[k] = v
    except:
        pass

    timeIt("assembleArgs")

    try:
        if "fromDate" in argDict:
            argDict["fromDate"] = argDict["fromDate"].replace("/","-")
            argDict["fromDate"] = re.sub(r"[^0-9\-\ ]", "", argDict["fromDate"])
        if "toDate" in argDict:
            argDict["toDate"] = argDict["toDate"].replace("/","-")
            argDict["toDate"] = re.sub(r"[^0-9\-\ ]", "", argDict["toDate"])
        if "fromCongress" in argDict:
            argDict["fromCongress"] = int(argDict["fromCongress"])
        if "toCongress" in argDict:
            argDict["toCongress"] = int(argDict["toCongress"])
        if "support" in argDict and "," in argDict["support"]:
            try:
                argDict["supportMin"], argDict["supportMax"] = [int(x) for x in argDict["support"].split(",")]
            except:
                pass
        elif "support" in argDict:
            try:
                support = int(argDict["support"])
                argDict["supportMin"] = support - 1
                argDict["supportMax"] = support + 1
            except:
                pass
        timeIt("doneAssembly")
        output = bottle.template("views/search", args=argDict, timeSet=zipTimes(), base_url=BASE_URL)
    except:
        output = bottle.template("views/error", errorMessage = traceback.format_exc())
        #errorMessage="Error: One or more of the parameters you used to call this page was misspecified.")

    return output

# Static Pages with no arguments, just passthrough the template.
# Really we should just cache these, but anyway.
@app.route("/about")
def about():
    output = bottle.template('views/about')
    return output

@app.route("/quota")
@app.route("/abuse")
def quota():
    output = bottle.template("views/quota")
    return output

@app.route("/data")
def data():
    maxCongress = json.load(open("static/config.json","r"))["maxCongress"]
    output = bottle.template("views/data", maxCongress=maxCongress)
    return output

@app.route("/research")
def research():
    output = bottle.template("views/research")
    return output


# Pages that have arguments
@app.route("/explore")
@app.route("/explore/<chamber:re:house|senate>")
def explore(chamber="house"):
    if chamber!="senate": # Security to prevent the argument being passed through being malicious.
        chamber = "house"

    output = bottle.template("views/explore",chamber=chamber)
    return output


@app.route("/congress")
@app.route("/congress/<chamber:re:house|senate>")
def congress(chamber="senate"):
    if chamber!="senate":
        chamber = "house"

    maxCongress = json.load(open("static/config.json","r"))["maxCongress"]
    congress = defaultValue(bottle.request.params.congress,maxCongress)

    meta = metaLookup()

    output = bottle.template("views/congress", chamber=chamber, congress=congress, maxCongress=maxCongress, dimweight=meta["nominate"]["second_dimweight"], nomBeta=meta["nominate"]["beta"])
    return output

@app.route("/district")
@app.route("/district/<search>")
def district(search=""):
    meta = metaLookup()
    output = bottle.template("views/district", search=search, dimweight=meta["nominate"]["second_dimweight"], nomBeta=meta["nominate"]["beta"])
    return output

@app.route("/parties")
@app.route("/parties/<party>/<congStart>")
@app.route("/parties/<party>")
def parties(party="all", congStart=-1):
	if type(congStart)==type(""): # Capture SEO-friendly links.
		congStart=-1

	# Just default for now
	try:
		party = int(party)
	except:
		maxCongress = json.load(open("static/config.json","r"))["maxCongress"]
		output = bottle.template("views/partiesGlance", maxCongress=maxCongress)
		return output

	if congStart==-1:
		congStart = int(json.load(open("static/config.json","r"))["maxCongress"])
	else:
		try:
			congStart = int(congStart)
		except:
			congStart = 0

	if party not in xrange(0, 50001):
		party = 200
	partyData = model.partyData.getPartyData(party)
	if "fullName" in partyData:
		partyNameFull = partyData["fullName"]
	else:
		partyNameFull = ""
	
	output = bottle.template("views/parties", party=party, partyData=partyData, partyNameFull=partyNameFull, congStart=congStart)
	return output

@app.route("/person")
@app.route("/person/<icpsr>")
@app.route("/person/<icpsr>/<garbage>")
def person(icpsr=0, garbage=""):
    clearTime()
    timeIt("begin")
    if not icpsr:
        icpsr = defaultValue(bottle.request.params.icpsr,0)

    skip = 0

    # Easter Egg
    keith = defaultValue(bottle.request.params.keith, 0)

    # Pull by ICPSR
    person = memberLookup({"icpsr": icpsr}, 1)
    timeIt("memberLookup")

    # If we have no error, follow through
    if not "errormessage" in person:
        person = person["results"][0]
	if not "bioname" in person:
		person["bioname"] = "ERROR NO NAME IN DATABASE PLEASE FIX."
        votes = []
        # Look up votes

        timeIt("nameFunc")

        # Check if bio image exists
        bioFound = 0
        if not os.path.isfile("static/img/bios/"+str(person["icpsr"]).zfill(6)+".jpg"):
            # If not, use the default silhouette
            if not keith:
                person["bioImg"] = "silhouette.png"
            else:
                person["bioImg"] = "keith.png"
        else:
            person["bioImg"] = str(person["icpsr"]).zfill(6)+".jpg"
            bioFound = 1

        timeIt("bioImg")

        # Get years of service
        person["yearsOfService"] = yearsOfService(person["icpsr"],"")
	person["yearsOfServiceSenate"] = yearsOfService(person["icpsr"],"Senate")
	person["yearsOfServiceHouse"] = yearsOfService(person["icpsr"],"House")
        person["congressesOfService"] = congressesOfService(person["icpsr"],"")
        person["congressLabels"] = {}
        for congressChunk in person["congressesOfService"]:
            for cong in range(congressChunk[0], congressChunk[1]+1):
                person["congressLabels"][cong] = str(cong)+"th Congress ("+str(congressToYear(cong,0))+"-"+str(congressToYear(cong,1))+")"

        timeIt("congressLabels")

        # Find out if we have any other ICPSRs that are this person for another party
        altICPSRs = checkForPartySwitch(person)
        if "results" in altICPSRs:
            person["altPeople"] = []
            # Iterate through them
            for alt in altICPSRs["results"]:
                # Look up this one
                altPerson = memberLookup({"icpsr": alt}, 1)["results"][0]
                if not "errormessage" in altPerson:
                    # Get their years of service
                    altPerson["yearsOfService"] = yearsOfService(altPerson["icpsr"])
                    # If we don't have a bio image for main guy, borrow from his previous/subsequent incarnations
                    if not bioFound and os.path.isfile("static/img/bios/"+str(altPerson["icpsr"]).zfill(6)+".jpg"):
                        person["bioImg"] = str(altPerson["icpsr"]).zfill(6)+".jpg"
                        bioFound = 1
                    person["altPeople"].append(altPerson)


        timeIt("partySwitches")

        if "biography" in person:
            person["biography"] = person["biography"].replace("a Representative","Representative")

	if not "twitter_card" in person:
		twitter_card=0
	else:
		twitter_card = person["twitter_card"]
		twitter_card["icpsr"] = person["icpsr"]

        timeIt("readyOut")
        # Go to the template.
        output = bottle.template("views/person",person=person, timeSet=zipTimes(), skip=0, twitter_card=twitter_card)
        return(output)

    # If we have an error, return an error page
    else:
        output = bottle.template("views/error", errorMessage=person["errormessage"])
        return(output)

@app.route("/rollcall")
@app.route("/rollcall/<rollcall_id>")
def rollcall(rollcall_id=""):
    if not rollcall_id:
        output = bottle.template("views/error", errorMessage="You did not provide a rollcall ID.")
        return(output)
    elif "," in rollcall_id:
        output = bottle.template("views/error", errorMessage="You may only view one rollcall ID at a time.")
        return(output)

    rollcall = model.downloadVotes.downloadAPI(rollcall_id,"Web")
    mapParties = int(defaultValue(bottle.request.params.mapParties,1))

    if not "rollcalls" in rollcall or "errormessage" in rollcall:
        output = bottle.template("views/error", errorMessage=rollcall["errormessage"])
        return(output)

    meta = metaLookup()

    output = bottle.template("views/vote", rollcall=rollcall["rollcalls"][0], dimweight=meta['nominate']['second_dimweight'], nomBeta=meta["nominate"]["beta"], mapParties=mapParties)
    return(output)


# RA support stuff
#@app.route("/ra/wiki",method="POST")
#@app.route("/ra/wiki")
#def wiki():
#    prevId = defaultValue(bottle.request.params.icpsrId, 0)
#    newStatus = defaultValue(bottle.request.params.status, 0)
#    if prevId:
#        writeStatus(prevId, newStatus)
#
#    nextTry = readStatus()
#    if type(nextTry)==type(str("")):
#        return(nextTry)
#    else:
#        return bottle.template("views/raWIKI", person=nextTry)

# Stash saved links redirect
@app.route("/s/<savedhash>")
def savedHashRedirect(savedhash):
    if not savedhash:
        return bottle.template("views/error", errorMessage="Invalid redirect ID. This link is not valid. Please notify the person who provided this link to you that it is not operational.")
    else:
        status = model.stashCart.checkExists(savedhash.strip())["status"]
        if not status:
            bottle.redirect("/search/?q=saved: "+savedhash)
        else:
            return bottle.template("views/error", errorMessage="Invalid redirect ID. This link is not valid. Please notify the person who provided this link to you that it is not operational.")


#
#
# API methods
#
#
@app.route("/api/getmembersbycongress",method="POST")
@app.route("/api/getmembersbycongress")
def getmembersbycongress():
    st = time.time()
    congress = defaultValue(bottle.request.params.congress,0)
    chamber = defaultValue(bottle.request.params.chamber, "").title()
    if chamber!="Senate" and chamber!="House":
        chamber = ""
    api = defaultValue(bottle.request.params.api,"")
    out = getMembersByCongress(congress,chamber,api)
    if api=="Web_Congress" and "results" in out:
        print out
        for i in range(0,len(out["results"])):
            memberRow = out["results"][i]

            memberRow["minElected"] = congressToYear(memberRow["congresses"][0][0],0)

            out["results"][i] = memberRow

    out["timeElapsed"] = time.time()-st
    return out

@app.route("/api/geocode")
def geocode():
    q = defaultValue(bottle.request.params.q,"")
    if not q:
        return {"status": 1, "error_message": "No address specified."}
    else:
        return addressToLatLong(bottle.request, q)

@app.route("/api/districtLookup")
def districtLookup():
    maxCongress = json.load(open("static/config.json","r"))["maxCongress"]
    try:
        lat = float(defaultValue(bottle.request.params.lat,0))
        long = float(defaultValue(bottle.request.params.long,0))
    except:
        return {"status": 1, "error_message": "Invalid lat/long coordinates."}

    results = latLongToDistrictCodes(bottle.request, lat, long)
    if type(results) == type({}): # Quota error.
        return results

    if len(results):
        orQ = []
        atLargeSet = []
        state_abbrev = ""
        for r in results:
            if not len(state_abbrev):
                state_abbrev = r[0]
            if r[2]:
                orQ.append({"state_abbrev": r[0], "district_code": r[2], "congress": r[1]})
            else:
                atLargeSet.append(r[1])
        if len(atLargeSet):
            for l in atLargeSet:
                matchDistrict = len([x for x in orQ if x["congress"]==l])
                if matchDistrict:
                    pass
                else:
                    for dc in [1,98,99]:
                        orQ.append({"state_abbrev": state_abbrev, "district_code": dc, "congress": l})
        resultsM = getMembersByPrivate({"chamber": "House", "$or": orQ})

        if "results" in resultsM:
            currentCong = next((x["district_code"] for x in resultsM["results"] if x["congress"]==maxCongress), None)
            currentLookup = getMembersByPrivate({"$or": [{"chamber": "Senate", "state_abbrev": state_abbrev, "congress": maxCongress}, {"chamber": "House", "district_code": currentCong, "state_abbrev": state_abbrev, "congress": maxCongress}]})
            if "results" in currentLookup:
                return {"status": 0, "results": resultsM["results"], "currentCong": currentCong, "resCurr": currentLookup["results"]}
            else:
                return {"status": 0, "results": resultsM["results"], "currentCong": currentCong, "resCurr": []}
        else:
            return {"status": 1, "error_message": "No matches."}
    else:
        return {"status": 1, "error_message": "No matches."}

@app.route("/api/getmembersbyparty")
def getmembersbyparty():
	st = time.time()
	id = defaultValue(bottle.request.params.id,0)
	try:
		congress = int(defaultValue(bottle.request.params.congress,0))
	except:
		congress = 0
	api = defaultValue(bottle.request.params.api,"")
	out = getMembersByParty(id, congress, api)
	if api=="Web_Party" and "results" in out:
		for i in range(0,len(out["results"])):
			memberRow = out["results"][i]

			memberRow["minElected"] = congressToYear(memberRow["congresses"][0][0],0)
			out["results"][i] = memberRow

	out["timeElapsed"] = time.time()-st
	return out


@app.route("/api/getmembers",method="POST")
@app.route("/api/getmembers")
def getmembers():
    qDict = {}

    distinct = 0
    api = "Web"

    for key, value in bottle.request.params.iteritems(): # Transparently pass through the entire query dictionary
        if key == 'distinct':
            distinct = int(defaultValue(value, 0))
        elif key == 'api':
            api = defaultValue(value, "Web")
        else:
            qDict[key] = defaultValue(value)

    return(memberLookup(qDict, distinct = distinct, api = api))


@app.route("/api/searchAssemble", method="POST")
@app.route("/api/searchAssemble")
def searchAssemble():
    q = defaultValue(bottle.request.params.q)
    nextId = defaultValue(bottle.request.params.nextId,0)

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
                resultParties.append(party)
	resultParties.sort(key=lambda x: (-x["scoreMatch"], -x["maxCongress"]))

    # Member search
    resultMembers = []
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
        stateQueries.append(stateLabel["name"].lower())
        #stateQueries.append(stateLabel["state_abbrev"].lower())
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
    for i in xrange(115,0,-1):
        timePeriods.append(str(i)+" congress")
        timePeriods.append("congress "+str(i))
        timePeriods.append(rcSuffix(i)+" congress")
        timePeriods.append("congress: "+str(i))

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
                print "State delegation lookup"
		print [s for s in stateQueries if s in q.strip().lower()]
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
                    congress = 115
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
                    congress = 115

                if chamberFind and stateName and congress:
                    memberSearch = memberLookup({"state_abbrev": stateName, "congress": congress, "chamber": chamberFind}, 100, distinct=1, api="Web_FP_Search") 
                    suppressRollcalls = -1*(foundExact-1) # Switch 1 to 0 or vice versa
                    needScore=0
                    expandResults=1
                else:
                    print "Something failed in state delegation lookup."
                    pass                    
            # ICPSR of user
            elif len(q.split())==1 and int(q):
                memberSearch = memberLookup({"icpsr": int(q)}, 5, distinct=1, api="Web_FP_Search")
                redirFlag=1
            # Okay, probably a normal search then.
            elif len(q.split())<=5:
                memberSearch = memberLookup({"name": q}, 40, distinct=1, api="Web_FP_Search")
        except:
                print traceback.format_exc()
                memberSearch = memberLookup({"name": q}, 40, distinct=1, api="Web_FP_Search")

    # Biography search
    if q is not None and len(q) and len(q.split())>1 and q.lower().split()[0]=="biography:":
        bioSearch = " ".join(q.strip().lower().split()[1:])
        memberSearch = memberLookup({"biography": bioSearch}, 50, distinct=1, api="Web_FP_Search")
        suppressRollcalls = 1
        expandResults = 1

    if "results" in memberSearch:
        for member in memberSearch["results"]:
            memName = ""
            if "bioname" in member and member["bioname"] is not None:
                memName = member["bioname"]
            elif "fname" in member and member["fname"] is not None:
                memName = member["fname"]
            else:
                try:
                    memName = member["name"]
                except:
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
            try: # Issue with printing diacritic-containing results to terminal/log.
                #print q, "/", memName, "/", scoreBasic, scoreNick
                pass
            except:
                pass

            if member["congress"]>=100:
                member["bonusMatch"] += 10
            if member["chamber"]=="President":
                member["bonusMatch"] += 25
            if member["chamber"]=="Senate":
                member["bonusMatch"] += 10
            if "congresses" in member:
                duration = 0
                for cong in member["congresses"]:
                    duration = duration+(cong[1]-cong[0])
                if duration>=5:
                    member["bonusMatch"] += 7

            if not os.path.isfile("static/img/bios/"+str(member["icpsr"]).zfill(6)+".jpg"):
                member["bioImg"] = "silhouette.png"
            else:
                member["bioImg"] = str(member["icpsr"]).zfill(6)+".jpg"
            member["minElected"] = congressToYear(member["congresses"][0][0], 0)
            member["seo_name"] = slugify(member["bioname"])
            resultMembers.append(member)

        #return(resultMembers)
        if needScore:
            #print "results before truncation"
            #print resultMembers
            #print "end ====="
            if len(resultMembers) and resultMembers[0]["scoreMatch"]>=100:
                resultMembers = [x for x in resultMembers if x["scoreMatch"]>=100]
            resultMembers.sort(key=lambda x: -(x["scoreMatch"] + x["bonusMatch"]))
        else:
            resultMembers.sort(key=lambda x: -x["congress"])
        if len(resultMembers)>8 and not expandResults:
            resultMembers=resultMembers[0:8]

    if suppressRollcalls:
        #print "SUPPRESSING PROPERLY"
        bottle.response.headers["rollcall_number"] = 0
        bottle.response.headers["member_number"] = len(resultMembers)
        bottle.response.headers["party_number"] = 0
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
        out = bottle.template("views/search_results", rollcalls = [], errormessage=res["errormessage"], resultMembers=resultMembers, resultParties=resultParties)
    else:
        if "fulltextSearch" in res:
            highlighter = res["fulltextSearch"]
        else:
            highlighter = ""

        if redirFlag==1 and len(resultParties)==0 and len(resultMembers)==1 and (not "rollcalls" in res or len(res["rollcalls"])==0):
            bottle.response.headers["redirect_url"] = "/person/"+str(resultMembers[0]["icpsr"])+"/"+resultMembers[0]["seo_name"]
        bottle.response.headers["rollcall_number"] = res["recordcountTotal"]
        bottle.response.headers["member_number"] = len(resultMembers)
	bottle.response.headers["party_number"] = len(resultParties)
        bottle.response.headers["nextId"] = res["nextId"]
        bottle.response.headers["need_score"] = res["needScore"]
        if not "rollcalls" in res:
            out = bottle.template("views/search_results", rollcalls = [], errormessage="", resultMembers=resultMembers, resultParties=resultParties)
        else:
            #print(res['rollcalls'])
            out = bottle.template("views/search_results", rollcalls = res["rollcalls"], highlighter=highlighter, errormessage="", resultMembers=resultMembers, resultParties=resultParties) 
    return(out)

@app.route("/api/getMemberVotesAssemble")
def getMemberVotesAssemble(icpsr=0, qtext="", skip=0):
	icpsr = defaultValue(bottle.request.params.icpsr,0)
	qtext = defaultValue(bottle.request.params.qtext,"")
	skip = 0
	skip = defaultValue(bottle.request.params.skip,0)

	if not icpsr:
		output = bottle.template("views/error", errorMessage="No member specified.")
		bottle.response.headers["nextId"] = 0
		return(output)
		
	person = memberLookup({"icpsr": icpsr})
	if not "error" in person:
		person = person["results"][0]
	else:
		output = bottle.template("views/error", errorMessage=person["errormessage"])
		bottle.response.headers["nextId"] = 0
		return(output)

	votes = []

	if qtext:
		qtext = qtext+" AND (voter: "+str(person["icpsr"])+")"
	else:
		qtext = "voter: "+str(person["icpsr"])

	if skip:
		voteQuery = query(qtext, rowLimit=25, jsapi=1, sortSkip=skip, request=bottle.request)
	else:
		voteQuery = query(qtext, rowLimit=25, jsapi=1, request=bottle.request)

	votes = prepVotes(voteQuery, person) # Outsourced the vote assembly to a model for future API buildout.
        output = bottle.template("views/member_votes",person=person, votes=votes, skip=skip, nextId=voteQuery["nextId"])

	bottle.response.headers["nextId"] = voteQuery["nextId"]
	return(output)

@app.route("/api/search", method="POST")
@app.route("/api/search")
def search():
    q = defaultValue(bottle.request.params.q)
    startdate = defaultValue(bottle.request.params.startdate)
    enddate = defaultValue(bottle.request.params.enddate)
    chamber = defaultValue(bottle.request.params.chamber)
    icpsr = defaultValue(bottle.request.params.icpsr)
    rapi = defaultValue(bottle.request.params.rapi,0)
    res = query(q,startdate,enddate,chamber, icpsr=icpsr, rapi=rapi, request=bottle.request)
    return(res)


@app.route("/api/getPartyData", method="POST")
@app.route("/api/getPartyData")
def getPartyName():
    id = defaultValue(bottle.request.params.id)
    return(model.partyData.getPartyData(id))


@app.route("/api/download", method="POST")
@app.route("/api/download")
@app.route("/api/download/<rollcall_id>")
def downloadAPI(rollcall_id=""):
    if not rollcall_id:
        rollcall_id = defaultValue(bottle.request.params.rollcall_id)
    apitype = defaultValue(bottle.request.params.apitype, "Web")
    res = model.downloadVotes.downloadAPI(rollcall_id, apitype)
    return(res)


@app.route("/api/exportJSON", method="POST")
@app.route("/api/exportJSON")
def exportJSON():
    id = defaultValue(bottle.request.params.id, "")
    return model.downloadVotes.downloadStash(id)


@app.route("/api/downloadXLS", method="POST")
@app.route("/api/downloadXLS")
def downloadXLS():
    try:
        stash = defaultValue(bottle.request.params.stash, "")
    except:
        stash = ""

    try:
        ids = bottle.request.params.getall("ids")
    except:
        ids = []

    try:
        if type(ids)==type([]):
            ids = ",".join(ids)
    except:
        pass

    if stash:
        statusCode, result = model.downloadXLS.downloadStash(stash)
    else:
        statusCode, result = model.downloadXLS.downloadXLS(ids)

    if statusCode==0:
        bottle.response.content_type = 'application/vnd.ms-excel'
        currentDateString = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        outputFilename = currentDateString+"_voteview_download.xls"
        bottle.response.headers["Content-Disposition"] = "inline; filename=" + outputFilename
        return(result)
    else: # Non-zero status code.
        return({"errormessage": result})


@app.route("/api/contact",method="POST")
@app.route("/api/contact")
def contact():
    try:
        title = bottle.request.params.title
        body = bottle.request.params.body
        email = bottle.request.params.email
        recaptcha = bottle.request.params["g-recaptcha-response"]
        ip = bottle.request.get("REMOTE_ADDR")
        res = sendEmail(title, body, email, recaptcha, ip)
        return(res)
    except:
        return(traceback.format_exc())
        return({"error": "You must fill out the entire form before submitting."})


@app.route("/api/stash/<verb:re:init|add|del|get|empty>")
def stash(verb):
    try:
        id = defaultValue(bottle.request.params.id, "")
        votes = bottle.request.params.getall("votes")
    except:
        votes = []

    #return {"test": "foo"}
    return model.stashCart.verb(verb, id, votes)


@app.route("/api/shareableLink")
@app.route("/api/shareableLink", method="POST")
def shareLink():
    try:
        BASE_URL = getBase(bottle.request.urlparts)
        id = defaultValue(bottle.request.params.id, "")
        text = defaultValue(bottle.request.params.text, "")
    except:
        return {"errorMessage": "Invalid ID or text"}

    return model.stashCart.shareableLink(id, text, base_url = BASE_URL)


@app.route("/api/addAll")
@app.route("/api/addAll", method="POST")
def addAll():
    try:
        id = defaultValue(bottle.request.params.id, "")
        search = defaultValue(bottle.request.params.search, "")
    except:
        return {"errorMessage": "Invalid ID or search."}
    return model.stashCart.addAll(id, search)


@app.route("/api/delAll")
@app.route("/api/delAll", method="POST")
def delAll():
    try:
        id = defaultValue(bottle.request.params.id,"")
        search = defaultValue(bottle.request.params.search,"")
    except:
        return {"errorMessage": "Invalid ID or search."}
    return model.stashCart.delAll(id, search)


@app.route("/api/setSearch")
@app.route("/api/setSearch", method="POST")
def setSearch():
    try:
        id = defaultValue(bottle.request.params.id,"")
        search = defaultValue(bottle.request.params.search,"")
    except:
        return {"errorMessage": "Invalid ID or search"}

    return model.stashCart.setSearch(id, search)

@app.route("/outdated")
def outdate():
    return bottle.template("views/outdated")

@app.route("/api/version")
def apiVersion():
    return({'apiversion': 'Q1 Jan 10, 2017', 'request_hash': model.logQuota.generateSessionID(bottle.request), 'quota_credits': model.logQuota.getCredits(bottle.request)})

if __name__ == '__main__':
    bottle.run(host='localhost', port=8080, debug=True)
