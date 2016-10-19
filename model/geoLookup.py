import json
import requests
import pprint
from pymongo import MongoClient
client = MongoClient()
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
	apiKey = authData["geocodeAPI"]
	result = requests.get("https://maps.googleapis.com/maps/api/geocode/json?address="+addressString+"&key="+apiKey).text
	resJSON = json.loads(result)
	if "results" in resJSON and "geometry" in resJSON["results"][0] and "location" in resJSON["results"][0]["geometry"]:
		return resJSON["results"][0]["geometry"]["location"]

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
	coords = addressToLatLong("405 Hilgard Ave, Los Angeles, CA")
	print coords
	print latLongToDistrictCodes(coords["lat"], coords["lng"])
