import time
import json
import traceback
from pymongo import MongoClient
from bson.objectid import ObjectId
client = MongoClient()
try:
	dbConf = json.load(open("./model/db.json","r"))
except:
	dbConf = json.load(open("./db.json","r"))
db = client[dbConf["dbname"]]

dimweight = 0.4158127 # (was set to  0.4156) needs to be extracted from the DB based on most recent nominate run   

#print db['voteview_members'].find_one({'person_id': ObjectId('57e8dc795620f7c376a7009a')})
def add_endpoints(mid, spread):
	"""Add attributes to nomimate attribute that aid in
	drawing cutting lines
	"""

	#print mid, spread
	
	if (spread[0] == 0 and
			float(spread[1]) == 0 and
			float(mid[0]) == 0 and
			float(mid[1]) == 0):
		x = [0, 0]
		y = [0, 0]
		slope = None
		intercept = None
	elif abs(float(spread[1])) < 1e-16:
		x = [float(mid[0]),float(mid[0])]
		y = [-10, 10]
		slope = 1000
		intercept = -slope * (float(mid[0])
					+ float(mid[1]))
	else:
		slope = -float(spread[0] / (float(spread[1]) * dimweight * dimweight))
		intercept = (-slope * float(mid[0]) + float(mid[1]))
		x = [10, -10]
		y = [intercept + slope * xx for xx in x]

	return slope, intercept, x, y

def _get_yeanayabs(vote_id):
	"""
	Map vote ids with the proper values
	Yea -> [1..3], Nay -> [4..6], Abs -> [7..9]
	"""
	if vote_id < 4:
		return "Yea"
	elif vote_id < 7:
		return "Nay"
	elif vote_id < 10:
		return "Abs"

def downloadAPI(rollcall_id, apitype="Web"):
	rollcalls_col = db.voteview_rollcalls
	members_col = db.voteview_members
        dwnom_col = db.voteview_dwnom
        persons_col = db.voteview_persons

        notRApis = ["Web", "exportJSON", "Web_Person", "exportCSV"]

	starttime = time.time()
	# Setup API version response
	if apitype in notRApis:
		apiVersion = "Web 2016-10"
	elif apitype=="R":
		apiVersion = "R 2016-10"

	if not rollcall_id or len(rollcall_id)==0:
		response = {'errormessage': 'No rollcall id specified.', 'apitype': apiVersion}
		return response

        # Split multiple ID requests into list
	if type(rollcall_id)==type([""]):
		rollcall_ids = rollcall_id
	elif "," in rollcall_id:
		rollcall_ids = [x.strip() for x in rollcall_id.split(",")]
	else:
		rollcall_ids = [rollcall_id]

	 # Abuse filter
	maxVotes = 100
	if apitype=="exportJSON":
		maxVotes = 500
	if len(rollcall_ids)>maxVotes:
		response = {'errormessage': 'API abuse. Too many votes.', 'apitype': apiVersion}
		return response

	rollcall_results = [] # Stores top level rollcall results, one per vote
	errormessage = "" # String storing error text
	errormeta = [] # List storing failed IDs

	found = {}
	for rid in rollcall_ids:
		found[rid] = 0
	print rollcall_ids
	rollcalls = list(rollcalls_col.find({'id': {'$in': rollcall_ids}}))

        icpsrs = {}
        if apitype != "exportCSV":
                for i in dwnom_col.find({'icpsr': {'$in':[v['icpsr'] for rc in rollcalls for v in rc['votes']]}}):
                        icpsrs[str(i['icpsr'])] = i

	for rollcall in rollcalls:
		result = []
		try: # Lazy way to verify the rollcall is real
			# Pull all members in a single query.
                        if apitype != "exportCSV":

