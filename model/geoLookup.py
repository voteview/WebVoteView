import time
import math
import json
import requests
import logQuota
from pymongo import MongoClient
from stateHelper import stateNameToAbbrev
client = MongoClient()

# Shut up the stupid SSL warning crap
import requests.packages.urllib3
requests.packages.urllib3.disable_warnings()

db = client["district_geog"]
try:
        authData = json.load(open("auth.json","r"))
except:
        authData = json.load(open("./model/auth.json","r"))

def addressToLatLong(request, addressString):
	quotaCheck = logQuota.checkQuota(request) # Are we over quota?
	if quotaCheck["status"]: # Yes, so error out
		return {"status": 1, "error_message": quotaCheck["errormessage"]}

	warning = []
	apiKey = authData["geocodeAPI"]
	if not addressString:
		return {"status": 1, "error_message": "You must enter an address to continue."}

	print "https://maps.googleapis.com/maps/api/geocode/json?address=" + addressString + "&key=" + apiKey
	result = requests.get("https://maps.googleapis.com/maps/api/geocode/json?address="+addressString+"&key="+apiKey).text
	resJSON = json.loads(result)
	if "status" in resJSON and resJSON["status"]!="OK":
		return {"status": 1, "error_message": "Google Maps failed to complete a lookup for the address you entered."}
	elif "results" in resJSON and len(resJSON["results"]) and "geometry" in resJSON["results"][0] and "location" in resJSON["results"][0]["geometry"]:
		if "address_components" in resJSON["results"][0]:
			country=0
			countryName = ""
			state=0
			stateName = ""
			city=0
			for a in resJSON["results"][0]["address_components"]:
				for t in a["types"]:
					if t=="country":
						country=1
						countryName = a["long_name"]
					elif t=="locality":
						city=1
					elif t=="administrative_area_level_1":
						state=1
						stateName = a["long_name"]

			if country==1:
				if countryName!="United States":
					if countryName=="Puerto Rico" or countryName=="Guam" or countryName=="U.S. Virgin Islands" or countryName=="Northern Mariana Islands" or countryName=="American Samoa":
						link = ""
						if countryName=="Puerto Rico":
							link = "https://en.wikipedia.org/wiki/Resident_Commissioner_of_Puerto_Rico"
						elif countryName=="Guam":
							link = "https://en.wikipedia.org/wiki/Guam%27s_at-large_congressional_district"
						elif countryName=="U.S. Virgin Islands":
							link = "https://en.wikipedia.org/wiki/List_of_Delegates_to_the_United_States_House_of_Representatives_from_the_United_States_Virgin_Islands"
						elif countryName=="Northern Mariana Islands":
							link = "https://en.wikipedia.org/wiki/United_States_congressional_delegations_from_the_Northern_Mariana_Islands"
						elif countryName=="American Samoa":
							link = "https://en.wikipedia.org/wiki/List_of_Delegates_to_the_United_States_House_of_Representatives_from_American_Samoa"
						return {"status": 1, "error_message": "Voteview.com does not track non-voting delegates sent by unincorporated territories of the United States.<br/><br/>For more information about historical delegates from "+countryName+", check Wikipedia:<br/><a href=\""+link+"\">"+link+"</a><br/><br/>"}
					else:
						return {"status": 1, "error_message": "The address you entered was from outside United States. ("+countryName+")"}
			if country==0:
				return {"status": 1, "error_message": "Google Maps failed to complete a lookup for the address you entered."}
			if state==0:
				return {"status": 1, "error_message": "Google Maps failed to locate a state matching the address you entered."}

		if stateName=="District of Columbia":
			warning.append("The address you entered is located in or around D.C. Voteview.com does not track non-voting delegates sent by D.C. to the House of Representatives. The Representatives listed below served when the location you entered was located in Maryland. For more information, see Wikipedia:<br/><a href=\"https://en.wikipedia.org/wiki/Maryland%27s_3rd_congressional_district\">https://en.wikipedia.org/wiki/Maryland%27s_3rd_congressional_district</a>.<br/><br/>For more information about voting rights in D.C., see Wikipedia:<br/><a href=\"https://en.wikipedia.org/wiki/District_of_Columbia_voting_rights\">https://en.wikipedia.org/wiki/District_of_Columbia_voting_rights</a>")

		if city==0 and stateName not in ["Alaska", "Delaware", "Wyoming"]:
			if stateName in ["Alaska", "Delaware", "Montana", "North Dakota", "South Dakota", "Vermont", "Wyoming"]:
				warning.append("Google Maps could not locate your town or city. Some historical results may be based on an approximate location.")
			else:
				warning.append("Google Maps could not locate your town or city. The results below may be based on an approximate location")

		isZip=0
		if len(addressString)==10:
			try:
				zipBase = int(addressString[0:5])
				zipExtend = int(addressString[6:])
				isZip=1
				warning.append("The information below is accurate to the ZIP Code level. To be certain you have the right results, enter more address detail.")
			except:
				pass
		elif len(addressString)==5:
			try:
				zip = int(addressString)
				isZip=1
				warning.append("The information below is accurate to the ZIP Code level. To be certain you have the right results, enter more address detail.")
			except:
				pass

		if resJSON["results"][0]["geometry"]["location"]["lat"]>39.8333 and resJSON["results"][0]["geometry"]["location"]["lat"]<39.83334 and resJSON["results"][0]["geometry"]["location"]["long"]>-98.5856 and resJSON["results"][0]["geometry"]["location"]["long"]<-98.5855:
			warning.append("Google Maps did not correctly resolve your address. To be certain you have the right results, enter more address detail.")

		if not isZip and "location_type" in resJSON["results"][0]["geometry"] and resJSON["results"][0]["geometry"]["location_type"] in ["APPROXIMATE", "GEOMETRIC_CENTER"]:
			warning.append("Address lookup did not return an exact result. The information below may be incorrect. Please adjust the address you entered to improve result quality.")

		if not isZip and "partial_match" in resJSON["results"][0]:
			warning.append("The address you entered could not be matched exactly by Google Maps. The information below may be incorrect. Please adjust the address you entered to improve results. "+stateName)

		if "geometry" in resJSON["results"][0] and "bounds" in resJSON["results"][0]["geometry"] and "northeast" in resJSON["results"][0]["geometry"]["bounds"] and "southwest" in resJSON["results"][0]["geometry"]["bounds"]:
			latDiffMiles = abs(resJSON["results"][0]["geometry"]["bounds"]["northeast"]["lat"] - resJSON["results"][0]["geometry"]["bounds"]["southwest"]["lat"]) * 69
			latAvg = (resJSON["results"][0]["geometry"]["bounds"]["northeast"]["lat"] + resJSON["results"][0]["geometry"]["bounds"]["southwest"]["lat"])/2
			longDiff = abs(resJSON["results"][0]["geometry"]["bounds"]["northeast"]["lng"] - resJSON["results"][0]["geometry"]["bounds"]["southwest"]["lng"])
			longDiffMiles = math.cos(math.radians(latAvg)) * 69.172 * longDiff

			if latDiffMiles*longDiffMiles > 100 and stateName not in ["Alaska", "Delaware", "Montana", "North Dakota", "South Dakota", "Vermont", "Wyoming"]:
				warning.append("Google Maps returned an imprecise result for your address. Results may be accurate to your state, but not your exact location. Please adjust the address you entered to improve results.") 

		logQuota.addQuota(request, 1) # Add to quota.
		logQuota.logSearch(request, {"query": "Address Lookup: "+addressString, "resultNum": 1}) # Log the address lookup

		return {"status": 0, "lat": resJSON["results"][0]["geometry"]["location"]["lat"], "lng": resJSON["results"][0]["geometry"]["location"]["lng"], "formatted_address": resJSON["results"][0]["formatted_address"], "warnings": warning}
	else:
		logQuota.addQuota(request, 1) # Add to quota.
		logQuota.logSearch(request, {"query": "Address Lookup: "+addressString, "resultNum": -1}) # Log the failed address lookup
		return {"status": 1, "error_message": "Google Maps failed to complete a lookup for the address you entered."}

