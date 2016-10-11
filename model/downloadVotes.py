import time
import json
import traceback
from pymongo import MongoClient
client = MongoClient()
try:
	dbConf = json.load(open("./model/db.json","r"))
except:
	dbConf = json.load(open("./db.json","r"))
db = client[dbConf["dbname"]]

dimweight = 0.4158127 # (was set to  0.4156) needs to be extracted from the DB based on most recent nominate run   

def add_endpoints(mid, spread):
	"""Add attributes to nomimate attribute that aid in
	drawing cutting lines
	"""

	print mid, spread
	
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

	starttime = time.time()
	# Setup API version response
	if apitype=="Web" or apitype=="exportJSON" or apitype=="Web_Person":
		apiVersion = "Web 2016-07"
	elif apitype=="R":
		apiVersion = "R 2016-02"

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
	print found

	# Do we need to fold in members?
	if apitype=="Web_Person":
		needPeople=-1 # Just one specific member
	elif apitype=="exportCSV":
		needPeople=0 # No members at all
	else:
		needPeople=1 # All members

	rollcalls = rollcalls_col.find({'id': {'$in': rollcall_ids}})
	for rollcall in rollcalls:
		result = []
		try: # Lazy way to verify the rollcall is real
			# Pull all members in a single query.
			memberSet = []
			if needPeople==1:
				for vote in rollcall['votes']:
					memberSet.append(vote["id"])
				members = members_col.find({'id': {'$in': memberSet}})
			elif needPeople==-1:
				memberSet = []
				members = members_col.find({'id': {'$in': memberSet}})
			else:
				pass

			for member in members:
				bestName = ""
				if "bioName" in member and member["bioName"] is not None:
					bestName = member["bioName"]
				elif "fname" in member and member["fname"] is not None:
					bestName = member["fname"]
				else:
					bestName = member["name"]

				# Web returns different fields than R
				if apitype=="Web" or apitype=="exportJSON" or apitype=="Web_Person": # 'vote': _get_yeanayabs([m["v"] for m in rollcall['votes'] if m["id"]==member["id"]][0])
					v = {
						'vote': _get_yeanayabs([m["v"] for m in rollcall['votes'] if m["id"]==member["id"]][0]),
						'name': bestName,
						'id': member['id'],
						'party': member['partyname'],
						'state': member['stateAbbr'],
					}
					try:
						v['prob'] = [int(round(m["p"])) for m in rollcall["votes"] if m["id"]==member["id"]][0]
					except:
						pass

					if member['nominate']['oneDimNominate']:
						v['x'] = member['nominate']['oneDimNominate']
						v['y'] = member['nominate']['twoDimNominate']

					if member['stateAbbr'] == "POTUS":
						v['district'] = "POTUS"
					elif member['districtCode'] > 70:
						v['district'] = "%s00" % member['stateAbbr']
					elif member['districtCode'] and member['districtCode'] <= 70:
						v['district'] = "%s%02d" % (member['stateAbbr'], member['districtCode'])
					if not "district" in v: # We do this to force null districts to exist so as to avoid breaking DC_rollcall
						v["district"] = ""
					result.append(v)
				elif apitype=="R": # [m["v"] for m in rollcall["votes"] if m["id"]==member["id"]][0]
					v = {
						'vote': [m["v"] for m in rollcall["votes"] if m["id"]==member["id"]][0],
						'name': member['fname'],
						'id':member['id'],
						'icpsr': member['icpsr'],
						'party': member['party'],
						'state': member['state'],
						'cqlabel': member['cqlabel']
					}
					if member['nominate']['oneDimNominate']:
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

			if apitype=="Web" or apitype=="exportJSON" or apitype=="Web_Person":
				nominate = rollcall['nominate']
			elif apitype=="R":
				nominate = {k: rollcall['nominate'][k] for k in ['intercept', 'slope']}

			# Top level rollcall item.
			found[rollcall["id"]] = 1

			# Collapse codes for R
			if apitype=="Web" or apitype=="exportJSON" or apitype=="Web_Person":
				codes = rollcall["code"]
			elif apitype=="R":
				codes = rollcall["code"]
				for key, value in codes.iteritems():
					codes[key] = '; '.join(value)

			if not "keyvote" in rollcall:
				rollcall["keyvote"] = []
				
			z = {'votes': result, 'nominate': nominate, 'chamber': rollcall['chamber'],
				'congress': rollcall['congress'], 'date': rollcall['date'], 'rollnumber': rollcall['rollnumber'],
				'description': rollcall['description'], 'id': rollcall['id'], 'code': codes,
				'yea': rollcall["yea"], 'nay': rollcall["nay"], 'keyvote': rollcall["keyvote"]}
			if apitype=="Web_Person":
				print "in here"
				z["resultparty"] = rollcall["resultparty"]
			rollcall_results.append(z)

		except: # Invalid vote id
			print traceback.format_exc()
			errormessage = "Invalid Rollcall ID specified."
			errormeta.append(str(rollcall["id"]))

	if rollcalls.count() != len(rollcall_ids):
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
#	print downloadAPI("S1140430")
#	print downloadAPI("H1030301", "R")
	print downloadAPI("S0090027", "Web_Person")
	#print downloadAPI("S1140473", "Web_Person")["rollcalls"][0]["nominate"]
	pass
