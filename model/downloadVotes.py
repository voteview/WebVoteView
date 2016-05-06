import time
import traceback
from pymongo import MongoClient
client = MongoClient()
db = client["voteview"]

def _get_yeanayabs(vote_id):
	"""
	Map vote ids with the propper values
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
	if apitype=="Web":
		apiVersion = "Web 2016-02"
	elif apitype=="R":
		apiVersion = "R 2016-02"

	 # Split multiple ID requests into list
	if "," in rollcall_id:
		rollcall_ids = [x.strip() for x in rollcall_id.split(",")]
	else:
		rollcall_ids = [rollcall_id]

	 # Abuse filter
	if len(rollcall_ids)>100:
		response = {'errormessage': 'API abuse. Too many votes.', 'apitype': apiVersion}
		return response

	rollcall_results = [] # Stores top level rollcall results, one per vote
	errormessage = "" # String storing error text
	errormeta = [] # List storing failed IDs
	for search_rollcall_id in rollcall_ids: # Loop through everything
		rollcall = rollcalls_col.find_one({'id': search_rollcall_id}) # Query
		result = []
		try: # Lazy way to verify the rollcall is real
			for vote in rollcall['votes']:
				member = members_col.find_one({'id': vote})
				# Web returns different fields than R
				if apitype=="Web":
					v = {
						'vote': _get_yeanayabs(rollcall['votes'][vote]),
						'name': member['fname'],
						'id': member['id'],
						'party': member['partyname'],
						'state': member['stateAbbr']
					}
					if member['nominate']['oneDimNominate']:
						v['x'] = member['nominate']['oneDimNominate']
						v['y'] = member['nominate']['twoDimNominate']

					if member['districtCode'] > 70:
						v['district'] = "%s00" % member['stateAbbr']
					elif member['districtCode'] and member['districtCode'] <= 70:
						v['district'] = "%s%02d" % (member['stateAbbr'], member['districtCode'])
					result.append(v)
				elif apitype=="R":
					v = {
						'vote': rollcall['votes'][vote],
						'name': member['fname'],
						'id':member['id'],
						'icpsr': member['icpsr'],
						'party': member['party'],
						'state': member['state'],
						'cqlabel': member['cqlabel']
					}
					if member['nominate']['oneDimNominate']:
						v['x'] = member['nominate']['oneDimNominate']
						v['y'] = member['nominate']['twoDimNominate']
					result.append(v)

			# Top level nominate metadata
			if apitype=="Web":
				nominate = rollcall['nominate']
			elif apitype=="R":
				nominate = {k: rollcall['nominate'][k] for k in ['intercept', 'slope']}

			# Top level rollcall item.
			rollcall_results.append({'votes': result, 'nominate': nominate, 'chamber': rollcall['chamber'],
						'session': rollcall['session'], 'date': rollcall['date'], 'rollnumber': rollcall['rollnumber'],
						'description': rollcall['description'], 'id': str(search_rollcall_id)})
		except: # Invalid vote id
			print traceback.format_exc()
			errormessage = "Invalid Rollcall IDs."
			errormeta.append(str(search_rollcall_id))

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

if __name__=="__main__":
	print downloadAPI("H1050998,H1050997,H1050996")

