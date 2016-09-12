# Needed for XLS writing but nothing else:
from writeXls import WriteXls
from pymongo import MongoClient

#Connection
connection = MongoClient(connect=False)
dbConf = json.load(open("./model/db.json","r"))
db = connection[dbConf["dbname"]]

# These are only used for XLS writing
infofields = [('icpsr','icpsr'),
		('state','state'),
		('districtCode','district'),
		('cqlabel','cqlabel'),
		('name','name'),
		('party','party')]
	
descriptionfields = [('chamber','chamber'),
			('congress','congress'),
			('date','date'),
			('rollnumber','rollnumber'),
			('description','description')]

def downloadXLS(ids, apitype="Web"):
	xls = "True"
	try:
		if type(ids)==type(str("")):
			ids = [i.strip() for i in ids.split(',')]
	except:
		return [-1, "Error: No rollcall IDs specified."]

	if not ids or not len(ids):
		return [-1, "Error: No rollcall IDs specified."]
	maxIds = 100
	if apitype=="exportXLS":
		maxIds = 250

	if len(ids)>maxIds:
		return [-1, "Error: API abuse. Too many rollcall IDs requested."]

	rollcalls = [['vote']+[f[1] for f in descriptionfields]] # Header row for rollcalls
	results = db.voteview_rollcalls.find({"id": {"$in": ids}}).sort([("id",1)])
	icpsrset = []
	voteData = {}
	i=1
	if not results.count():
		return [-1, "Error: No results for the requested rollcall IDs."]

	for result in results: # Loop over results
		rollcalls.append(['V%i' % i] + [result[f[0]] for f in descriptionfields] ) # Append rollcalls to rows for rollcall sheet
		for item in result["votes"]:
			key = item["id"]
			vote = item["v"]
			icpsrset.append(int(key[2:7])) # Make a note of ICPSR
			if not int(key[2:7]) in voteData: # If we've never seen the member before, pre-allocate their dict.
				voteData[int(key[2:7])] = {}
			voteData[int(key[2:7])][i] = vote # Now write their vote to the vote data dict.
		i=i+1 # Increment the indicator variable

	votes = [[f[1] for f in infofields] + ["V%i" % (i+1) for i in range(len(ids))]] # Write member info fields
											# then a field V1, V2, V... for all votes.
	uniqueicpsrs = list(set(icpsrset)) # De-duplicate icpsrs for the member pull
	members = db.voteview_members.find({"icpsr": {"$in": uniqueicpsrs}}) # Pull all those members
	memberData = {}
	seenMembers = []
	for member in members:
		if member["icpsr"] in seenMembers: # If we get multiple ICPSR hits for same person, just take the first one
			continue
		seenMembers.append(member["icpsr"])
		votes.append([member[field[0]] for field in infofields] + [v for k,v in voteData[member["icpsr"]].iteritems()])

	if xls == "True":
		# Write workbook
		print "Writing workbook..."
		wxls = WriteXls(rollcalls=rollcalls,votes=votes)
		wxls.addVotes()
		wxls.addRollcalls()
		return [0, wxls.render()]

def downloadStash(stash):
	if not stash:
		return [-1, "Error: No stash ID provided."]
	res = db.stash.find_one({"id": stash})
	if not res or res is None:
		return [-1, "Error: Invalid stash ID provided."]

	voteIds = []
	if "old" in res:
		voteIds = voteIds + res["old"]
	if "votes" in res:
		voteIds = list(set(voteIds + res["votes"]))
	return downloadXLS(voteIds, "exportXLS")

if __name__ == "__main__":
	print "Begin download..."
	status, output = downloadXLS("H1120013,H1120011")
	#print output
	if status==0:
		print "OK"
	else:
		print "Error"
		print output
