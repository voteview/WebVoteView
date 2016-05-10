#import sys
import os
import json
import bottle
from model.searchVotes import query
import model.downloadVotes # Namespace issue
from model.searchMembers import memberLookup, getMembersBySession
from model.downloadXLS import downloadXLS
import datetime

# Turn this off on production:
bottle.debug(True)

# Setup
app = application = bottle.Bottle()

# Helper function for handling bottle arguments and setting defaults:
def defaultValue(x,value = None):
    return x is not "" and x or value

# These are only used for XLS writing
infofields = [('icpsr','icpsr'),
              ('state','state'),
              ('districtCode','district'),
              ('cqlabel','cqlabel'),
              ('name','name'),
              ('party','party')]

descriptionfields = [('chamber','chamber'),
                     ('session','congress'),
                     ('date','date'),
                     ('rollnumber','rollnumber'),
                     ('description','description')]


#
# Web pages
#
# Pass through static content -- nginx should handle this, but if it doesn't, bottle will
@app.route('/static/<path:path>')
def callback(path):
        return bottle.static_file(path,"./static")

# Index
@app.route("/")
def index():
	return "VoteView server"

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

@app.route("/search_query")
def search_query():
	output = bottle.template('views/search')
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
		# Look up votes

		# Check if bio image exists
		if not os.path.isfile("static/img/bio/"+str(person["icpsr"]).zfill(6)+".jpg"):
			person["bioImg"] = "silhouette.png"
		else:
			person["bioImg"] = str(person["icpsr"]).zfill(6)+".jpg"	

		output = bottle.template("views/person",person=person, votes=[])
		return(output)

	# If we have an error, return an error page
	else:
		return(person)
#
#
# API methods
#
#

@app.route("/api/getmembersbysession",method="POST")
@app.route("/api/getmembersbysession")
def getmembersbysession():
    session = defaultValue(bottle.request.params.session,0)
    return(getMembersBySession(session))

@app.route("/api/getmembers",method="POST")
@app.route("/api/getmembers")
def getmembers():
	qDict = {}

	for key, value in bottle.request.params.iteritems(): # Transparently pass through the entire query dictionary
		qDict[key] = defaultValue(value)

	return(memberLookup(qDict))

@app.route("/api/search",method="POST")
@app.route("/api/search")
def search():
    q = defaultValue(bottle.request.params.q)
    startdate = defaultValue(bottle.request.params.startdate)
    enddate = defaultValue(bottle.request.params.enddate)
    chamber = defaultValue(bottle.request.params.chamber) 

    res = query(q,startdate,enddate,chamber)
    return(res)

@app.route("/api/download",method="POST")
@app.route("/api/download")
def downloadAPI():
    rollcall_id = defaultValue(bottle.request.params.rollcall_id)
    apitype = defaultValue(bottle.request.params.apitype,"Web")
    res = model.downloadVotes.downloadAPI(rollcall_id, apitype)
    return(res)

@app.route("/api/downloadXLS")
def download():
	ids = defaultValue(bottle.request.query.ids)
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
