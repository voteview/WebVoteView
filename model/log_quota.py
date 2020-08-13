""" Implementing the anti-abuse quota. """

import datetime
import hashlib
import json
import time
import pymongo
from model.config import config

client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]


def get_ip(request):
    """ Wrapper for getting user IP """
    if request is None:
        return "127.0.0.1"
    return (request.environ.get('HTTP_X_FORWARDED_FOR') or
            request.environ.get('REMOTE_ADDR'))


def get_user_agent(request):
    """ Wrapper for getting user agent """
    if request is None:
        return "Local Python"
    return request.get_header("User-Agent")


def generate_session_id(request):
    """ Wrapper to load the salt and generate the user session ID """
    ip_address = get_ip(request)
    user_agent = get_user_agent(request)
    static_salt = config["auth"]["quotaLogSalt"]
    dynamic_salt = str(datetime.datetime.now().timetuple().tm_yday)
    hash_builder = hashlib.sha256()
    hash_builder.update("%s/%s/%s/%s" % (ip_address, user_agent,
                                         static_salt,
                                         dynamic_salt)).encode("utf-8")
    final_hash = hash_builder.hexdigest()[0:16]
    return final_hash


def log_search(request, search):
    """ Given a search query and number of results, log the search """
    doc = {"session": generate_session_id(request),
           "time": int(time.time())}
    doc.update(search)
    if "query" in doc and isinstance(doc["query"], dict):
        doc["query"] = json.dumps(doc["query"])
    if "query_extra" in doc and isinstance(doc["query_extra"], dict):
        doc["query_extra"] = json.dumps(doc["query_extra"])
    db.search_log.insert_one(doc)


def get_credits(request):
    """ Return remaining credits """
    if request is None:
        return 0

    session = generate_session_id(request)

    result = db.api_quota.find_one({"session": session},
                                   {"score": 1, "_id": 0})
    if not result:
        return config["auth"]["quotaLimit"]

    return config["auth"]["quotaLimit"] - result["score"]


def check_quota(request):
    """ Check user's quota status """
    # Local execution.
    if request is None:
        return {"status": 0}

    session = generate_session_id(request)
    result = db.api_quota.find_one({"session": session},
                                   {"score": 1, "_id": 0})
    if not result or result["score"] <= config["auth"]["quotaLimit"]:
        return {"status": 0}
    else:
        whitelisted = 0
        blacklisted = 0
        ip_address = get_ip(request)
        for ip_blocked in config["auth"]["blacklistIPs"]:
            if ip_address.startswith(ip_blocked):
                blacklisted = 1
                break

        if blacklisted:
            return {"status": 1,
                    "error_message": (
                        "You have been blocked from completing this request "
                        "due to abuse. For more information, go to "
                        "https://voteview.com/quota")}

        for ip_allowed in config["auth"]["whitelistIPs"]:
            if ip_address.startswith(ip_allowed):
                whitelisted = 1
                break
        if whitelisted:
            return {"status": 0}

        return {"status": 1,
                "error_message": (
                    "You have been blocked from completing this request "
                    "because you are over quota. To prevent abuse of our "
                    "systems, users are limited from excessive numbers of "
                    "search queries. For more information, go to "
                    "https://voteview.com/quota")}


def add_quota(request, score):
    """ Add a cost to user's quota """
    session = generate_session_id(request)
    result = db.api_quota.find_one({"session": session},
                                   {"score": 1, "_id": 0})
    if result:
        db.api_quota.update_one({"session": session},
                                {"$set": {"score": result["score"] + score}})
    else:
        db.api_quota.insert_one({"session": session, "score": score})
