import os
from searchMembers import memberLookup

def getBioImage(icpsr, default):
	""" Check for file presence of bio image or fall back to default. """

	bio_image = "%s.jpg" % str(icpsr).zfill(6)
	bio_image = bio_image if os.path.isfile("static/img/bios/%s" % bio_image) else default

	return bio_image, int(bio_image != default)

def getYearsOfService(person, chamber=""):
	""" Takes a person and returns year ranges of service, overall or in a chamber. """
	congresses = []

	if chamber and chamber not in ["House", "Senate"]:
		return []

	if chamber:
		if "congresses_" + chamber.lower() in person:
			congresses = person["congresses_" + chamber.lower()]
	else:
		if "congresses" in person:
			congresses = person["congresses"]

	if not congresses:
		return []

	yearSet = [[congressToYear(congress[0], 0), congressToYear(congress[1], 1)] for congress in congresses]

	if chamber and len(yearSet) and "voting_dates" in person and chamber in person["voting_dates"] and int(person["voting_dates"][chamber][1].split("-")[0]):
		if yearSet[-1][1] > int(person["voting_dates"][chamber][1].split("-")[0]):
			yearSet[-1][1] = int(person["voting_dates"][chamber][1].split("-")[0])

	return yearSet

def congressesOfService(icpsr, chamber=""):
	if not isinstance(icpsr, str) or len(icpsr) < 6:
		icpsr = str(int(icpsr)).zfill(6)

	terms = memberLookup({"icpsr": icpsr}, 30)

	# No match for user
	if not "results" in terms:
		return []

	# No chamber information
	if not chamber or not len(chamber):
		if "congresses" in terms["results"][0]:
			return terms["results"][0]["congresses"]
	# House
	elif chamber=="House":
		if "congresses_house" in terms["results"][0]:
			return terms["results"][0]["congresses_house"]
	# Senate
	elif chamber=="Senate":
		if "congresses_senate" in terms["results"][0]:
			return terms["results"][0]["congresses_senate"]

	# Default case.
	return []

def yearsOfService(icpsr, chamber=""):
	congressesSet = congressesOfService(icpsr, chamber)
	yearChunks = []
	for s in congressesSet:
		yearChunks.append([congressToYear(s[0], 0), congressToYear(s[1], 1)])

	return yearChunks

def congressToYear(congress, endDate):
	return 1787 + (2 * congress) + (2 * endDate)

def checkForPartySwitch(person):
	if not "icpsr" in person or not person["icpsr"]:
		return {}

	if "bioguide_id" in person:
		q = {"bioguide_id": person["bioguide_id"]}

		lookup = memberLookup(q, 10, 1, "Check_Party_Switch")

		if "errormessage" in lookup:
			return {}

		other_icpsrs = [str(x["icpsr"]).zfill(6) for x in lookup["results"] if x["icpsr"] != person["icpsr"]]
		return {"results": other_icpsrs}

def checkForOccupancy(person):
	if "occupancy" not in person or int(person["occupancy"]) == 0:
		return []

	return []

	if int(person["occupancy"]) > 1:
		prevICPSR = memberLookup({'congress': person["congress"], 'stateName': person["stateName"], 'district': person["district"], 'occupancy': person["occupancy"] - 1}, 1)
	else:
		prevICPSR = 0

	return []

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
	print checkForPartySwitch(memberLookup({'icpsr': 14910},1)["results"][0])
