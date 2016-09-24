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

if __name__=="__main__":
	print addressToLatLong("405 Hilgard Ave, Los Angeles, CA")
