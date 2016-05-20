from searchMembers import memberLookup
import re

def dispatch(search):
	results = {}
	resultRows = []
	wc = len(search.split())
	if wc<=4:
		memSearch = memberLookup({"name": search},4)
		if "results" in memSearch:
			words = search.split()
			for res in memSearch["results"]:
				res["fname"] = res["fname"].lower().title()
				for word in words:
					res["fname"] = re.sub(word,"<strong>"+word.lower()+"</strong>",res["fname"],re.IGNORECASE)
				res["cTerm"] = "Senator" if res["chamber"]=="Senate" else "Representative" if res["chamber"]=="House" else "President"
				print res["cTerm"]+": <a href=\"/person/"+str(res["icpsr"])+"/\">"+res["fname"]+"</a>"

	print "search for ya junk"

if __name__ == "__main__":
	dispatch("Cru")
