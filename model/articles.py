import pymongo
import json
client = pymongo.MongoClient()

try:
	dbConf = json.load(open("./model/db.json","r"))
	nicknames = json.load(open("./model/nicknames.json","r"))
	authFile = json.load(open("./model/auth.json","r"))
except:
	try:
		dbConf = json.load(open("./db.json","r"))
		authFile = json.load(open("./auth.json","r"))
	except:
		dbConf = {'dbname':'voteview'}
		nicknames = []

db = client[dbConf["dbname"]]

def get_article_meta(slug):
	r = db.voteview_articles.find_one({"slug": slug, "hidden": {"$ne": 1}}, {"_id": 0})
	return r

def list_articles(tag_category):
	if tag_category in ["data", "help"]:
		sort_clause = "title"
		sort_dir = 1
	else:
		sort_clause = "date_modified"
		sort_dir = -1

	rows = db.voteview_articles.find({"hidden": {"$ne": 1}, "tags": tag_category}).sort(sort_clause, sort_dir)

	store_results = []
	for r in rows:
		store_results.append(r)

	return store_results
