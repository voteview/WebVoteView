""" Functions involved in the display of blog articles. """

import pymongo
from model.config import config

client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]


def get_article_meta(slug):
    """ Return article metadata by slug. """

    result = db.voteview_articles.find_one(
        {"slug": slug, "hidden": {"$ne": 1}}, {"_id": 0})
    return result


def list_articles(tag_cat):
    """ List all articles in a given category. """

    sort_clause = "title" if tag_cat in ["data", "help"] else "date_modified"
    sort_dir = 1 if tag_cat in ["data", "help"] else -1
    list_query = {"hidden": {"$ne": 1}, "tags": tag_cat}
    rows = db.voteview_articles.find(list_query).sort(sort_clause, sort_dir)

    store_results = []
    for row in rows:
        store_results.append(row)

    return store_results