def lat_long_to_polygon(request, lat, lng):
	quotaCheck = logQuota.checkQuota(request) # Are we over quota?
	if quotaCheck["status"]: # Yes, so error out
		return {"status": 1, "error_message": quotaCheck["errormessage"]}

	geoClient = client["district_geog"]
	gquery = {"geometry":{"$geoIntersects":{"$geometry":{"type":"Point","coordinates":[lng, lat]}}}}
	for result in db.districts.find(gquery, {"geometry.coordinates": 1}).sort([("properties.endcong", -1)]).limit(1):
		return result["geometry"]["coordinates"]

	return []

def latLongToDistrictCodes(request, lat, lng):
	quotaCheck = logQuota.checkQuota(request) # Are we over quota?
	if quotaCheck["status"]: # Yes, so error out
		return {"status": 1, "error_message": quotaCheck["errormessage"]}

	geoClient = client["district_geog"]
	res = []
	isDC = 0
	gquery = {"geometry":{"$geoIntersects":{"$geometry":{"type":"Point","coordinates":[lng, lat]}}}}

	for r in db.districts.find(gquery,{'properties':1}):
		rec = [r['properties'][f] for f in ('statename','district','startcong','endcong')]
		if stateNameToAbbrev(rec[0])["state_abbrev"]=="DC":
			isDC = 1
			continue
		for cng in range(int(rec[2]),int(rec[3])+1):
			res.append( [stateNameToAbbrev(rec[0])["state_abbrev"],cng,int(rec[1])] )

	logQuota.addQuota(request, 2) # Costlier because it's more intense on our side.
	return {"isDC": isDC, "results": res}
	pass

if __name__=="__main__":
	start = time.time()
	addStr = "233 S Wacker Dr, Chicago, IL 60606"
	res = addressToLatLong(None, addStr)
	print res
	# res = {"lat": 38.9004367, "lng": -77.011207}
	#resMem = latLongToDistrictCodes(None, res["lat"], res["lng"])
	#print resMem
	#orSet = []
	#atLargeSet = []
	#for r in resMem["results"]:
	#	state_abbrev = r[0]
	#	if r[2]!=0:
	#		orSet.append({"state_abbrev": r[0], "district_code": r[2], "congress": r[1]})
	#	else:
	#		atLargeSet.append(r[1])
	#if len(atLargeSet):
	#	print "At-large congresses"
	#	for l in atLargeSet:
	#		sameCongDistrict = len([x for x in orSet if x["congress"]==l])
	#		if sameCongDistrict: # Have a district, just need the at large.
	#			pass
	#		else: # No same district
	#			for dc in [1,99,98]:
	#				orSet.append({"state_abbrev": state_abbrev, "district_code": dc, "congress": l})
	#
	#print "Duration of lookup:", (time.time()-start)
	#print orSet


	result_new = lat_long_to_polygon(None, res["lat"], res["lng"])
	print result_new

