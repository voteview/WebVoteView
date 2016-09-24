import model.downloadVotes

def prepVotes(voteQuery, person):
	if not "errorMessage" in voteQuery and "rollcalls" in voteQuery:
		votes = voteQuery["rollcalls"]
		idSet = [v["id"] for v in votes]
		rollcallsFinal = model.downloadVotes.downloadAPI(idSet,"Web_Person")

		if "rollcalls" in rollcallsFinal and len(rollcallsFinal["rollcalls"])>0:
			for i in xrange(0, len(idSet)):
				# Isolate votes from the rollcall
				try:
					iV = [r for r in rollcallsFinal["rollcalls"] if r["id"]==votes[i]["id"]][0]
					votes[i]["myVote"] = [v["vote"] for v in iV["votes"] if v["id"]==person["id"]][0]
				except:
					votes[i]["myVote"] = "Abs"
					votes[i]["partyLabelVote"] = "N/A"
					votes[i]["pVSum"] = 0
					continue

				# Isolate my probability from the rollcall, if it's there.
				try:
					votes[i]["myProb"] = [v["prob"] for v in iV["votes"] if v["id"]==person["id"]][0]
				except:
					pass

				try:
					votes[i]["partyVote"] = [v for k, v in iV["resultparty"].iteritems() if k==person["partyname"]][0]
					votes[i]["pVSum"] = sum([1*v if int(k)<=3 else -1*v if int(k)<=6 else 0 for k, v in votes[i]["partyVote"].iteritems()])
					votes[i]["partyLabelVote"] = "Yea" if votes[i]["pVSum"]>0 else "Nay" if votes[i]["pVSum"]<0 else "Tie"
				except:
					votes[i]["partyLabelVote"] = "N/A"
					votes[i]["pVSum"] = 0
		else:
			votes = []
	else:
		votes = []

	return votes
