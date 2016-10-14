# Needed for XLS writing but nothing else:
from writeXls import WriteXls
import json
from pymongo import MongoClient
from downloadVotes import downloadAPI

#Connection
connection = MongoClient(connect=False)
#dbConf = json.load(open("./model/db.json","r"))
#db = connection[dbConf["dbname"]]
db = connection['voteview']

# These are only used for XLS writing
infofields = [('id', 'id'),
              ('icpsr','icpsr'),
		('state_abbrev','state_abbrev'),
		('district_code','district_code'),
		('cqlabel','cqlabel'),
		('name','name'),
		('party_code','party_code')]
	
descriptionfields = [('id', 'id'),
                     ('chamber','chamber'),
			('congress','congress'),
			('date','date'),
			('rollnumber','rollnumber'),
			('description','description')]

icpsrfields = [('icpsr', 'icpsr'),
               ('id', 'id'),
               ('name', 'name'),
               ('state_abbrev', 'state_abbrev')]

def downloadXLS(ids, apitype="Web"):
	xls = "True"
        results = downloadAPI(ids, apitype = "R")

        if 'errormessage' in results:
                return [-1, results['errormessage']]

	rollcalls = [['vote']+[f[1] for f in descriptionfields]] # Header row for rollcalls

        icpsrSet = {}
        memberSet = {}
        
        for i, res in enumerate(results['rollcalls']):
                rollcalls.append(['V%i' % i] + [res[f[0]] for f in descriptionfields] ) # Append rollcalls to rows for rollcall sheet
                for v in res['votes']:
                        if v['icpsr'] in icpsrSet:
                                icpsrSet[v['icpsr']][i] = v["cast_code"]
                                if v['id'] not in memberSet:
                                         memberSet[v['id']] = {key[1]: v[key[0]] for key in infofields}
                        else:
                                icpsrSet[v['icpsr']] = {i: v["cast_code"], 'name': v['name'], 'state_abbrev': v['state_abbrev'], 'id': v['id'], 'icpsr': v['icpsr']}
                                memberSet[v['id']] = {key[1]: v[key[0]] for key in infofields}

        votes = [[f[1] for f in icpsrfields] + ["V%i" % (i+1) for i in range(len(results['rollcalls']))]] # Write member info fields

        members = [[f[1] for f in infofields]]

        for k,icpsr in icpsrSet.iteritems():
                votes.append([icpsr[f[0]] for f in icpsrfields] + [icpsr[i] if i in icpsr else 0 for i in range(len(results['rollcalls']))])

        for k,member in memberSet.iteritems():
                members.append([member[f[0]] for f in infofields])
        
	if xls == "True":
		# Write workbook
		print "Writing workbook..."
		wxls = WriteXls(rollcalls=rollcalls,votes=votes,members=members)
		wxls.addVotes()
		wxls.addRollcalls()
                wxls.addMembers()
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
	status, output = downloadXLS("RH1120013,RH1120011")
	#print output
	if status==0:
		print "OK"
	else:
		print "Error"
		print output