#                                person_ids = [icpsrs[vote['icpsr']]['person_id'] for vote in rollcall['votes']
#                                members = members_col.find({'person_id': {'$in': person_ids}, 'congress': rollcall['congress'], 'chamber': rollcall['chamber']})
#                                persons = persons_col.find({'person_id': {'$in': person_ids})

                                for m in rollcall['votes']:
                                        icpsr = str(m['icpsr'])
                                        person_id = icpsrs[icpsr]['person_id']
                                        # Not robust to someone who was in this chamber and then became president and this is their chamber record...
                                        member = members_col.find_one({'person_id': ObjectId(person_id), 'congress': rollcall['congress'], 'chamber': rollcall['chamber']})
                                        if not member:
                                              member = members_col.find_one({'person_id': ObjectId(person_id), 'congress': rollcall['congress'], 'chamber': 'President'})

                                        person = persons_col.find_one({'_id': ObjectId(person_id)})

                                        bestName = ""                                        
                                        if "bioname" in person and person["bioname"] is not None:
                                                bestName = person["bioname"]
                                        else:
                                                bestName = member["fname"]

                                        # Web returns different fields than R
                                        if apitype=="Web" or apitype=="exportJSON" or apitype=="Web_Person":
                                                v = {
                                                        'vote': _get_yeanayabs(m["cast_code"]),
                                                        'name': bestName,
                                                        'icpsr': icpsr,
                                                        'party': member['party_name'],
                                                        'state': member['state_abbrev'],
                                                }
                                                try:
                                                        v['prob'] = int(round(m["p"]))
                                                except:
                                                        pass

                                                if 'nominate' in icpsrs[icpsr] and icpsrs[icpsr]['nominate']['oneDimNominate']:
                                                        v['x'] = icpsrs[icpsr]['nominate']['oneDimNominate']
                                                        v['y'] = icpsrs[icpsr]['nominate']['twoDimNominate']
                                                print(member)
                                                if member['state_abbrev'] == "USA":
                                                        v['district'] = "POTUS"
                                                elif member['district_code'] > 70:
                                                        v['district'] = "%s00" % member['state_abbrev']
                                                elif member['district_code'] and member['district_code'] <= 70:
                                                        v['district'] = "%s%02d" % (member['state_abbrev'], member['district_code'])

                                                if not "district" in v: # We do this to force null districts to exist so as to avoid breaking DC_rollcall
                                                        v["district"] = ""

                                        elif apitype=="R": # [m["v"] for m in rollcall["votes"] if m["id"]==member["id"]][0]
                                                v = {
                                                        'vote': m['cast_code'],
                                                        'name': person['fname'],
                                                        'id': member['id'],
                                                        'icpsr': member['icpsr'],
                                                        'party': member['party_name'],
                                                        'state': member['state_abbrev']#,
                                                        #'cqlabel': member['cqlabel']
                                                }
                                                if icpsrs[icpsr]['nominate']['oneDimNominate']:
                                                        v['nom1'] = member['nominate']['oneDimNominate']
                                                        v['nom2'] = member['nominate']['twoDimNominate']
                                                result.append(v)

                        # Top level nominate metadata
                        if "nominate" in rollcall and "slope" in rollcall["nominate"]:
                                del rollcall["nominate"]["slope"]
                        if "nominate" in rollcall and "intercept" in rollcall["nominate"]:
                                del rollcall["nominate"]["intercept"]
                        if "nominate" in rollcall and "x" in rollcall["nominate"]:
                                del rollcall["nominate"]["x"]
                        if "nominate" in rollcall and "y" in rollcall["nominate"]:
                                del rollcall["nominate"]["y"]

                        if "nominate" in rollcall and "mid" in rollcall["nominate"] and "spread" in rollcall["nominate"] and rollcall["nominate"]["spread"][0] is not None:
                                rollcall["nominate"]["slope"], rollcall["nominate"]["intercept"], rollcall["nominate"]["x"], rollcall["nominate"]["y"] = add_endpoints(rollcall["nominate"]["mid"], rollcall["nominate"]["spread"])

                        if apitype in notRApis:
                                #print rollcall
                                nominate = rollcall['nominate']
                        elif apitype=="R":
                                nominate = {k: rollcall['nominate'][k] for k in ['intercept', 'slope']}

                        # Top level rollcall item.
                        found[rollcall["id"]] = 1

                        # Collapse codes for R
                        if apitype in notRApis:
                                codes = rollcall["codes"]
                        elif apitype=="R":
                                codes = rollcall["codes"]
                                for key, value in codes.iteritems():
                                        codes[key] = '; '.join(value)

                        if not "keyvote" in rollcall:
                                rollcall["keyvote"] = []

                        # If no description use use vote_document_text
                        if 'description' in rollcall:
                                description = rollcall['description']
                        elif 'vote_document_text' in rollcall:
                                description = rollcall['vote_document_text']
                        else:
                                description = ""

                        z = {'votes': result, 'nominate': nominate, 'chamber': rollcall['chamber'],
                                'congress': rollcall['congress'], 'date': rollcall['date'], 'rollnumber': rollcall['rollnumber'],
                                'description': description, 'id': rollcall['id'], 'code': codes,
                                'yea': rollcall["yea_count"], 'nay': rollcall["nay_count"], 'keyvote': rollcall["keyvote"]}
                        if apitype=="Web_Person":
                                print "in here"
                                z["resultparty"] = rollcall["party_vote_counts"]
                        print z
                        rollcall_results.append(z)

		except: # Invalid vote id
			print traceback.format_exc()
			errormessage = "Invalid Rollcall ID specified."
			errormeta.append(str(rollcall["id"]))

	if len(rollcalls) != len(rollcall_ids):
		errormessage = "Invalid Rollcall ID specified."
		for voteID, num in found.iteritems():
			if num==0:
				errormeta.append(str(voteID))

	endtime = time.time()
	response = {}
	if len(rollcall_results):
		response["rollcalls"] = rollcall_results
	if len(errormessage):
		response["errormessage"] = errormessage
		if len(errormeta):
			response["errormeta"] = errormeta
	response["apitype"] = apiVersion
	response["elapsedTime"] = round(endtime - starttime,3)
	return response

def downloadStash(id):
	if not id:
		return {"errormessage": "Invalid stash id.", "rollcalls": []}
	else:
		res = db.stash.find_one({"id": id})
		if not res or res is None:
			return {"errormessage": "Invalid stash id.", "rollcalls": []}
		else:
			voteIds = []
			if "old" in res:
				voteIds = voteIds + res["old"]
			if "votes" in res:
				voteIds = list(set(voteIds + res["votes"]))
			return downloadAPI(voteIds, apitype="exportJSON")			

if __name__=="__main__":
#	print downloadStash("3a5c69e7")
	print downloadAPI("RS1130430,RS1130400", "exportCSV")
#	print downloadAPI("H1030301", "R")
	#test = downloadAPI(["RH1131202", "RH0010001", "RS0020010", "RS113003"] + ["RH1130" + "%03d" % (x) for x in range(1,400)], "exportJSON")
	#print downloadAPI("S1140473", "Web_Person")["rollcalls"][0]["nominate"]
        #print test
	pass
