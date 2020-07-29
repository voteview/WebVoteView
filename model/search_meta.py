""" Helpers to pull metadata from metadata database. """

import pymongo
from model.config import config

client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]


def meta_lookup(api=""):
    """ Pull metadata from database. """
    if not api:
        return_dict = {"loyalty_counts": 0}
    elif api == "Web_Members":
        return_dict = {"nominate": 0}

    for meta_attribute in db.voteview_metadata.find(
            {},
            return_dict).sort('time', -1).limit(1):
        meta = meta_attribute

    return meta
