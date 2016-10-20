import math
import json
import requests
from pymongo import MongoClient
client = MongoClient()

# Shut up the stupid SSL warning crap
import requests.packages.urllib3
requests.packages.urllib3.disable_warnings()

try:
	dbConf = json.load(open("./model/db.json","r"))
except:
	dbConf = json.load(open("./db.json","r"))
db = client[dbConf["dbname"]]
try:
	authData = json.load(open("auth.json","r"))
except:
	authData = json.load(open("./model/auth.json","r"))

def addressToLatLong(addressString):
	warning = []
	apiKey = authData["geocodeAPI"]
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
					return {"status": 1, "error_message": "The address you entered was from outside United States."}
			if country==0:
				return {"status": 1, "error_message": "Google Maps failed to complete a lookup for the address you entered."}
			if state==0:
				return {"status": 1, "error_message": "Google Maps failed to locate a state matching the address you entered."}

		if city==0 and stateName not in ["Alaska", "Delaware", "Wyoming"]:
			if stateName in ["Alaska", "Delaware", "Montana", "North Dakota", "South Dakota", "Vermont", "Wyoming"]:
				warning.append("Google Maps could not locate your town or city. Some historical results may be based on an approximate location.")
			else:
				warning.append("Google Maps could not locate your town or city. The results below may be based on an approximate location")
		if "location_type" in resJSON["results"][0]["geometry"] and resJSON["results"][0]["geometry"]["location_type"] in ["APPROXIMATE", "GEOMETRIC_CENTER"]:
			warning.append("Address lookup did not return an exact result. The information below may be incorrect. Please adjust the address you entered to improve result quality.")
		if "partial_match" in resJSON["results"][0]:
			warning.append("Some of the address you entered could not be matched by Google Maps. The information below may be incorrect. Please adjust the address you entered to improve results.")
		if "geometry" in resJSON["results"][0] and "bounds" in resJSON["results"][0]["geometry"] and "northeast" in resJSON["results"][0]["geometry"]["bounds"] and "southwest" in resJSON["results"][0]["geometry"]["bounds"]:
			latDiffMiles = abs(resJSON["results"][0]["geometry"]["bounds"]["northeast"]["lat"] - resJSON["results"][0]["geometry"]["bounds"]["southwest"]["lat"]) * 69
			latAvg = (resJSON["results"][0]["geometry"]["bounds"]["northeast"]["lat"] + resJSON["results"][0]["geometry"]["bounds"]["southwest"]["lat"])/2
			longDiff = abs(resJSON["results"][0]["geometry"]["bounds"]["northeast"]["lng"] - resJSON["results"][0]["geometry"]["bounds"]["southwest"]["lng"])
			longDiffMiles = math.cos(math.radians(latAvg)) * 69.172 * longDiff

			if latDiffMiles*longDiffMiles > 100 and stateName not in ["Alaska", "Delaware", "Montana", "North Dakota", "South Dakota", "Vermont", "Wyoming"]:
				warning.append("Google Maps returned an imprecise result for your address. Results may be accurate to your state, but not your exact location. Please adjust the address you entered to improve results.") 

		return {"status": 0, "lat": resJSON["results"][0]["geometry"]["location"]["lat"], "lng": resJSON["results"][0]["geometry"]["location"]["lng"], "formatted_address": resJSON["results"][0]["formatted_address"], "warnings": warning}
	else:
		return {"status": 1, "error_message": "Google Maps failed to complete a lookup for the address you entered."}

def latLongToDistrictCodes(lat, lng):
	geoClient = client["district_geog"]
	gquery = {"geometry":{"$geoIntersects":{"$geometry":{"type":"Point","coordinates":[lng, lat]}}}}
	res = []
	for r in db.districts.find(gquery,{'properties':1}).sort("properties.startcong",1):
		rec = [r['properties'][f] for f in ('statename','district','startcong','endcong')]
		if int(rec[1]):
			for cng in range(rec[2],rec[3]+1):
				res.append( [rec[0],cng,int(rec[1])] )
	return res
	pass

if __name__=="__main__":
	tests = [
			{"Address": "200 Elizabeth Ave, St. John's, NL, Canada", "Expected": 1},
			{"Address": "405 Hilgard Ave, Los Angeles, CA, USA", "Expected": 0},
			{"Address": "405 Hilgard Ave, Los Angeles, CA", "Expected": 0},
			{"Address": "405 Hilgard Ave, Los Angeles", "Expected": 0},
			{"Address": "Cartoonishly Incorrect Address 6q10ihuds, Los Angeles, CA", "Expected": 1},
			{"Address": "90033", "Expected": 0},
			{"Address": "Kansas", "Expected": 0}
		]

	for test in tests:
		print addressToLatLong(test["Address"]), test["Expected"]
