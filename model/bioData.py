from searchMembers import memberLookup

def congressesOfService(icpsr):
	print icpsr
	if type(icpsr)!=type(str("")) or len(icpsr)<6:
		icpsr = str(icpsr).zfill(6)

	terms = memberLookup({"icpsr": icpsr},50)
	if not "results" in terms:
		return -1

	congressNums = sorted([x["congress"] for x in terms["results"]])
	congressChunks = []
	start=0
	last=0
	for congress in congressNums:
		print congress
		if start==0:
			start = congress
			last = start
		elif congress<=last+1:
			last = congress
		else:
			congressChunks.append([start, last])
			start = congress
			last = start
	congressChunks.append([start, last])

	return congressChunks

def yearsOfService(icpsr):
	congressesSet = congressesOfService(icpsr)
	yearChunks = []
	for s in congressesSet:
		yearChunks.append([congressToYear(s[0],0),congressToYear(s[1],1)])

	return yearChunks

def congressToYear(congress, endDate):
	return 1787 + 2*congress + 2*endDate

def checkForPartySwitch(person):
	if not "icpsr" in person or not person["icpsr"]:
		return -1

	baseIcpsr = str(person["icpsr"]).zfill(6)
	congresses = congressesOfService(person["icpsr"])
	searchBoundaries = [congresses[0][0]-1, congresses[-1][1]+1]

	otherIcpsrs = []
	for congress in searchBoundaries:
		if "bioName" in person:
			lookup = memberLookup({'congress': congress, 'name': person["bioName"]},1)
		elif "fname" in person:
			lookup = memberLookup({'congress': congress, 'name': person["fname"]},1)
		else:
			lookup = memberLookup({'congress': congress, 'name': person["name"]},1)
		if "errormessage" in lookup:
			continue
		else:
			result = lookup["results"][0]
			newIcpsr = str(result["icpsr"]).zfill(6)
			if levenshtein(baseIcpsr, newIcpsr)==1:
				otherIcpsrs.append(newIcpsr)

	if not len(otherIcpsrs):
		return {}
	else:
		return {"results": otherIcpsrs}

# Wikibooks implementation of levenshtein distance using Dynamic Programming
# https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#Python
def levenshtein(s1, s2):
	if len(s1) < len(s2):
		return levenshtein(s2, s1)

	if len(s2) == 0:
		return len(s1)

	previous_row = range(len(s2) + 1)
	for i, c1 in enumerate(s1):
		current_row = [i+1]
		for j, c2 in enumerate(s2):
			insertions = previous_row[j+1] + 1
			deletions = current_row[j] + 1
			substitutions = previous_row[j] + (c1!=c2)
			current_row.append(min(insertions,deletions,substitutions))
		previous_row = current_row
	return previous_row[-1]

	
if __name__=="__main__":
	print yearsOfService(49101)
	#yearsOfService("006071")
	#yearsOfService("049101")
	#yearsOfService(29754)
	#yearsOfService(99369)
	#yearsOfService(14240)

	#print checkForPartySwitch(memberLookup({'icpsr': 9369},1)["results"][0])
