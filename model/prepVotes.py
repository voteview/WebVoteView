import traceback
import model.downloadVotes

def prepVotes(voteQuery, person):
	if not "errorMessage" in voteQuery and "rollcalls" in voteQuery:
		votes = voteQuery["rollcalls"]
		idSet = [v["id"] for v in votes]
		print idSet
		rollcallsFinal = model.downloadVotes.downloadAPI(idSet,"Web_Person", person["icpsr"])

		if "rollcalls" in rollcallsFinal and len(rollcallsFinal["rollcalls"])>0:
			for i in xrange(0, len(idSet)):
				# Isolate votes from the rollcall
				try:
					iV = next((r for r in rollcallsFinal["rollcalls"] if r["id"]==votes[i]["id"]), None)
					if not iV or iV is None:
						print "Error finding the rollcall data based on vote id."
						votes[i]["myVote"] = "Abs"
						votes[i]["partyLabelVote"] = "N/A"
						votes[i]["pVSum"] = 0
					else:
						myVote = next((v["vote"] for v in iV["votes"] if v["icpsr"]==person["icpsr"]), None)
						if myVote is not None:
							votes[i]["myVote"] = myVote
						else:
							print "Error matching individual vote to vote."
							continue
				except:
					print traceback.format_exc()
					votes[i]["myVote"] = "Abs"
					votes[i]["partyLabelVote"] = "N/A"
					votes[i]["pVSum"] = 0
					continue

				# Isolate my probability from the rollcall, if it's there.
				try:
					probResult = next((v["prob"] for v in iV["votes"] if v["icpsr"]==person["icpsr"]), None)
					if probResult is not None:
						votes[i]["myProb"] = probResult
				except:
					print person["icpsr"]
					print iV["votes"]
					for v in iV["votes"]:
						print v
					
					print traceback.format_exc()
					print "Error calculating probability of vote."
					pass

				# Now isolate the party vote info.
				try:
					votes[i]["partyVote"] = next((v for k, v in iV["party_vote_counts"].iteritems() if k==str(person["party_code"])),None) 
					if votes[i]["partyVote"] is not None:
						votes[i]["pVSum"] = sum([1*v if int(k)<=3 else -1*v if int(k)<=6 else 0 for k, v in votes[i]["partyVote"].iteritems()])
						votes[i]["partyLabelVote"] = "Yea" if votes[i]["pVSum"]>0 else "Nay" if votes[i]["pVSum"]<0 else "Tie"
					else:
						votes[i]["partyLabelVote"] = "N/A"
						votes[i]["pVSum"] = 0
				except:
					print "Error calculating party vote."
					votes[i]["partyLabelVote"] = "N/A"
					votes[i]["pVSum"] = 0
		else:
			votes = []
	else:
		votes = []

	return votes
