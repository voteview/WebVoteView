#import sys
import re
import traceback
import os
import json
import bottle
from fuzzywuzzy import fuzz
from model.searchVotes import query
import model.downloadVotes # Namespace issue
from model.emailContact import sendEmail
from model.searchMembers import memberLookup, getMembersByCongress
from model.bioData import yearsOfService, checkForPartySwitch, congressesOfService, congressToYear
from model.downloadXLS import downloadXLS
import datetime

# Turn this off on production:
bottle.debug(True)

# Setup
app = application = bottle.Bottle()

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
	try:
		argDict = {}
		for k,v in bottle.request.params.iteritems():
			argDict[k] = v
	except:
		pass

	try:
		if "fromDate" in argDict:
			argDict["fromDate"] = argDict["fromDate"].replace("/","-")
			argDict["fromDate"] = re.sub(r"[^0-9\-\ ]","",argDict["fromDate"])
		if "toDate" in argDict:
			argDict["toDate"] = argDict["toDate"].replace("/","-")
			argDict["toDate"] = re.sub(r"[^0-9\-\ ]","",argDict["toDate"])
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
		output = bottle.template("views/search", args=argDict)
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

@app.route("/data")
def data():
	output = bottle.template("views/data")
	return output

@app.route("/research")
def research():
	output = bottle.template("views/research")
	return output

# Pages that have arguments
@app.route("/explore")
@app.route("/explore/<chamber:re:house|senate>")
def explore(chamber="house"):
	chamber = defaultValue(bottle.request.params.chamber,"house")
	if chamber is not "senate": # Security to prevent the argument being passed through being malicious.
		chamber = "house"

	output = bottle.template("views/explore",chamber=chamber)
	return output

@app.route("/person")
@app.route("/person/<icpsr>")
def person(icpsr=0):
	if not icpsr:
		icpsr = defaultValue(bottle.request.params.icpsr,0)

	# Easter Egg
	keith = defaultValue(bottle.request.params.keith, 0)

	# Pull by ICPSR
	person = memberLookup({"icpsr": icpsr}, 1)

	# If we have no error, follow through
	if not "errormessage" in person:
		person = person["results"][0]
		if "bioName" in person and person["bioName"] is not None:
			person["canonicalName"] = person["bioName"]
		elif "fname" in person and person["fname"] is not None:
			person["canonicalName"] = person["fname"]
		else:
			person["canonicalName"] = person["name"]

		votes = []
		# Look up votes

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

		# Get years of service
		person["yearsOfService"] = yearsOfService(person["icpsr"])
		person["congressesOfService"] = congressesOfService(person["icpsr"])
		person["congressLabels"] = {}
		for congressChunk in person["congressesOfService"]:
			for cong in range(congressChunk[0], congressChunk[1]+1):
				person["congressLabels"][cong] = str(cong)+"th Congress ("+str(congressToYear(cong,0))+"-"+str(congressToYear(cong,1))+")"
	
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

					
		voteQuery = query(qtext="voter: "+str(person["id"]), rowLimit=25, jsapi=1)
		#return(voteQuery)
		if not "errorMessage" in voteQuery and "rollcalls" in voteQuery:
			votes = voteQuery["rollcalls"]
		else:
			votes = []

		if "bio" in person:
			person["bio"] = person["bio"].replace("a Representative","Representative")			

		# Go to the template.
		output = bottle.template("views/person",person=person, votes=votes)
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

	output = bottle.template("views/dc_rollcall", rollcall=rollcall["rollcalls"][0], mapParties=mapParties)
	return(output)
#
#
# API methods
#
#

@app.route("/api/getmembersbycongress",method="POST")
@app.route("/api/getmembersbycongress")
def getmembersbycongress():
    congress = defaultValue(bottle.request.params.congress,0)
    return(getMembersByCongress(congress))

@app.route("/api/getmembers",method="POST")
@app.route("/api/getmembers")
def getmembers():
	qDict = {}

	for key, value in bottle.request.params.iteritems(): # Transparently pass through the entire query dictionary
		qDict[key] = defaultValue(value)

	return(memberLookup(qDict))

