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
	""" Return article metadata by slug. """

	r = db.voteview_articles.find_one({"slug": slug, "hidden": {"$ne": 1}}, {"_id": 0})
	return r

def list_articles(tag_category):
	""" List all articles in a given category. """

	sort_clause, sort_dir = ("title", 1) if tag_category in ["data", "help"] else ("date_modified", -1)

	rows = db.voteview_articles.find({"hidden": {"$ne": 1}, "tags": tag_category}).sort(sort_clause, sort_dir)

	store_results = []
	for r in rows:
		store_results.append(r)

	return store_results
