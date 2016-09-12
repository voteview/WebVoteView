import time
import json
import traceback
from pymongo import MongoClient
client = MongoClient()
dbConf = json.load(open("./model/db.json","r"))
db = client[dbConf["dbname"]]

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

	rollcalls = rollcalls_col.find({'id': {'$in': rollcall_ids}})
	for rollcall in rollcalls:
		result = []
		try: # Lazy way to verify the rollcall is real
			# Pull all members in a single query.
			memberSet = []
			for vote in rollcall['votes']:
				memberSet.append(vote["id"])
			members = members_col.find({'id': {'$in': memberSet}})

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
						v['prob'] = [m["p"] for m in rollcall["votes"] if m["id"]==member["id"]][0]
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
				
			z = {'votes': result, 'nominate': nominate, 'chamber': rollcall['chamber'],
				'congress': rollcall['congress'], 'date': rollcall['date'], 'rollnumber': rollcall['rollnumber'],
				'description': rollcall['description'], 'id': rollcall['id'], 'code': codes,
				'yea': rollcall["yea"], 'nay': rollcall["nay"]}
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
	print downloadAPI("H1141178", "Web_Person")["rollcalls"][0]["resultparty"]
	pass