@app.route("/api/searchAssemble", method="POST")
@app.route("/api/searchAssemble")
def searchAssemble():
	q = defaultValue(bottle.request.params.q)
	nextId = defaultValue(bottle.request.params.nextId,0)

	# Member search
	resultMembers = []

	if q is not None and not nextId and not ":" in q and len(q.split())<5 and len(q):
		memberSearch = memberLookup({"name": q}, 8, distinct=1)
		if "results" in memberSearch:
			for member in memberSearch["results"]:
				memName = ""
				if "bioName" in member and member["bioName"] is not None:
					memName = member["bioName"]
				elif "fname" in member and member["fname"] is not None:
					memName = member["fname"]
				else:
					memName = member["name"]

				try:
					memName = memName.replace(",","").lower()
				except:
					memName = memName.lower()

				member["scoreMatch"] = fuzz.token_set_ratio(memName, q.replace(",","").lower())
				if not os.path.isfile("static/img/bios/"+str(member["icpsr"]).zfill(6)+".jpg"):
					member["bioImg"] = "silhouette.png"
				else:
					member["bioImg"] = str(member["icpsr"]).zfill(6)+".jpg"	
				member["yearsOfService"] = yearsOfService(member["icpsr"])

				resultMembers.append(member)
	resultMembers.sort(key=lambda x: -x["scoreMatch"])
	if len(resultMembers) and resultMembers[0]["scoreMatch"]==100:
		resultMembers = [x for x in resultMembers if x["scoreMatch"]==100]

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
				min, max = [int(x) for x in support.split(",")]
				if min!=0 or max!=100:
					q = q + " support:["+str(min)+" to "+str(max)+"]"
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
		peltzman = bottle.request.params.getall("peltzman")
	except:
		peltzman = []
	codeString = ""
	if len(clausen):
		for cCode in clausen:
			codeString += "code.Clausen: "+cCode+" OR "
	if len(peltzman):
		for pCode in peltzman:
			codeString += "code.Peltzman: "+pCode+" OR "
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

	icpsr = defaultValue(bottle.request.params.icpsr)
	jsapi = 1
	rowLimit = 50
	res = query(q, startdate, enddate, chamber, icpsr=icpsr, rowLimit=rowLimit, jsapi=jsapi, sortDir=sortD, sortSkip=nextId)

	if "errormessage" in res:
		out = bottle.template("views/search_list", rollcalls = [], errormessage=res["errormessage"], resultMembers=resultMembers)
	else:
		bottle.response.headers["rollcall_number"] = res["recordcountTotal"]
		bottle.response.headers["member_number"] = len(resultMembers)
		bottle.response.headers["nextId"] = res["nextId"]
		out = bottle.template("views/search_list", rollcalls = res["rollcalls"], errormessage="", resultMembers=resultMembers) 
	return(out)

@app.route("/api/search",method="POST")
@app.route("/api/search")
def search():
	q = defaultValue(bottle.request.params.q)
	startdate = defaultValue(bottle.request.params.startdate)
	enddate = defaultValue(bottle.request.params.enddate)
	chamber = defaultValue(bottle.request.params.chamber) 
	icpsr = defaultValue(bottle.request.params.icpsr)

	res = query(q,startdate,enddate,chamber, icpsr=icpsr)
	return(res)

@app.route("/api/download",method="POST")
@app.route("/api/download")
@app.route("/api/download/<rollcall_id>")
def downloadAPI(rollcall_id=""):
	if not rollcall_id:
		rollcall_id = defaultValue(bottle.request.params.rollcall_id)
	apitype = defaultValue(bottle.request.params.apitype,"Web")
	res = model.downloadVotes.downloadAPI(rollcall_id, apitype)
	return(res)

@app.route("/api/downloadXLS",method="POST")
@app.route("/api/downloadXLS")
def download():
	ids = bottle.request.params.getall("ids")
	try:
		if type(ids)==type([]):
			ids = ",".join(ids)
	except:
		pass
		
	xls = True
	statusCode, result = downloadXLS(ids)
	if xls:
		if statusCode==0:
			bottle.response.content_type = 'application/vnd.ms-excel'
			currentDateString = datetime.datetime.now().strftime("%Y%m%d_%H%M")
			outputFilename = currentDateString+"_voteview_download.xls"
			bottle.response.headers["Content-Disposition"] = "inline; filename="+outputFilename
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

@app.route("/api/version")
def apiVersion():
    return({'apiversion': 'Q2'})

if __name__ == '__main__':
    bottle.run(host='localhost',port=8080, debug=True)
