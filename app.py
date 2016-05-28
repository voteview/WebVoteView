#import sys
import traceback
import os
import json
import bottle
from model.searchVotes import query
import model.downloadVotes # Namespace issue
from model.searchMembers import memberLookup, getMembersByCongress
from model.bioData import yearsOfService, checkForPartySwitch
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
	output = bottle.template("views/search", args=argDict)
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

	# Pull by ICPSR
	person = memberLookup({"icpsr": icpsr}, 1)

	# If we have no error, follow through
	if not "errormessage" in person:
		person = person["results"][0]
		votes = []
		# Look up votes

		# Check if bio image exists
		bioFound = 0
		if not os.path.isfile("static/img/bios/"+str(person["icpsr"]).zfill(6)+".jpg"):
			# If not, use the default silhouette
			person["bioImg"] = "silhouette.png"
		else:
			person["bioImg"] = str(person["icpsr"]).zfill(6)+".jpg"	
			bioFound = 1

		# Get years of service
		person["yearsOfService"] = yearsOfService(person["icpsr"])
	
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
	if not "rollcalls" in rollcall or "errormessage" in rollcall:
		output = bottle.template("views/error", errorMessage=rollcall["errormessage"])
		return(output)			

	output = bottle.template("views/dc_rollcall", rollcall=rollcall["rollcalls"][0])
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
	startdate = defaultValue(bottle.request.params.startdate)
	enddate = defaultValue(bottle.request.params.enddate)

	try:
		chamber = bottle.request.params.getall("chamber")
		if len(chamber)>1:
			chamber = None
		elif type(chamber)==type([]):
			chamber = chamber[0]
	except:
		chamber = None

	try:
		fromCongress = int(defaultValue(bottle.request.params["fromCongress"],0))
		toCongress = int(defaultValue(bottle.request.params["toCongress"],0))
		if q is None and (fromCongress or toCongress):
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

	nextId = defaultValue(bottle.request.params.nextId,0)
	icpsr = defaultValue(bottle.request.params.icpsr)
	jsapi = 1
	rowLimit = 50
	res = query(q, startdate, enddate, chamber, icpsr=icpsr, rowLimit=rowLimit, jsapi=jsapi, sortSkip=nextId)

	if "errormessage" in res:
		out = bottle.template("views/search_list", rollcalls = [], errormessage=res["errormessage"])
	else:
		bottle.response.headers["rollcall_number"] = res["recordcountTotal"]
		bottle.response.headers["nextId"] = res["nextId"]
		out = bottle.template("views/search_list", rollcalls = res["rollcalls"], errormessage="") 
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

@app.route("/api/version")
def apiVersion():
    return({'apiversion': 'Q2'})

if __name__ == '__main__':
    bottle.run(host='localhost',port=8080, debug=True)
